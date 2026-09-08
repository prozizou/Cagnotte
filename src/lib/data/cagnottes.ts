import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Cagnotte, CagnotteStatus, Contact } from "@/lib/types";
import { logHistory } from "./history";
import { CAGNOTTE_STATUS_LABELS } from "@/lib/constants";

export interface CagnotteFormInput {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  goalAmount: number;
  contacts: Contact[];
  status: CagnotteStatus;
}

export async function createCagnotte(
  input: CagnotteFormInput,
  actor: { uid: string; name: string }
): Promise<string> {
  const ref = await addDoc(collection(db, "cagnottes"), {
    ownerId: actor.uid,
    ownerName: actor.name,
    title: input.title,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    goalAmount: input.goalAmount,
    contacts: input.contacts,
    status: input.status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await logHistory({
    type: "cagnotte_created",
    description: `Cagnotte « ${input.title} » créée`,
    ownerId: actor.uid,
    cagnotteId: ref.id,
    cagnotteTitle: input.title,
    actorId: actor.uid,
    actorName: actor.name,
  });

  return ref.id;
}

export async function updateCagnotte(
  cagnotteId: string,
  input: CagnotteFormInput,
  actor: { uid: string; name: string }
): Promise<void> {
  await updateDoc(doc(db, "cagnottes", cagnotteId), {
    title: input.title,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    goalAmount: input.goalAmount,
    contacts: input.contacts,
    status: input.status,
    updatedAt: serverTimestamp(),
  });

  await logHistory({
    type: "cagnotte_updated",
    description: `Cagnotte « ${input.title} » modifiée`,
    ownerId: actor.uid,
    cagnotteId,
    cagnotteTitle: input.title,
    actorId: actor.uid,
    actorName: actor.name,
  });
}

export async function setCagnotteStatus(
  cagnotte: Cagnotte,
  newStatus: CagnotteStatus,
  actor: { uid: string; name: string }
): Promise<void> {
  await updateDoc(doc(db, "cagnottes", cagnotte.id), {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });

  const type =
    newStatus === "completed"
      ? "cagnotte_closed"
      : newStatus === "archived"
      ? "cagnotte_archived"
      : cagnotte.status === "completed" && newStatus === "active"
      ? "cagnotte_reopened"
      : "cagnotte_updated";

  await logHistory({
    type,
    description: `Cagnotte « ${cagnotte.title} » : statut changé en « ${CAGNOTTE_STATUS_LABELS[newStatus]} »`,
    ownerId: cagnotte.ownerId,
    cagnotteId: cagnotte.id,
    cagnotteTitle: cagnotte.title,
    actorId: actor.uid,
    actorName: actor.name,
  });
}

/** Suppression définitive : réservée aux cagnottes en brouillon (aucune cotisation attendue). */
export async function deleteCagnotte(cagnotte: Cagnotte, actor: { uid: string; name: string }): Promise<void> {
  await deleteDoc(doc(db, "cagnottes", cagnotte.id));
  await logHistory({
    type: "cagnotte_updated",
    description: `Cagnotte « ${cagnotte.title} » (brouillon) supprimée`,
    ownerId: cagnotte.ownerId,
    cagnotteId: cagnotte.id,
    cagnotteTitle: cagnotte.title,
    actorId: actor.uid,
    actorName: actor.name,
  });
}

// Tri effectué côté client (et non via orderBy() dans la requête) : une
// requête combinant where(ownerId==…) et orderBy(createdAt) exige un index
// composite à créer manuellement dans la console Firebase, ce qui n'est pas
// toujours fait. Une simple égalité est indexée automatiquement par
// Firestore, sans configuration supplémentaire.
function sortByCreatedAtDesc(list: Cagnotte[]): Cagnotte[] {
  return [...list].sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

export function subscribeUserCagnottes(
  uid: string,
  cb: (cagnottes: Cagnotte[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, "cagnottes"), where("ownerId", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      cb(sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cagnotte))));
    },
    (err) => onError?.(err)
  );
}

export function subscribeCagnotte(cagnotteId: string, cb: (cagnotte: Cagnotte | null) => void) {
  return onSnapshot(doc(db, "cagnottes", cagnotteId), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Cagnotte) : null);
  });
}
