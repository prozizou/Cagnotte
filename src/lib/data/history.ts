import { equalTo, onValue, orderByChild, push, query, ref, serverTimestamp, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { HistoryEntry, HistoryEventType } from "@/lib/types";
import { snapshotToList } from "./rtdbUtils";

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
 * Journal d'audit en écriture seule (append-only) : les règles Realtime
 * Database interdisent toute écriture sur un nœud "history" déjà existant
 * (ni mise à jour, ni suppression, pour personne).
 */
export async function logHistory(params: LogHistoryParams): Promise<void> {
  const entryRef = push(ref(db, "history"));
  await set(entryRef, {
    ...params,
    cagnotteId: params.cagnotteId ?? null,
    cagnotteTitle: params.cagnotteTitle ?? null,
    metadata: params.metadata ?? {},
    createdAt: serverTimestamp(),
  });
}

// Tri (et limite) effectués côté client, et non via une requête combinant
// orderByChild(ownerId) et un tri par date : Realtime Database ne permet
// qu'un seul orderByChild par requête. Le volume du journal reste modeste
// pour ce type d'app.
function sortByCreatedAtDesc(list: HistoryEntry[]): HistoryEntry[] {
  return [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export function subscribeHistoryForOwner(
  ownerId: string,
  cb: (entries: HistoryEntry[]) => void,
  max = 50,
  onError?: (err: Error) => void
) {
  const q = query(ref(db, "history"), orderByChild("ownerId"), equalTo(ownerId));
  return onValue(
    q,
    (snap) => {
      cb(sortByCreatedAtDesc(snapshotToList<HistoryEntry>(snap)).slice(0, max));
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
  const q = query(ref(db, "history"), orderByChild("cagnotteId"), equalTo(cagnotteId));
  return onValue(
    q,
    (snap) => {
      cb(sortByCreatedAtDesc(snapshotToList<HistoryEntry>(snap)).slice(0, max));
    },
    (err) => onError?.(err)
  );
}

export function subscribeAllHistory(cb: (entries: HistoryEntry[]) => void, max = 100, onError?: (err: Error) => void) {
  return onValue(
    ref(db, "history"),
    (snap) => {
      cb(sortByCreatedAtDesc(snapshotToList<HistoryEntry>(snap)).slice(0, max));
    },
    (err) => onError?.(err)
  );
}
