"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import toast from "react-hot-toast";
import { Check, X, ShieldOff, ShieldCheck, UserMinus, Users as UsersIcon, UserPlus, RefreshCw, Copy, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeAllUsers,
  approveUser,
  rejectUser,
  suspendUser,
  reactivateUser,
  revokeUser,
  createUserAccount,
} from "@/lib/data/users";
import { UserProfile, UserStatus } from "@/lib/types";
import { UserStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, inputClass } from "@/components/ui/Field";
import { USER_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

const FILTERS: Array<{ value: UserStatus | "all"; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "pending", label: USER_STATUS_LABELS.pending },
  { value: "approved", label: USER_STATUS_LABELS.approved },
  { value: "suspended", label: USER_STATUS_LABELS.suspended },
  { value: "rejected", label: USER_STATUS_LABELS.rejected },
];

type PendingAction = { user: UserProfile; kind: "reject" | "suspend" | "revoke" } | null;

export default function UtilisateursPage() {
  const { firebaseUser, profile, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<UserStatus | "all">("all");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    return subscribeAllUsers((list) => {
      setUsers(list);
      setLoading(false);
    });
  }, [isSuperAdmin]);

  useEffect(() => {
    if (profile && !isSuperAdmin) router.replace("/dashboard");
  }, [profile, isSuperAdmin, router]);

  // Ouvre directement la création de compte quand on arrive depuis le menu
  // "+" global (Ajouter / inviter un utilisateur → ?preapprove=1).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("preapprove") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCreateAccountOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return users;
    return users.filter((u) => u.status === filter);
  }, [users, filter]);

  const actor = firebaseUser && profile ? { uid: firebaseUser.uid, name: profile.displayName } : null;

  async function runAction(fn: (target: UserProfile, actor: { uid: string; name: string }) => Promise<void>, target: UserProfile, successMsg: string) {
    if (!actor) return;
    try {
      await fn(target, actor);
      toast.success(successMsg);
    } catch {
      toast.error("Action impossible.");
    }
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Gestion des utilisateurs</h1>
          <p className="text-sm text-muted">Autorisez, refusez ou suspendez l&apos;accès des utilisateurs à la plateforme.</p>
        </div>
        <button
          onClick={() => setCreateAccountOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted-soft"
        >
          <UserPlus size={15} /> Créer un compte
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={clsx(
              "flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              filter === f.value ? "bg-primary text-white" : "bg-muted-soft text-muted hover:text-foreground"
            )}
          >
            {f.label}
            {f.value !== "all" && (
              <span className="ml-1.5 opacity-70">{users.filter((u) => u.status === f.value).length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton h-80 w-full rounded-2xl" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={UsersIcon} title="Aucun utilisateur" description="Aucun compte ne correspond à ce filtre." />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((u) => (
            <div key={u.uid} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/utilisateurs/${u.uid}`} className="flex min-w-0 items-center gap-3 hover:opacity-80">
                {u.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.photoURL} alt="" className="h-10 w-10 flex-shrink-0 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                    {u.displayName?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{u.displayName}</p>
                    {u.role === "superadmin" && <ShieldCheck size={14} className="flex-shrink-0 text-primary" />}
                  </div>
                  <p className="truncate text-xs text-muted">{u.email}</p>
                  <p className="text-[11px] text-muted">Inscrit le {formatDateTime(u.createdAt)}</p>
                </div>
              </Link>

              <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                <UserStatusBadge status={u.status} />
                {u.uid !== firebaseUser?.uid && (
                  <div className="flex flex-wrap gap-1.5">
                    {u.status === "pending" && (
                      <>
                        <ActionButton
                          icon={Check}
                          label="Autoriser"
                          tone="success"
                          onClick={() => runAction(approveUser, u, "Accès autorisé ✔")}
                        />
                        <ActionButton icon={X} label="Refuser" tone="danger" onClick={() => setPendingAction({ user: u, kind: "reject" })} />
                      </>
                    )}
                    {u.status === "approved" && (
                      <>
                        <ActionButton icon={ShieldOff} label="Suspendre" tone="warning" onClick={() => setPendingAction({ user: u, kind: "suspend" })} />
                        <ActionButton icon={UserMinus} label="Retirer" tone="danger" onClick={() => setPendingAction({ user: u, kind: "revoke" })} />
                      </>
                    )}
                    {u.status === "suspended" && (
                      <>
                        <ActionButton icon={Check} label="Réactiver" tone="success" onClick={() => runAction(reactivateUser, u, "Compte réactivé ✔")} />
                        <ActionButton icon={UserMinus} label="Retirer" tone="danger" onClick={() => setPendingAction({ user: u, kind: "revoke" })} />
                      </>
                    )}
                    {u.status === "rejected" && (
                      <ActionButton icon={Check} label="Autoriser" tone="success" onClick={() => runAction(approveUser, u, "Accès autorisé ✔")} />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingAction}
        title={
          pendingAction?.kind === "reject"
            ? `Refuser l'accès de ${pendingAction.user.displayName} ?`
            : pendingAction?.kind === "suspend"
            ? `Suspendre ${pendingAction.user.displayName} ?`
            : pendingAction
            ? `Retirer l'accès de ${pendingAction.user.displayName} ?`
            : ""
        }
        description={pendingAction ? pendingAction.user.email : ""}
        confirmLabel={pendingAction?.kind === "reject" ? "Refuser" : pendingAction?.kind === "suspend" ? "Suspendre" : "Retirer l'accès"}
        onCancel={() => setPendingAction(null)}
        onConfirm={async () => {
          if (!pendingAction) return;
          const { user, kind } = pendingAction;
          if (kind === "reject") await runAction(rejectUser, user, "Demande refusée");
          if (kind === "suspend") await runAction(suspendUser, user, "Compte suspendu");
          if (kind === "revoke") await runAction(revokeUser, user, "Accès retiré");
          setPendingAction(null);
        }}
      />

      <CreateAccountModal
        open={createAccountOpen}
        actor={actor}
        onClose={() => setCreateAccountOpen(false)}
      />
    </div>
  );
}

function generatePassword(): string {
  // Alphabet sans caractères ambigus (0/O, 1/l/I) pour une lecture/saisie
  // manuelle plus fiable lors de la transmission du mot de passe.
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function CreateAccountModal({
  open,
  actor,
  onClose,
}: {
  open: boolean;
  actor: { uid: string; name: string } | null;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  if (!open) return null;

  function reset() {
    setEmail("");
    setDisplayName("");
    setPassword(generatePassword());
    setError("");
    setCreated(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!actor) return;
    if (!email.trim()) {
      setError("Email obligatoire.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setSubmitting(true);
    try {
      await createUserAccount({ email: email.trim(), password, displayName: displayName.trim() }, actor);
      setCreated({ email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la création du compte.");
    } finally {
      setSubmitting(false);
    }
  }

  function copyCredentials() {
    if (!created) return;
    navigator.clipboard
      .writeText(`Email : ${created.email}\nMot de passe : ${created.password}`)
      .then(() => toast.success("Identifiants copiés ✔"))
      .catch(() => toast.error("Copie impossible — sélectionnez le texte manuellement."));
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center" onClick={handleClose}>
      {created ? (
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl">
          <div className="mb-1 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-success" />
            <h3 className="text-base font-semibold text-foreground">Compte créé</h3>
          </div>
          <p className="mb-4 text-xs text-muted">
            Communiquez ces identifiants à la personne concernée — ce mot de passe ne sera plus jamais affiché.
          </p>
          <div className="space-y-2 rounded-xl bg-muted-soft p-3.5 text-sm">
            <div>
              <span className="text-xs text-muted">Email</span>
              <p className="font-medium text-foreground">{created.email}</p>
            </div>
            <div>
              <span className="text-xs text-muted">Mot de passe</span>
              <p className="font-mono font-medium text-foreground">{created.password}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={copyCredentials}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted-soft"
          >
            <Copy size={15} /> Copier les identifiants
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="mt-2 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Terminé
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl"
        >
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Créer un compte</h3>
            <button type="button" onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-muted-soft" aria-label="Fermer">
              <X size={18} />
            </button>
          </div>
          <p className="mb-4 text-xs text-muted">
            Crée directement les identifiants de connexion (email + mot de passe) — la personne pourra se connecter
            immédiatement avec ce mot de passe.
          </p>

          <div className="space-y-3.5">
            <Field label="Email" required>
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@exemple.com" autoFocus />
            </Field>
            <Field label="Nom affiché" hint="Facultatif — l'email sera utilisé par défaut.">
              <input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </Field>
            <Field label="Mot de passe" required hint="6 caractères minimum. Généré automatiquement, modifiable.">
              <div className="flex gap-2">
                <input className={`${inputClass} font-mono`} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button
                  type="button"
                  onClick={() => setPassword(generatePassword())}
                  className="flex flex-shrink-0 items-center justify-center rounded-xl border border-line px-3 text-muted hover:bg-muted-soft"
                  aria-label="Régénérer un mot de passe"
                  title="Régénérer"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </Field>
          </div>

          {error && <p className="mt-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {submitting ? "Création…" : "Créer le compte"}
          </button>
        </form>
      )}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  tone,
  onClick,
}: {
  icon: typeof Check;
  label: string;
  tone: "success" | "danger" | "warning";
  onClick: () => void;
}) {
  const toneStyles = {
    success: "text-success hover:bg-success-soft",
    danger: "text-danger hover:bg-danger-soft",
    warning: "text-warning hover:bg-warning-soft",
  };
  return (
    <button
      onClick={onClick}
      className={clsx("flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold", toneStyles[tone])}
    >
      <Icon size={13} /> {label}
    </button>
  );
}
