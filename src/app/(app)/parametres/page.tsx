"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateProfile } from "firebase/auth";
import { ref, update, serverTimestamp } from "firebase/database";
import { LogOut, ShieldCheck, Pencil, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { formatDateTime } from "@/lib/format";
import { UserStatusBadge } from "@/components/ui/StatusBadge";
import { inputClass } from "@/components/ui/Field";

export default function ParametresPage() {
  const { profile, firebaseUser, isSuperAdmin, signOut } = useAuth();
  const router = useRouter();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  async function handleSignOut() {
    await signOut();
    toast.success("Déconnecté");
    router.push("/login");
  }

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed || !firebaseUser) return;
    setSavingName(true);
    try {
      // Le profil affiché dans toute l'app (en-tête, salutation…) vient du
      // document Realtime Database, pas de l'objet Firebase Auth en
      // mémoire — les deux sont mis à jour pour rester cohérents (ex. si le
      // profil est un jour re-bootstrapé depuis firebaseUser.displayName).
      await updateProfile(firebaseUser, { displayName: trimmed });
      await update(ref(db, `users/${firebaseUser.uid}`), { displayName: trimmed, updatedAt: serverTimestamp() });
      toast.success("Nom mis à jour ✔");
      setEditingName(false);
    } catch {
      toast.error("Échec de la mise à jour du nom.");
    } finally {
      setSavingName(false);
    }
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Paramètres</h1>
        <p className="text-sm text-muted">Informations de votre compte.</p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-3">
          {profile.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoURL} alt="" className="h-14 w-14 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary">
              {profile.displayName?.[0]?.toUpperCase() || "U"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  className={`${inputClass} py-1.5`}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-60"
                  aria-label="Enregistrer"
                >
                  <Check size={15} />
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-line text-muted"
                  aria-label="Annuler"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className="truncate text-base font-semibold text-foreground">{profile.displayName}</p>
                {isSuperAdmin && <ShieldCheck size={15} className="flex-shrink-0 text-primary" />}
                <button
                  onClick={() => {
                    setNameInput(profile.displayName || "");
                    setEditingName(true);
                  }}
                  className="flex-shrink-0 rounded-lg p-1 text-muted hover:bg-muted-soft hover:text-foreground"
                  aria-label="Modifier le nom affiché"
                  title="Modifier le nom affiché"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
            <p className="truncate text-sm text-muted">{profile.email}</p>
          </div>
        </div>

        <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted">Rôle</dt>
            <dd className="font-medium text-foreground">{isSuperAdmin ? "Super Administrateur" : "Utilisateur"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">Statut d&apos;accès</dt>
            <dd>
              <UserStatusBadge status={profile.status} />
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">Membre depuis</dt>
            <dd className="font-medium text-foreground">{formatDateTime(profile.createdAt)}</dd>
          </div>
        </dl>
      </div>

      <button
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-danger hover:bg-danger-soft"
      >
        <LogOut size={16} /> Se déconnecter
      </button>
    </div>
  );
}

