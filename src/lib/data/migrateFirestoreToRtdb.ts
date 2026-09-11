import { collection, getDocs, Timestamp } from "firebase/firestore";
import { ref, update } from "firebase/database";
import { db, firestoreDb } from "@/lib/firebase";

/**
 * Migration ponctuelle des données de l'ancienne architecture Firestore
 * vers Realtime Database. À exécuter une seule fois (par le Super Admin,
 * depuis /migration-rtdb), après avoir déployé `database.rules.json` sur
 * le projet Firebase. Les identifiants de documents Firestore (compatibles
 * avec les clés Realtime Database) sont conservés tels quels : toutes les
 * références croisées (cagnotteId, ownerId…) restent valides après
 * migration, et relancer la migration plusieurs fois est sans risque
 * (chaque document est simplement réécrit à l'identique).
 *
 * Ce module — comme la page qui l'utilise et l'export temporaire
 * `firestoreDb` dans lib/firebase.ts — est destiné à être supprimé une
 * fois la migration effectuée.
 */

function tsToMillis(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  return null;
}

/** Convertit récursivement (surface uniquement) les champs Timestamp connus d'un document en millisecondes. */
function convertDoc(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  for (const field of ["createdAt", "updatedAt", "approvedAt"]) {
    if (field in out) out[field] = tsToMillis(out[field]);
  }
  return out;
}

export interface MigrationSummary {
  users: number;
  cagnottes: number;
  cotisations: number;
  history: number;
}

async function migrateCollection(name: string, onLog: (msg: string) => void): Promise<number> {
  const snap = await getDocs(collection(firestoreDb, name));
  if (snap.empty) {
    onLog(`${name} : aucun document trouvé dans Firestore.`);
    return 0;
  }

  const updates: Record<string, unknown> = {};
  snap.forEach((d) => {
    updates[`${name}/${d.id}`] = convertDoc(d.data());
  });

  await update(ref(db), updates);
  onLog(`${name} : ${snap.size} document(s) migré(s) ✔`);
  return snap.size;
}

export async function migrateFirestoreToRtdb(onLog: (msg: string) => void = () => {}): Promise<MigrationSummary> {
  // Ordre important : "cagnottes" avant "cotisations" et "history", pour
  // que les vérifications de cohérence des règles Realtime Database
  // (parentCagnotte) trouvent déjà la cagnotte parente si l'app est
  // utilisée pendant la migration (cas normalement évité en pratique).
  const users = await migrateCollection("users", onLog);
  const cagnottes = await migrateCollection("cagnottes", onLog);
  const cotisations = await migrateCollection("cotisations", onLog);
  const history = await migrateCollection("history", onLog);
  return { users, cagnottes, cotisations, history };
}
