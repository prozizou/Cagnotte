"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { LogOut, ShieldCheck, DownloadCloud } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/lib/format";
import { UserStatusBadge } from "@/components/ui/StatusBadge";
import { LEGACY_OWNER_UID, importLegacyCagnotte } from "@/lib/legacyImport";

export default function ParametresPage() {
  const { profile, firebaseUser, isSuperAdmin, signOut } = useAuth();
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

      {firebaseUser && (firebaseUser.uid === LEGACY_OWNER_UID || isSuperAdmin) && (
        <LegacyImportCard actor={{ uid: firebaseUser.uid, name: profile.displayName }} />
      )}

      <button
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-danger hover:bg-danger-soft"
      >
        <LogOut size={16} /> Se déconnecter
      </button>
    </div>
  );
}

function LegacyImportCard({ actor }: { actor: { uid: string; name: string } }) {
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleImport() {
    setImporting(true);
    try {
      await importLegacyCagnotte(actor);
      toast.success("Import terminé ✔ — 32 cotisations historiques ajoutées");
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'import.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <DownloadCloud size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">Import des données historiques</h2>
          <p className="mt-1 text-xs text-muted">
            Crée une nouvelle cagnotte « Éclairage & Sécurité — Quartier HLM 2 » avec les 32 cotisations de
            l&apos;ancienne page (310 500 F CFA au total). Action unique, sans effet si déjà effectuée.
          </p>
          <button
            onClick={handleImport}
            disabled={importing || done}
            className="mt-3 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {done ? "Importé ✔" : importing ? "Import en cours…" : "Importer maintenant"}
          </button>
        </div>
      </div>
    </div>
  );
}
