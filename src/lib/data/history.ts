import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { HistoryEntry, HistoryEventType } from "@/lib/types";

interface LogHistoryParams {
  type: HistoryEventType;
  description: string;
  ownerId: string;
  cagnotteId?: string | null;
  cagnotteTitle?: string | null;
  actorId: string;
  actorName: string;
  metadata?: Record<string, string | number | null>;
}

/**
 * Journal d'audit en écriture seule (append-only) : aucune fonction de
 * modification ou de suppression n'existe pour cette collection, et les
 * règles Firestore interdisent update/delete sur "history".
 */
export async function logHistory(params: LogHistoryParams): Promise<void> {
  await addDoc(collection(db, "history"), {
    ...params,
    cagnotteId: params.cagnotteId ?? null,
    cagnotteTitle: params.cagnotteTitle ?? null,
    metadata: params.metadata ?? {},
    createdAt: serverTimestamp(),
  });
}

// Tri (et limite) effectués côté client, et non via orderBy()/limit() dans
// la requête : combiner where(...) et orderBy(createdAt) exige un index
// composite à créer manuellement dans la console Firebase, ce qui n'est
// pas toujours fait. Une simple égalité est indexée automatiquement par
// Firestore. Le volume du journal reste modeste pour ce type d'app.
function sortByCreatedAtDesc(list: HistoryEntry[]): HistoryEntry[] {
  return [...list].sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

export function subscribeHistoryForOwner(
  ownerId: string,
  cb: (entries: HistoryEntry[]) => void,
  max = 50,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, "history"), where("ownerId", "==", ownerId));
  return onSnapshot(
    q,
    (snap) => {
      cb(sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HistoryEntry))).slice(0, max));
    },
    (err) => onError?.(err)
  );
}

export function subscribeHistoryForCagnotte(
  cagnotteId: string,
  cb: (entries: HistoryEntry[]) => void,
  max = 50,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, "history"), where("cagnotteId", "==", cagnotteId));
  return onSnapshot(
    q,
    (snap) => {
      cb(sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HistoryEntry))).slice(0, max));
    },
    (err) => onError?.(err)
  );
}

export function subscribeAllHistory(cb: (entries: HistoryEntry[]) => void, max = 100, onError?: (err: Error) => void) {
  // Sans clause where(), orderBy(createdAt) seul n'exige aucun index
  // composite (indexation automatique par champ) : ordre géré côté
  // serveur ici, sans risque.
  const q = query(collection(db, "history"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.slice(0, max).map((d) => ({ id: d.id, ...d.data() } as HistoryEntry)));
    },
    (err) => onError?.(err)
  );
}
