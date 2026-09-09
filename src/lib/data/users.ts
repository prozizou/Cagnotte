import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, UserStatus } from "@/lib/types";
import { logHistory } from "./history";

export function subscribeAllUsers(cb: (users: UserProfile[]) => void) {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as UserProfile));
  });
}

export function subscribeUserProfile(uid: string, cb: (profile: UserProfile | null) => void) {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    cb(snap.exists() ? (snap.data() as UserProfile) : null);
  });
}

type AdminAction = "user_approved" | "user_rejected" | "user_suspended" | "user_reactivated" | "user_revoked";

async function setUserStatus(
  target: UserProfile,
  status: UserStatus,
  action: AdminAction,
  actor: { uid: string; name: string },
  label: string
): Promise<void> {
  await updateDoc(doc(db, "users", target.uid), {
    status,
    updatedAt: serverTimestamp(),
    approvedBy: actor.uid,
    approvedByName: actor.name,
    approvedAt: serverTimestamp(),
  });

  await logHistory({
    type: action,
    description: `${label} : ${target.displayName || target.email}`,
    ownerId: target.uid,
    actorId: actor.uid,
    actorName: actor.name,
    metadata: { targetEmail: target.email },
  });
}

export const approveUser = (target: UserProfile, actor: { uid: string; name: string }) =>
  setUserStatus(target, "approved", "user_approved", actor, "Accès autorisé");

export const rejectUser = (target: UserProfile, actor: { uid: string; name: string }) =>
  setUserStatus(target, "rejected", "user_rejected", actor, "Demande refusée");

export const suspendUser = (target: UserProfile, actor: { uid: string; name: string }) =>
  setUserStatus(target, "suspended", "user_suspended", actor, "Compte suspendu");

export const reactivateUser = (target: UserProfile, actor: { uid: string; name: string }) =>
  setUserStatus(target, "approved", "user_reactivated", actor, "Compte réactivé");

export const revokeUser = (target: UserProfile, actor: { uid: string; name: string }) =>
  setUserStatus(target, "rejected", "user_revoked", actor, "Accès retiré");

/**
 * Suppression définitive du profil (et non simple retrait d'accès) :
 * l'utilisateur redémarre de zéro (statut "pending") s'il se reconnecte
 * un jour. Ne supprime pas ses éventuelles cagnottes/cotisations, qui
 * restent visibles côté Super Admin — à supprimer séparément si besoin.
 * Ne supprime jamais le compte du Super Admin appelant lui-même (règle
 * Firestore appliquée indépendamment de l'UI).
 */
export async function deleteUserProfile(target: UserProfile, actor: { uid: string; name: string }): Promise<void> {
  if (target.uid === actor.uid) {
    throw new Error("Impossible de supprimer son propre compte.");
  }
  await deleteDoc(doc(db, "users", target.uid));

  await logHistory({
    type: "user_deleted",
    description: `Compte supprimé définitivement : ${target.displayName || target.email}`,
    ownerId: target.uid,
    actorId: actor.uid,
    actorName: actor.name,
    metadata: { targetEmail: target.email },
  });
}

interface PreApproveInput {
  uid: string;
  email: string;
  displayName: string;
}

/**
 * Crée directement un profil approuvé pour un UID donné, sans attendre
 * que ce compte se connecte une première fois. Utile pour autoriser à
 * l'avance un compte que l'on sait devoir se connecter prochainement
 * (ex. import de données historiques). Quand ce compte se connectera
 * réellement, il trouvera son profil déjà existant et approuvé — le
 * bootstrap automatique de première connexion ne s'exécute que si aucun
 * profil n'existe encore.
 */
export async function preApproveUser(input: PreApproveInput, actor: { uid: string; name: string }): Promise<void> {
  const uid = input.uid.trim();
  const email = input.email.trim().toLowerCase();
  if (!uid) throw new Error("UID obligatoire.");
  if (!email) throw new Error("Email obligatoire.");

  const ref = doc(db, "users", uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error("Un profil existe déjà pour cet UID.");
  }

  await setDoc(ref, {
    uid,
    email,
    displayName: input.displayName.trim() || email,
    photoURL: null,
    status: "approved",
    role: "user",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    approvedBy: actor.uid,
    approvedByName: actor.name,
    approvedAt: serverTimestamp(),
  });

  await logHistory({
    type: "user_approved",
    description: `Accès pré-autorisé (avant première connexion) : ${email}`,
    ownerId: uid,
    actorId: actor.uid,
    actorName: actor.name,
    metadata: { targetEmail: email },
  });
}
