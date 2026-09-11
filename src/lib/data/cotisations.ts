import { equalTo, onValue, orderByChild, push, query, ref, remove, serverTimestamp, set, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Cagnotte, Cotisation } from "@/lib/types";
import { logHistory } from "./history";
import { snapshotToList } from "./rtdbUtils";
import { formatFCFA } from "@/lib/format";

export interface CotisationFormInput {
  name: string;
  amount: number;
  date: string;
  comment: string;
}

// Nœud de premier niveau (et non un enfant de "cagnottes") : chaque
// cotisation porte ses propres cagnotteId/ownerId dénormalisés. Ce choix
// évite les requêtes imbriquées coûteuses — ici, un simple orderByChild
// (cagnotteId ou ownerId) suffit, indexé via ".indexOn" dans
// database.rules.json.
function cotisationsRef() {
  return ref(db, "cotisations");
}

export async function addCotisation(
  cagnotte: Cagnotte,
  input: CotisationFormInput,
  actor: { uid: string; name: string }
): Promise<void> {
  const newRef = push(cotisationsRef());
  await set(newRef, {
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
  await update(ref(db, `cotisations/${cotisationId}`), {
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
  await remove(ref(db, `cotisations/${cotisation.id}`));

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
  const q = query(cotisationsRef(), orderByChild("cagnotteId"), equalTo(cagnotteId));
  return onValue(
    q,
    (snap) => {
      cb(sortByDateDesc(snapshotToList<Cotisation>(snap)));
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
  const q = query(cotisationsRef(), orderByChild("ownerId"), equalTo(uid));
  return onValue(
    q,
    (snap) => {
      cb(sortByDateDesc(snapshotToList<Cotisation>(snap)));
    },
    (err) => onError?.(err)
  );
}

/** Vue Super Admin : toutes les cotisations de la plateforme, tous propriétaires confondus. */
export function subscribeAllCotisationsAdmin(cb: (list: Cotisation[]) => void, onError?: (err: Error) => void) {
  return onValue(
    cotisationsRef(),
    (snap) => {
      cb(sortByDateDesc(snapshotToList<Cotisation>(snap)));
    },
    (err) => onError?.(err)
  );
}
