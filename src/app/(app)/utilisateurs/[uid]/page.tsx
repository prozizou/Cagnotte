"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ShieldCheck,
  Check,
  X,
  ShieldOff,
  UserMinus,
  Trash2,
  Wallet,
  Coins,
  Users,
  History as HistoryIconLucide,
  Download,
  Upload,
  FileJson,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeUserProfile, approveUser, rejectUser, suspendUser, reactivateUser, revokeUser, deleteUserProfile } from "@/lib/data/users";
import { subscribeUserCagnottes, deleteCagnotte } from "@/lib/data/cagnottes";
import { subscribeHistoryForOwner } from "@/lib/data/history";
import {
  buildUserExport,
  downloadJSON,
  parseUserExportJSON,
  importUserExport,
  ParsedUserImport,
} from "@/lib/data/userDataTransfer";
import { UserProfile, Cagnotte, HistoryEntry } from "@/lib/types";
import { UserStatusBadge, CagnotteStatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { KPICard } from "@/components/ui/KPICard";
import { inputClass } from "@/components/ui/Field";
import { HistoryIcon } from "@/components/history/HistoryIcon";
import { formatFCFA, formatDateTime } from "@/lib/format";
import { useOwnerCotisationsFor } from "@/hooks/useOwnerCotisationsFor";

export default function UserDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const { firebaseUser, profile: currentProfile, isSuperAdmin } = useAuth();
  const [target, setTarget] = useState<UserProfile | null | undefined>(undefined);
  const [cagnottes, setCagnottes] = useState<Cagnotte[]>([]);
  const [loadingCagnottes, setLoadingCagnottes] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pendingAction, setPendingAction] = useState<"reject" | "suspend" | "revoke" | "delete" | null>(null);
  const [cagnotteToDelete, setCagnotteToDelete] = useState<Cagnotte | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (currentProfile && !isSuperAdmin) router.replace("/dashboard");
  }, [currentProfile, isSuperAdmin, router]);

  useEffect(() => subscribeUserProfile(uid, setTarget), [uid]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingCagnottes(true);
    return subscribeUserCagnottes(
      uid,
      (list) => {
        setCagnottes(list);
        setLoadingCagnottes(false);
      },
      () => setLoadingCagnottes(false)
    );
  }, [uid]);

  useEffect(() => subscribeHistoryForOwner(uid, setHistory, 20), [uid]);

  const { cotisations } = useOwnerCotisationsFor(uid);

  const totalsByCagnotte = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cotisations) map.set(c.cagnotteId, (map.get(c.cagnotteId) || 0) + (c.amount || 0));
    return map;
  }, [cotisations]);

  const stats = useMemo(() => {
    const total = cotisations.reduce((s, c) => s + (c.amount || 0), 0);
    const uniqueNames = new Set(cotisations.map((c) => c.name.trim().toLowerCase()).filter(Boolean));
    return { total, contributors: uniqueNames.size };
  }, [cotisations]);

  const actor = firebaseUser && currentProfile ? { uid: firebaseUser.uid, name: currentProfile.displayName } : null;

  async function runAction(fn: (t: UserProfile, a: { uid: string; name: string }) => Promise<void>, successMsg: string) {
    if (!actor || !target) return;
    try {
      await fn(target, actor);
      toast.success(successMsg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible.");
    }
  }

  async function handleDeleteUser() {
    if (!actor || !target) return;
    try {
      await deleteUserProfile(target, actor);
      toast.success("Compte supprimé");
      router.push("/utilisateurs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  async function handleDeleteCagnotte() {
    if (!actor || !cagnotteToDelete) return;
    try {
      await deleteCagnotte(cagnotteToDelete, actor);
      toast.success("Cagnotte supprimée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setCagnotteToDelete(null);
    }
  }

  function handleExport() {
    if (!target) return;
    const data = buildUserExport(target, cagnottes, cotisations);
    const slug = (target.displayName || target.email || target.uid)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    downloadJSON(`cotiz-${slug || target.uid}.json`, data);
    toast.success("Export téléchargé ✔");
  }

  if (!isSuperAdmin) return null;

  if (target === undefined) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-6 w-32" />
        <div className="skeleton h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (target === null) {
    return <p className="text-sm text-muted">Ce compte n&apos;existe pas ou a été supprimé.</p>;
  }

  const isSelf = target.uid === firebaseUser?.uid;

  return (
    <div className="space-y-5">
      <Link href="/utilisateurs" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft size={16} /> Utilisateurs
      </Link>

      {/* Profil */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            {target.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={target.photoURL} alt="" className="h-14 w-14 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary">
                {target.displayName?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-base font-semibold text-foreground">{target.displayName}</p>
                {target.role === "superadmin" && <ShieldCheck size={15} className="flex-shrink-0 text-primary" />}
              </div>
              <p className="truncate text-sm text-muted">{target.email}</p>
              <p className="mt-1 text-xs text-muted">Inscrit le {formatDateTime(target.createdAt)}</p>
            </div>
          </div>
          <UserStatusBadge status={target.status} />
        </div>

        {!isSelf && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            {target.status === "pending" && (
              <>
                <AdminButton icon={Check} label="Autoriser" tone="success" onClick={() => runAction(approveUser, "Accès autorisé ✔")} />
                <AdminButton icon={X} label="Refuser" tone="danger" onClick={() => setPendingAction("reject")} />
              </>
            )}
            {target.status === "approved" && (
              <>
                <AdminButton icon={ShieldOff} label="Suspendre" tone="warning" onClick={() => setPendingAction("suspend")} />
                <AdminButton icon={UserMinus} label="Retirer l'accès" tone="danger" onClick={() => setPendingAction("revoke")} />
              </>
            )}
            {target.status === "suspended" && (
              <>
                <AdminButton icon={Check} label="Réactiver" tone="success" onClick={() => runAction(reactivateUser, "Compte réactivé ✔")} />
                <AdminButton icon={UserMinus} label="Retirer l'accès" tone="danger" onClick={() => setPendingAction("revoke")} />
              </>
            )}
            {target.status === "rejected" && (
              <AdminButton icon={Check} label="Autoriser" tone="success" onClick={() => runAction(approveUser, "Accès autorisé ✔")} />
            )}
            <AdminButton icon={Trash2} label="Supprimer le compte" tone="danger" onClick={() => setPendingAction("delete")} />
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KPICard icon={Wallet} label="Cagnottes" value={String(cagnottes.length)} tone="primary" />
        <KPICard icon={Coins} label="Total collecté" value={formatFCFA(stats.total)} tone="success" />
        <KPICard icon={Users} label="Cotisants" value={String(stats.contributors)} />
      </div>

      {/* Export / import des données de ce compte */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <FileJson size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Données (JSON)</h2>
        </div>
        <p className="mb-3 text-xs text-muted">
          Le fichier exporté est identifié par le nom, l&apos;uid et l&apos;email de ce compte — un import se fait
          toujours sur la fiche actuellement ouverte, jamais sur un autre compte, pour ne jamais mélanger les
          données de deux personnes.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            disabled={cagnottes.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted-soft disabled:opacity-50"
          >
            <Download size={15} /> Exporter (JSON)
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted-soft"
          >
            <Upload size={15} /> Importer un fichier
          </button>
        </div>
      </div>

      {/* Cagnottes de cet utilisateur */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Cagnottes</h2>
        {loadingCagnottes ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton h-36 rounded-2xl" />
            ))}
          </div>
        ) : cagnottes.length === 0 ? (
          <EmptyState icon={Wallet} title="Aucune cagnotte" description="Ce compte n'a créé aucune cagnotte pour le moment." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {cagnottes.map((c) => {
              const total = totalsByCagnotte.get(c.id) || 0;
              const pct = c.goalAmount > 0 ? Math.min(100, (total / c.goalAmount) * 100) : 0;
              return (
                <div key={c.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/cagnottes/${c.id}`} className="min-w-0 truncate text-sm font-semibold text-foreground hover:text-primary">
                      {c.title}
                    </Link>
                    <CagnotteStatusBadge status={c.status} />
                  </div>
                  <p className="mt-2 text-sm font-bold text-foreground">
                    {formatFCFA(total)}
                    {c.goalAmount > 0 && <span className="ml-1 text-xs font-normal text-muted">/ {formatFCFA(c.goalAmount)}</span>}
                  </p>
                  {c.goalAmount > 0 && (
                    <div className="mt-2">
                      <ProgressBar pct={pct} size="sm" />
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <Link href={`/cagnottes/${c.id}`} className="text-xs font-medium text-primary hover:underline">
                      Voir le détail
                    </Link>
                    <button
                      onClick={() => setCagnotteToDelete(c)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-danger hover:bg-danger-soft"
                    >
                      <Trash2 size={13} /> Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historique — activité de ce compte et actions administratives le concernant */}
      <div>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <HistoryIconLucide size={15} /> Historique
        </h2>
        {history.length === 0 ? (
          <EmptyState icon={HistoryIconLucide} title="Aucune activité" description="Rien à signaler pour ce compte pour le moment." />
        ) : (
          <div className="rounded-2xl border border-line bg-surface shadow-sm">
            <ul className="divide-y divide-line">
              {history.map((h) => (
                <li key={h.id} className="flex items-start gap-3 p-4">
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <HistoryIcon type={h.type} size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{h.description}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <span>{formatDateTime(h.createdAt)}</span>
                      <span>·</span>
                      <span>par {h.actorName}</span>
                      {h.cagnotteId && (
                        <>
                          <span>·</span>
                          <Link href={`/cagnottes/${h.cagnotteId}`} className="text-primary hover:underline">
                            {h.cagnotteTitle}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingAction !== null && pendingAction !== "delete"}
        title={
          pendingAction === "reject"
            ? `Refuser l'accès de ${target?.displayName} ?`
            : pendingAction === "suspend"
            ? `Suspendre ${target?.displayName} ?`
            : `Retirer l'accès de ${target?.displayName} ?`
        }
        description={target ? target.email : ""}
        confirmLabel={pendingAction === "reject" ? "Refuser" : pendingAction === "suspend" ? "Suspendre" : "Retirer l'accès"}
        onCancel={() => setPendingAction(null)}
        onConfirm={async () => {
          if (pendingAction === "reject") await runAction(rejectUser, "Demande refusée");
          if (pendingAction === "suspend") await runAction(suspendUser, "Compte suspendu");
          if (pendingAction === "revoke") await runAction(revokeUser, "Accès retiré");
          setPendingAction(null);
        }}
      />

      <ConfirmDialog
        open={pendingAction === "delete"}
        title={`Supprimer définitivement le compte de ${target?.displayName} ?`}
        description={
          <>
            {target?.email}. Le compte redémarrera de zéro (statut « en attente ») s&apos;il se reconnecte un jour.
            Ses cagnottes ne sont pas supprimées automatiquement.
          </>
        }
        confirmLabel="Supprimer le compte"
        onCancel={() => setPendingAction(null)}
        onConfirm={handleDeleteUser}
      />

      <ConfirmDialog
        open={!!cagnotteToDelete}
        title="Supprimer définitivement cette cagnotte ?"
        description={
          cagnotteToDelete
            ? `« ${cagnotteToDelete.title} » et toutes ses cotisations (${formatFCFA(totalsByCagnotte.get(cagnotteToDelete.id) || 0)}) seront supprimées. Action irréversible.`
            : ""
        }
        confirmLabel="Supprimer"
        onCancel={() => setCagnotteToDelete(null)}
        onConfirm={handleDeleteCagnotte}
      />

      <ImportUserDataModal open={importOpen} target={target} actor={actor} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function ImportUserDataModal({
  open,
  target,
  actor,
  onClose,
}: {
  open: boolean;
  target: UserProfile;
  actor: { uid: string; name: string } | null;
  onClose: () => void;
}) {
  const [rawJson, setRawJson] = useState("");
  const [parsed, setParsed] = useState<ParsedUserImport | null>(null);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [confirmMismatch, setConfirmMismatch] = useState(false);

  if (!open) return null;

  function reset() {
    setRawJson("");
    setParsed(null);
    setError("");
    setConfirmMismatch(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleAnalyze() {
    if (!rawJson.trim()) {
      toast.error("Collez ou importez d'abord du JSON.");
      return;
    }
    const { result, error: parseError } = parseUserExportJSON(rawJson);
    setError(parseError || "");
    setParsed(result);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setRawJson(text);
      const { result, error: parseError } = parseUserExportJSON(text);
      setError(parseError || "");
      setParsed(result);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const ownerMismatch =
    parsed?.fileOwner && (parsed.fileOwner.uid || parsed.fileOwner.email)
      ? parsed.fileOwner.uid !== target.uid && parsed.fileOwner.email?.toLowerCase() !== target.email.toLowerCase()
      : false;

  async function runImport() {
    if (!actor || !parsed) return;
    setImporting(true);
    try {
      const result = await importUserExport(parsed, target, actor);
      toast.success(`${result.cagnottes} cagnotte(s), ${result.cotisations} cotisation(s) importée(s) ✔`);
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setImporting(false);
      setConfirmMismatch(false);
    }
  }

  function handleImportClick() {
    if (ownerMismatch) {
      setConfirmMismatch(true);
    } else {
      runImport();
    }
  }

  const totalCotisations = parsed?.cagnottes.reduce((s, c) => s + c.cotisations.length, 0) || 0;
  const totalAmount = parsed?.cagnottes.reduce((s, c) => s + c.cotisations.reduce((s2, e) => s2 + e.amount, 0), 0) || 0;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center" onClick={handleClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Importer pour {target.displayName}</h3>
          <button type="button" onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-muted-soft" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <p className="mb-3 text-xs text-muted">
          Accepte un export Cotiz (plusieurs cagnottes avec leurs cotisations) ou un tableau/export simple — dans ce
          second cas, utilisez plutôt la page Import JSON pour choisir la cagnotte cible.
        </p>

        <textarea
          className={`${inputClass} font-mono text-xs`}
          rows={6}
          placeholder='{ "owner": {...}, "cagnottes": [{ "title": "...", "cotisations": [...] }] }'
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
        />
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-muted-soft">
            <Upload size={14} /> Importer un fichier .json
            <input type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />
          </label>
          <button
            onClick={handleAnalyze}
            className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-dark"
          >
            Analyser
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {parsed && (
          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-2 rounded-xl bg-success-soft p-3 text-sm text-success">
              <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
              <span>
                <strong>{parsed.cagnottes.length}</strong> cagnotte(s), <strong>{totalCotisations}</strong>{" "}
                cotisation(s) — total <strong>{formatFCFA(totalAmount)}</strong>
              </span>
            </div>
            {parsed.entriesSkipped > 0 && (
              <p className="rounded-xl bg-warning-soft p-3 text-xs text-warning">
                {parsed.entriesSkipped} entrée(s) ignorée(s) (nom ou montant manquant).
              </p>
            )}
            {ownerMismatch && (
              <div className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-xs text-danger">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  Ce fichier semble avoir été exporté pour un autre compte
                  {parsed.fileOwner?.email ? ` (${parsed.fileOwner.email})` : ""}. Vérifiez avant de continuer.
                </span>
              </div>
            )}
          </div>
        )}

        {parsed && parsed.cagnottes.length > 0 && (
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            <FileJson size={16} /> Importer pour {target.displayName}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmMismatch}
        tone="primary"
        title="Importer malgré tout ?"
        description={`Ce fichier semble appartenir à un autre compte${
          parsed?.fileOwner?.email ? ` (${parsed.fileOwner.email})` : ""
        }. Les données seront tout de même rattachées à ${target.displayName} (${target.email}).`}
        confirmLabel="Importer quand même"
        onCancel={() => setConfirmMismatch(false)}
        onConfirm={runImport}
      />
    </div>
  );
}

function AdminButton({
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
    success: "text-success hover:bg-success-soft border-success/30",
    danger: "text-danger hover:bg-danger-soft border-danger/30",
    warning: "text-warning hover:bg-warning-soft border-warning/30",
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${toneStyles[tone]}`}>
      <Icon size={14} /> {label}
    </button>
  );
}
