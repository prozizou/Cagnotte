import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, UserStatus } from "@/lib/types";
import { logHistory } from "./history";

export function subscribeAllUsers(cb: (users: UserProfile[]) => void) {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as UserProfile));
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
