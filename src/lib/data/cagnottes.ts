import { equalTo, get, onValue, orderByChild, push, query, ref, serverTimestamp, set, update } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { Cagnotte, CagnotteStatus, Contact } from "@/lib/types";
import { logHistory } from "./history";
import { snapshotToList } from "./rtdbUtils";
import { formatFCFA } from "@/lib/format";
import { CAGNOTTE_STATUS_LABELS } from "@/lib/constants";

export interface CagnotteFormInput {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  goalAmount: number;
  contacts: Contact[];
  status: CagnotteStatus;
  imageUrl: string | null;
}

/**
 * Téléverse l'image de couverture d'une cagnotte vers Cloudinary, via la
 * route serveur /api/upload-image (la clé API secrète Cloudinary ne doit
 * jamais atteindre le navigateur). L'appel est authentifié par l'ID token
 * Firebase de l'utilisateur courant — la route rejette toute requête non
 * authentifiée. Retourne l'URL publique à stocker sur la cagnotte (champ
 * imageUrl).
 */
export async function uploadCagnotteImage(ownerId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Le fichier doit être une image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image trop lourde (5 Mo maximum).");

  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Vous devez être connecté pour envoyer une image.");
  const idToken = await currentUser.getIdToken();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", ownerId);

  const res = await fetch("/api/upload-image", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Échec de l'envoi de l'image.");
  return data.url as string;
}

export async function createCagnotte(
  input: CagnotteFormInput,
  actor: { uid: string; name: string }
): Promise<string> {
  const newRef = push(ref(db, "cagnottes"));
  await set(newRef, {
    ownerId: actor.uid,
    ownerName: actor.name,
    title: input.title,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    goalAmount: input.goalAmount,
    contacts: input.contacts,
    status: input.status,
    imageUrl: input.imageUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const cagnotteId = newRef.key as string;

  await logHistory({
    type: "cagnotte_created",
    description: `Cagnotte « ${input.title} » créée`,
    ownerId: actor.uid,
    cagnotteId,
    cagnotteTitle: input.title,
    actorId: actor.uid,
    actorName: actor.name,
  });

  return cagnotteId;
}

export async function updateCagnotte(
  cagnotteId: string,
  input: CagnotteFormInput,
  actor: { uid: string; name: string }
): Promise<void> {
  await update(ref(db, `cagnottes/${cagnotteId}`), {
    title: input.title,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    goalAmount: input.goalAmount,
    contacts: input.contacts,
    status: input.status,
    imageUrl: input.imageUrl,
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
  await update(ref(db, `cagnottes/${cagnotte.id}`), {
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

/**
 * Suppression définitive d'une cagnotte, avec toutes ses cotisations
 * (suppression en cascade). Réservée en pratique aux brouillons pour un
 * propriétaire ordinaire (l'UI ne propose le bouton que dans ce cas) ou,
 * pour le Super Admin, à n'importe quelle cagnotte quel que soit son
 * statut — les règles Realtime Database appliquent cette même restriction
 * indépendamment de l'UI. Cotisations et cagnotte sont supprimées en une
 * seule écriture multi-chemins atomique (tout ou rien).
 */
export async function deleteCagnotte(cagnotte: Cagnotte, actor: { uid: string; name: string }): Promise<void> {
  const cotisationsSnap = await get(query(ref(db, "cotisations"), orderByChild("cagnotteId"), equalTo(cagnotte.id)));

  let total = 0;
  let count = 0;
  const updates: Record<string, null> = { [`cagnottes/${cagnotte.id}`]: null };
  cotisationsSnap.forEach((child) => {
    total += (child.val()?.amount as number) || 0;
    count += 1;
    updates[`cotisations/${child.key}`] = null;
  });

  await update(ref(db), updates);

  await logHistory({
    type: "cagnotte_deleted",
    description: `Cagnotte « ${cagnotte.title} » supprimée définitivement (${count} cotisation${count > 1 ? "s" : ""}, ${formatFCFA(total)})`,
    ownerId: cagnotte.ownerId,
    cagnotteId: cagnotte.id,
    cagnotteTitle: cagnotte.title,
    actorId: actor.uid,
    actorName: actor.name,
    metadata: { entriesDeleted: count, total },
  });
}

// Tri effectué côté client (et non via une requête combinant orderByChild
// et un tri par date) : Realtime Database ne permet qu'un seul
// orderByChild par requête. Un simple filtre d'égalité (ownerId) suffit
// et est indexé via ".indexOn" dans database.rules.json.
function sortByCreatedAtDesc(list: Cagnotte[]): Cagnotte[] {
  return [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export function subscribeUserCagnottes(
  uid: string,
  cb: (cagnottes: Cagnotte[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(ref(db, "cagnottes"), orderByChild("ownerId"), equalTo(uid));
  return onValue(
    q,
    (snap) => {
      cb(sortByCreatedAtDesc(snapshotToList<Cagnotte>(snap)));
    },
    (err) => onError?.(err)
  );
}

/**
 * Vue Super Admin : toutes les cagnottes de la plateforme, tous
 * propriétaires confondus. Lecture non filtrée du nœud entier : les règles
 * Realtime Database n'autorisent cette lecture globale que pour le Super
 * Admin (isSuperAdmin), donc un utilisateur non-admin qui appellerait cette
 * fonction par erreur se verrait simplement refuser l'accès.
 */
export function subscribeAllCagnottes(cb: (cagnottes: Cagnotte[]) => void, onError?: (err: Error) => void) {
  return onValue(
    ref(db, "cagnottes"),
    (snap) => {
      cb(sortByCreatedAtDesc(snapshotToList<Cagnotte>(snap)));
    },
    (err) => onError?.(err)
  );
}

export function subscribeCagnotte(cagnotteId: string, cb: (cagnotte: Cagnotte | null) => void) {
  return onValue(ref(db, `cagnottes/${cagnotteId}`), (snap) => {
    cb(snap.exists() ? ({ id: snap.key, ...snap.val() } as Cagnotte) : null);
  });
}
