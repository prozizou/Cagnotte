import { DataSnapshot, onValue, ref, remove, serverTimestamp, set, update } from "firebase/database";
import { initializeApp, deleteApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, updateProfile, signOut as signOutSecondary } from "firebase/auth";
import { app, db } from "@/lib/firebase";
import { UserProfile, UserStatus } from "@/lib/types";
import { logHistory } from "./history";

// Tri effectué côté client : Realtime Database ne conserve pas d'ordre
// "desc" natif, et le volume d'utilisateurs reste modeste pour ce type
// d'app.
function sortByCreatedAtDesc(list: UserProfile[]): UserProfile[] {
  return [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

// Ne réutilise pas snapshotToList() : un profil s'identifie déjà par son
// champ "uid" (== la clé RTDB), pas par un "id" séparé.
function snapshotToUsers(snap: DataSnapshot): UserProfile[] {
  const list: UserProfile[] = [];
  snap.forEach((child) => {
    list.push(child.val() as UserProfile);
  });
  return list;
}

export function subscribeAllUsers(cb: (users: UserProfile[]) => void) {
  return onValue(ref(db, "users"), (snap) => {
    cb(sortByCreatedAtDesc(snapshotToUsers(snap)));
  });
}

export function subscribeUserProfile(uid: string, cb: (profile: UserProfile | null) => void) {
  return onValue(ref(db, `users/${uid}`), (snap) => {
    cb(snap.exists() ? (snap.val() as UserProfile) : null);
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
  await update(ref(db, `users/${target.uid}`), {
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
 * Realtime Database appliquée indépendamment de l'UI).
 */
export async function deleteUserProfile(target: UserProfile, actor: { uid: string; name: string }): Promise<void> {
  if (target.uid === actor.uid) {
    throw new Error("Impossible de supprimer son propre compte.");
  }
  await remove(ref(db, `users/${target.uid}`));

  await logHistory({
    type: "user_deleted",
    description: `Compte supprimé définitivement : ${target.displayName || target.email}`,
    ownerId: target.uid,
    actorId: actor.uid,
    actorName: actor.name,
    metadata: { targetEmail: target.email },
  });
}

interface CreateAccountInput {
  email: string;
  password: string;
  displayName: string;
}

function authErrorToMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code === "auth/email-already-in-use") return "Un compte existe déjà avec cet email.";
  if (code === "auth/invalid-email") return "Adresse email invalide.";
  if (code === "auth/weak-password") return "Mot de passe trop faible (6 caractères minimum).";
  return "Échec de la création du compte.";
}

/**
 * Crée un compte complet (identifiants + profil) pour un utilisateur, sans
 * attendre qu'il se connecte lui-même une première fois : le Super Admin
 * choisit l'email et un mot de passe initial, à communiquer ensuite à la
 * personne concernée.
 *
 * Le compte Auth est créé via une application Firebase secondaire
 * (initialisée puis détruite pour cet appel) : createUserWithEmailAndPassword
 * connecte sinon automatiquement le nouvel utilisateur sur l'instance
 * utilisée, ce qui déconnecterait le Super Admin de sa propre session.
 */
export async function createUserAccount(
  input: CreateAccountInput,
  actor: { uid: string; name: string }
): Promise<{ uid: string }> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim() || email;
  if (!email) throw new Error("Email obligatoire.");
  if (!input.password || input.password.length < 6) {
    throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
  }

  const secondaryApp = initializeApp(app.options, `create-user-${Date.now()}`);
  let uid: string;
  try {
    const secondaryAuth = getAuth(secondaryApp);
    let credential;
    try {
      credential = await createUserWithEmailAndPassword(secondaryAuth, email, input.password);
    } catch (err) {
      throw new Error(authErrorToMessage(err));
    }
    if (displayName) await updateProfile(credential.user, { displayName });
    uid = credential.user.uid;
    await signOutSecondary(secondaryAuth);
  } finally {
    await deleteApp(secondaryApp);
  }

  await set(ref(db, `users/${uid}`), {
    uid,
    email,
    displayName,
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
    description: `Compte créé : ${email}`,
    ownerId: uid,
    actorId: actor.uid,
    actorName: actor.name,
    metadata: { targetEmail: email },
  });

  return { uid };
}
