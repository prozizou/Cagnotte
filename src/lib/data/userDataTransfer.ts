import { Cagnotte, CagnotteStatus, Cotisation, UserProfile } from "@/lib/types";
import { createCagnotteForImport, importEntriesToCagnotte, ParsedImportEntry } from "./jsonImport";
import { todayISO } from "@/lib/format";

/**
 * Export / import des données d'un utilisateur précis, depuis sa fiche
 * (/utilisateurs/[uid]) : sert à la fois de sauvegarde et de transfert de
 * données pour ce compte, sans jamais mélanger les données de deux
 * personnes — le fichier porte l'identité du propriétaire (uid, email,
 * nom), et l'import se fait toujours sur le compte actuellement ouvert,
 * jamais sur celui indiqué dans le fichier (un écart entre les deux
 * déclenche un avertissement explicite avant import).
 */

const EXPORT_FORMAT = "cotiz-user-export";
const EXPORT_VERSION = 1;

export interface UserExportCotisation {
  name: string;
  amount: number;
  date: string;
  comment: string;
}

export interface UserExportCagnotte {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  goalAmount: number;
  status: CagnotteStatus;
  cotisations: UserExportCotisation[];
}

export interface UserExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  owner: { uid: string; email: string; displayName: string };
  exportedAt: string;
  cagnottes: UserExportCagnotte[];
}

export function buildUserExport(target: UserProfile, cagnottes: Cagnotte[], cotisations: Cotisation[]): UserExportFile {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    owner: { uid: target.uid, email: target.email, displayName: target.displayName },
    exportedAt: new Date().toISOString(),
    cagnottes: cagnottes.map((c) => ({
      title: c.title,
      description: c.description,
      startDate: c.startDate,
      endDate: c.endDate,
      goalAmount: c.goalAmount,
      status: c.status,
      cotisations: cotisations
        .filter((x) => x.cagnotteId === c.id)
        .map((x) => ({ name: x.name, amount: x.amount, date: x.date, comment: x.comment })),
    })),
  };
}

/** Déclenche le téléchargement d'un fichier JSON depuis le navigateur. */
export function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface ParsedUserImport {
  cagnottes: UserExportCagnotte[];
  fileOwner: { uid?: string; email?: string } | null;
  entriesSkipped: number;
}

const CAGNOTTE_STATUSES: CagnotteStatus[] = ["draft", "active", "completed", "archived"];

/**
 * Accepte le format d'export ci-dessus (plusieurs cagnottes, chacune avec
 * ses cotisations imbriquées). Contrairement à parseImportJSON() (format
 * plat, une seule cagnotte cible), ce format restitue toute la structure
 * d'un compte en un import.
 */
export function parseUserExportJSON(raw: string): { result: ParsedUserImport | null; error: string | null } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return { result: null, error: "JSON invalide : " + (err instanceof Error ? err.message : "erreur de syntaxe") };
  }
  if (!data || typeof data !== "object" || !Array.isArray((data as Record<string, unknown>).cagnottes)) {
    return { result: null, error: 'Format non reconnu : ce fichier ne contient pas de tableau "cagnottes".' };
  }

  const obj = data as Record<string, unknown>;
  const owner = obj.owner as { uid?: unknown; email?: unknown } | undefined;
  const fileOwner = owner
    ? { uid: typeof owner.uid === "string" ? owner.uid : undefined, email: typeof owner.email === "string" ? owner.email : undefined }
    : null;

  let entriesSkipped = 0;
  const cagnottes: UserExportCagnotte[] = (obj.cagnottes as unknown[]).map((raw) => {
    const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const status = typeof c.status === "string" && CAGNOTTE_STATUSES.includes(c.status as CagnotteStatus) ? (c.status as CagnotteStatus) : "active";
    const rawCotisations = Array.isArray(c.cotisations) ? (c.cotisations as unknown[]) : [];
    const cotisations: UserExportCotisation[] = [];
    for (const entry of rawCotisations) {
      const e = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
      const name = typeof e.name === "string" ? e.name.trim() : "";
      const amount = typeof e.amount === "number" ? e.amount : Number(e.amount);
      if (!name || !Number.isFinite(amount) || amount <= 0) {
        entriesSkipped++;
        continue;
      }
      const date = typeof e.date === "string" && /^\d{4}-\d{2}-\d{2}/.test(e.date) ? e.date.slice(0, 10) : todayISO();
      cotisations.push({ name, amount, date, comment: typeof e.comment === "string" ? e.comment : "" });
    }
    return {
      title: typeof c.title === "string" && c.title.trim() ? c.title.trim() : "Cagnotte importée",
      description: typeof c.description === "string" ? c.description : "",
      startDate: typeof c.startDate === "string" && c.startDate ? c.startDate : todayISO(),
      endDate: typeof c.endDate === "string" ? c.endDate : "",
      goalAmount: typeof c.goalAmount === "number" ? c.goalAmount : Number(c.goalAmount) || 0,
      status,
      cotisations,
    };
  });

  return { result: { cagnottes, fileOwner, entriesSkipped }, error: null };
}

/**
 * Recrée, pour le compte "target" (et lui seul — ownerId est toujours
 * celui de target, jamais celui éventuellement indiqué dans le fichier),
 * chaque cagnotte du fichier avec ses cotisations. Réutilise
 * createCagnotteForImport()/importEntriesToCagnotte() (déjà validées pour
 * la page /import), en deux écritures successives par cagnotte : les
 * règles Realtime Database valident chaque écriture par rapport à l'état
 * déjà présent en base, une cagnotte doit donc exister avant que ses
 * cotisations ne soient écrites.
 */
export async function importUserExport(
  parsed: ParsedUserImport,
  target: UserProfile,
  actor: { uid: string; name: string }
): Promise<{ cagnottes: number; cotisations: number; total: number }> {
  let cotisationsCount = 0;
  let total = 0;

  for (const c of parsed.cagnottes) {
    const created = await createCagnotteForImport(
      {
        ownerId: target.uid,
        ownerName: target.displayName,
        title: c.title,
        description: c.description,
        startDate: c.startDate,
        endDate: c.endDate,
        goalAmount: c.goalAmount,
        status: c.status,
      },
      actor
    );
    if (c.cotisations.length > 0) {
      const entries: ParsedImportEntry[] = c.cotisations.map((e) => ({ name: e.name, amount: e.amount, date: e.date, comment: e.comment }));
      const result = await importEntriesToCagnotte(created.id, entries, actor);
      cotisationsCount += result.count;
      total += result.total;
    }
  }

  return { cagnottes: parsed.cagnottes.length, cotisations: cotisationsCount, total };
}
