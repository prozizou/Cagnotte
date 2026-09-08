import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Cagnotte, Cotisation } from "@/lib/types";
import { logHistory } from "./history";
import { formatFCFA } from "@/lib/format";

export interface CotisationFormInput {
  name: string;
  amount: number;
  date: string;
  comment: string;
}

function cotisationsRef(cagnotteId: string) {
  return collection(db, "cagnottes", cagnotteId, "cotisations");
}

export async function addCotisation(
  cagnotte: Cagnotte,
  input: CotisationFormInput,
  actor: { uid: string; name: string }
): Promise<void> {
  await addDoc(cotisationsRef(cagnotte.id), {
    cagnotteId: cagnotte.id,
    ownerId: cagnotte.ownerId,
    name: input.name,
    amount: input.amount,
    date: input.date,
    comment: input.comment || "",
    createdBy: actor.uid,
    createdByName: actor.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await logHistory({
    type: "cotisation_added",
    description: `Cotisation ajoutée : ${input.name} (${formatFCFA(input.amount)})`,
    ownerId: cagnotte.ownerId,
    cagnotteId: cagnotte.id,
    cagnotteTitle: cagnotte.title,
    actorId: actor.uid,
    actorName: actor.name,
    metadata: { name: input.name, amount: input.amount },
  });
}

export async function updateCotisation(
  cagnotte: Cagnotte,
  cotisationId: string,
  input: CotisationFormInput,
  actor: { uid: string; name: string }
): Promise<void> {
  await updateDoc(doc(db, "cagnottes", cagnotte.id, "cotisations", cotisationId), {
    name: input.name,
    amount: input.amount,
    date: input.date,
    comment: input.comment || "",
    updatedAt: serverTimestamp(),
  });

  await logHistory({
    type: "cotisation_updated",
    description: `Cotisation modifiée : ${input.name} (${formatFCFA(input.amount)})`,
    ownerId: cagnotte.ownerId,
    cagnotteId: cagnotte.id,
    cagnotteTitle: cagnotte.title,
    actorId: actor.uid,
    actorName: actor.name,
    metadata: { name: input.name, amount: input.amount },
  });
}

export async function deleteCotisation(
  cagnotte: Cagnotte,
  cotisation: Cotisation,
  actor: { uid: string; name: string }
): Promise<void> {
  await deleteDoc(doc(db, "cagnottes", cagnotte.id, "cotisations", cotisation.id));

  await logHistory({
    type: "cotisation_deleted",
    description: `Cotisation supprimée : ${cotisation.name} (${formatFCFA(cotisation.amount)})`,
    ownerId: cagnotte.ownerId,
    cagnotteId: cagnotte.id,
    cagnotteTitle: cagnotte.title,
    actorId: actor.uid,
    actorName: actor.name,
    metadata: { name: cotisation.name, amount: cotisation.amount },
  });
}

export function subscribeCotisations(cagnotteId: string, cb: (list: Cotisation[]) => void) {
  const q = query(cotisationsRef(cagnotteId), orderBy("date", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cotisation)));
  });
}

/** Agrégation multi-cagnottes pour le tableau de bord (collectionGroup). */
export function subscribeAllCotisationsForOwner(uid: string, cb: (list: Cotisation[]) => void) {
  const q = query(collectionGroup(db, "cotisations"), where("ownerId", "==", uid));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cotisation)));
  });
}

export function subscribeAllCotisations(cb: (list: Cotisation[]) => void) {
  const q = query(collectionGroup(db, "cotisations"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cotisation)));
  });
}
