import { get, push, ref, serverTimestamp, set, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { logHistory } from "@/lib/data/history";
import { formatFCFA, todayISO } from "@/lib/format";
import { Cagnotte } from "@/lib/types";

/**
 * Import de cotisations en masse depuis du JSON, déclenché par le Super
 * Admin (ex. reprise d'un ancien export Firebase Realtime Database).
 * Généralise le script ponctuel `legacyImport.ts` en un outil réutilisable
 * exposé sur une page dédiée, plutôt qu'un script à usage unique.
 */

export interface ParsedImportEntry {
  name: string;
  amount: number;
  date: string; // ISO yyyy-MM-dd
}

export interface ParseImportResult {
  entries: ParsedImportEntry[];
  errors: string[];
  warnings: string[];
}

/**
 * Accepte deux formats :
 *  - un tableau d'entrées : [{ name, amount, date? | ts? }, ...]
 *  - un objet-map façon export Realtime Database : { "clé": { name, amount, ts } }
 * Les entrées invalides (nom ou montant manquant) sont ignorées et
 * reportées dans `errors` ; une date manquante ou illisible n'empêche pas
 * l'import (date du jour appliquée), et déclenche un avertissement.
 */
export function parseImportJSON(raw: string): ParseImportResult {
  const entries: ParsedImportEntry[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return { entries, errors: ["JSON invalide : " + (err instanceof Error ? err.message : "erreur de syntaxe")], warnings };
  }

  let pairs: [string, unknown][];
  if (Array.isArray(data)) {
    pairs = data.map((v, i) => [String(i + 1), v]);
  } else if (data && typeof data === "object") {
    pairs = Object.entries(data as Record<string, unknown>);
  } else {
    return { entries, errors: ["Le JSON doit être un objet ou un tableau d'entrées."], warnings };
  }

  for (const [key, value] of pairs) {
    if (!value || typeof value !== "object") {
      errors.push(`${key} : entrée invalide`);
      continue;
    }
    const raw = value as Record<string, unknown>;
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) {
      errors.push(`${key} : nom manquant`);
      continue;
    }
    const amount = typeof raw.amount === "number" ? raw.amount : Number(raw.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`${key} (${name}) : montant invalide`);
      continue;
    }

    let date: string;
    if (typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw.date)) {
      date = raw.date.slice(0, 10);
    } else if (typeof raw.ts === "number" && Number.isFinite(raw.ts)) {
      const d = new Date(raw.ts);
      if (Number.isNaN(d.getTime())) {
        date = todayISO();
        warnings.push(`${key} (${name}) : horodatage illisible, date du jour utilisée`);
      } else {
        date = d.toISOString().slice(0, 10);
      }
    } else {
      date = todayISO();
      warnings.push(`${key} (${name}) : aucune date trouvée, date du jour utilisée`);
    }

    entries.push({ name, amount, date });
  }

  return { entries, errors, warnings };
}

export async function importEntriesToCagnotte(
  cagnotteId: string,
  entries: ParsedImportEntry[],
  actor: { uid: string; name: string }
): Promise<{ count: number; total: number }> {
  const cagnotteSnap = await get(ref(db, `cagnottes/${cagnotteId}`));
  if (!cagnotteSnap.exists()) throw new Error("Cette cagnotte n'existe plus.");
  const cagnotte = cagnotteSnap.val() as Cagnotte;

  // Une seule écriture multi-chemins atomique (Realtime Database n'impose
  // pas la limite de 500 opérations/batch de Firestore) : pas besoin de
  // découper en lots, même pour plusieurs centaines d'entrées.
  let total = 0;
  const updates: Record<string, unknown> = {};
  for (const entry of entries) {
    total += entry.amount;
    const entryRef = push(ref(db, "cotisations"));
    updates[`cotisations/${entryRef.key}`] = {
      cagnotteId,
      ownerId: cagnotte.ownerId,
      name: entry.name,
      amount: entry.amount,
      date: entry.date,
      comment: "",
      createdBy: actor.uid,
      createdByName: actor.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }
  await update(ref(db), updates);

  await logHistory({
    type: "cotisation_added",
    description: `Import JSON : ${entries.length} cotisation(s) importée(s) (${formatFCFA(total)})`,
    ownerId: cagnotte.ownerId,
    cagnotteId,
    cagnotteTitle: cagnotte.title,
    actorId: actor.uid,
    actorName: actor.name,
    metadata: { count: entries.length, total, source: "json_import" },
  });

  return { count: entries.length, total };
}

export interface NewCagnotteForImport {
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  goalAmount: number;
}

export async function createCagnotteForImport(
  input: NewCagnotteForImport,
  actor: { uid: string; name: string }
): Promise<{ id: string; title: string }> {
  const newRef = push(ref(db, "cagnottes"));
  await set(newRef, {
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    title: input.title,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    goalAmount: input.goalAmount,
    status: "active",
    contacts: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const cagnotteId = newRef.key as string;

  await logHistory({
    type: "cagnotte_created",
    description: `Cagnotte « ${input.title} » créée (import JSON)`,
    ownerId: input.ownerId,
    cagnotteId,
    cagnotteTitle: input.title,
    actorId: actor.uid,
    actorName: actor.name,
  });

  return { id: cagnotteId, title: input.title };
}
