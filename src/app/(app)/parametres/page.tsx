"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/lib/format";
import { UserStatusBadge } from "@/components/ui/StatusBadge";

export default function ParametresPage() {
  const { profile, isSuperAdmin, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    toast.success("Déconnecté");
    router.push("/login");
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
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-base font-semibold text-foreground">{profile.displayName}</p>
              {isSuperAdmin && <ShieldCheck size={15} className="flex-shrink-0 text-primary" />}
            </div>
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
