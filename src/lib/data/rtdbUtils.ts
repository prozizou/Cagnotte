import { DataSnapshot } from "firebase/database";

/** Transforme un DataSnapshot Realtime Database (nœud à plusieurs enfants) en tableau, en réinjectant la clé comme "id". */
export function snapshotToList<T extends { id: string }>(snap: DataSnapshot): T[] {
  const list: T[] = [];
  snap.forEach((child) => {
    list.push({ id: child.key as string, ...child.val() } as T);
  });
  return list;
}
