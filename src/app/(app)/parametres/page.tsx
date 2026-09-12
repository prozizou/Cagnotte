"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { ref, update, serverTimestamp } from "firebase/database";
import { LogOut, ShieldCheck, KeyRound, Eye, EyeOff, Pencil, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { formatDateTime } from "@/lib/format";
import { UserStatusBadge } from "@/components/ui/StatusBadge";
import { Field, inputClass } from "@/components/ui/Field";

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

  const hasPassword = firebaseUser?.providerData.some((p) => p.providerId === "password") ?? false;

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

      {firebaseUser && <PasswordSection hasPassword={hasPassword} email={firebaseUser.email || ""} />}

      <button
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-danger hover:bg-danger-soft"
      >
        <LogOut size={16} /> Se déconnecter
      </button>
    </div>
  );
}

function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") return "Mot de passe actuel incorrect.";
  if (code === "auth/weak-password") return "Mot de passe trop faible (6 caractères minimum).";
  if (code === "auth/requires-recent-login") return "Reconnectez-vous puis réessayez (session trop ancienne).";
  if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
    return "Cet email est déjà utilisé par un autre compte.";
  }
  return "Échec de l'opération. Réessayez.";
}

function PasswordSection({ hasPassword, email }: { hasPassword: boolean; email: string }) {
  const { firebaseUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) return setError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
    if (newPassword !== confirmPassword) return setError("Les deux mots de passe ne correspondent pas.");
    if (!firebaseUser) return;

    setSubmitting(true);
    try {
      if (hasPassword) {
        if (!currentPassword) {
          setError("Saisissez votre mot de passe actuel.");
          setSubmitting(false);
          return;
        }
        await reauthenticateWithCredential(firebaseUser, EmailAuthProvider.credential(email, currentPassword));
        await updatePassword(firebaseUser, newPassword);
      } else {
        await linkWithCredential(firebaseUser, EmailAuthProvider.credential(email, newPassword));
      }
      toast.success(hasPassword ? "Mot de passe modifié ✔" : "Mot de passe défini ✔ — vous pouvez maintenant l'utiliser pour vous connecter");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <KeyRound size={16} className="text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{hasPassword ? "Changer le mot de passe" : "Définir un mot de passe"}</h2>
      </div>
      {!hasPassword && (
        <p className="mb-3 text-xs text-muted">
          Votre compte est actuellement lié à Google uniquement. Définissez un mot de passe pour pouvoir aussi vous
          connecter avec votre email ({email}) et ce mot de passe.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {hasPassword && (
          <Field label="Mot de passe actuel" required>
            <input
              type={show ? "text" : "password"}
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
        )}
        <Field label={hasPassword ? "Nouveau mot de passe" : "Mot de passe"} required hint="6 caractères minimum.">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              className={`${inputClass} pr-10`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              aria-label={show ? "Masquer" : "Afficher"}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <Field label="Confirmer le mot de passe" required>
          <input
            type={show ? "text" : "password"}
            className={inputClass}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>

        {error && <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {submitting ? "Enregistrement…" : hasPassword ? "Changer le mot de passe" : "Définir le mot de passe"}
        </button>
      </form>
    </div>
  );
}
