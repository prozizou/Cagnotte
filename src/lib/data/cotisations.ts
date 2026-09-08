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
import { Cagnotte, Cotisation } from "@/lib/types";
import { logHistory } from "./history";
import { formatFCFA } from "@/lib/format";

export interface CotisationFormInput {
  name: string;
  amount: number;
  date: string;
  comment: string;
}

// Collection de premier niveau (et non une sous-collection de "cagnottes") :
// chaque cotisation porte ses propres cagnotteId/ownerId dénormalisés. Ce
// choix évite les requêtes de type collectionGroup, qui exigent un index
// composite dédié à créer manuellement (impossible à déployer par simple
// copier-coller des règles depuis la console Firebase) — ici, une seule
// égalité (where cagnotteId==… ou ownerId==…) suffit et est indexée
// automatiquement par Firestore, sans configuration supplémentaire.
function cotisationsCollection() {
  return collection(db, "cotisations");
}

export async function addCotisation(
  cagnotte: Cagnotte,
  input: CotisationFormInput,
  actor: { uid: string; name: string }
): Promise<void> {
  await addDoc(cotisationsCollection(), {
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
  await updateDoc(doc(db, "cotisations", cotisationId), {
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
  await deleteDoc(doc(db, "cotisations", cotisation.id));

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

function sortByDateDesc(list: Cotisation[]): Cotisation[] {
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
}

export function subscribeCotisations(
  cagnotteId: string,
  cb: (list: Cotisation[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(cotisationsCollection(), where("cagnotteId", "==", cagnotteId));
  return onSnapshot(
    q,
    (snap) => {
      cb(sortByDateDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cotisation))));
    },
    (err) => onError?.(err)
  );
}

/** Agrégation multi-cagnottes pour le tableau de bord. */
export function subscribeAllCotisationsForOwner(
  uid: string,
  cb: (list: Cotisation[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(cotisationsCollection(), where("ownerId", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      cb(sortByDateDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cotisation))));
    },
    (err) => onError?.(err)
  );
}
