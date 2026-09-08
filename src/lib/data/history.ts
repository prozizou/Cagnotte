import {
  addDoc,
  collection,
  limit,
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

export function subscribeHistoryForOwner(
  ownerId: string,
  cb: (entries: HistoryEntry[]) => void,
  max = 50
) {
  const q = query(
    collection(db, "history"),
    where("ownerId", "==", ownerId),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HistoryEntry)));
  });
}

export function subscribeHistoryForCagnotte(
  cagnotteId: string,
  cb: (entries: HistoryEntry[]) => void,
  max = 50
) {
  const q = query(
    collection(db, "history"),
    where("cagnotteId", "==", cagnotteId),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HistoryEntry)));
  });
}

export function subscribeAllHistory(cb: (entries: HistoryEntry[]) => void, max = 100) {
  const q = query(collection(db, "history"), orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HistoryEntry)));
  });
}
