"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Pencil,
  Plus,
  Share2,
  BarChart3,
  Target,
  Users,
  TrendingUp,
  Trophy,
  Clock3,
  Archive,
  RotateCcw,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeCagnotte, setCagnotteStatus, deleteCagnotte } from "@/lib/data/cagnottes";
import { subscribeCotisations, addCotisation, updateCotisation, deleteCotisation } from "@/lib/data/cotisations";
import { Cagnotte, Cotisation } from "@/lib/types";
import { computeCagnotteStats } from "@/lib/stats";
import { KPICard } from "@/components/ui/KPICard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CagnotteStatusBadge } from "@/components/ui/StatusBadge";
import { ContactsList } from "@/components/cagnottes/ContactsList";
import { CotisationsTable } from "@/components/cotisations/CotisationsTable";
import { CotisationFormModal } from "@/components/cotisations/CotisationFormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatFCFA, formatPct, formatDate } from "@/lib/format";
import { buildBilanMessage, whatsAppShareUrl } from "@/lib/whatsapp";
import { CAGNOTTE_STATUS_LABELS } from "@/lib/constants";

export default function CagnotteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { firebaseUser, profile } = useAuth();
  const [cagnotte, setCagnotte] = useState<Cagnotte | null | undefined>(undefined);
  const [cotisations, setCotisations] = useState<Cotisation[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cotisation | null>(null);
  const [toDelete, setToDelete] = useState<Cotisation | null>(null);
  const [confirmDeleteCagnotte, setConfirmDeleteCagnotte] = useState(false);

  useEffect(() => subscribeCagnotte(id, setCagnotte), [id]);
  useEffect(
    () =>
      subscribeCotisations(id, setCotisations, (err) =>
        toast.error("Impossible de charger les cotisations : " + err.message)
      ),
    [id]
  );

  const stats = useMemo(() => computeCagnotteStats(cotisations, cagnotte?.goalAmount || 0), [cotisations, cagnotte]);

  if (cagnotte === undefined) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-6 w-32" />
        <div className="skeleton h-40 w-full rounded-2xl" />
        <div className="skeleton h-80 w-full rounded-2xl" />
      </div>
    );
  }
  if (cagnotte === null) {
    return <p className="text-sm text-muted">Cette cagnotte n&apos;existe pas ou n&apos;est plus accessible.</p>;
  }

  const actor = firebaseUser && profile ? { uid: firebaseUser.uid, name: profile.displayName } : null;
  const readOnly = cagnotte.status === "archived";

  async function handleAddOrEdit(input: Parameters<typeof addCotisation>[1]) {
    if (!actor || !cagnotte) return;
    if (editing) {
      await updateCotisation(cagnotte, editing.id, input, actor);
      toast.success("Cotisation modifiée ✔");
    } else {
      await addCotisation(cagnotte, input, actor);
      toast.success("Cotisation ajoutée ✔");
    }
    setEditing(null);
  }

  async function handleDeleteCotisation() {
    if (!actor || !toDelete || !cagnotte) return;
    await deleteCotisation(cagnotte, toDelete, actor);
    toast.success("Cotisation supprimée");
    setToDelete(null);
  }

  async function handleStatusChange(newStatus: Cagnotte["status"]) {
    if (!actor || !cagnotte) return;
    await setCagnotteStatus(cagnotte, newStatus, actor);
    toast.success(`Statut mis à jour : ${CAGNOTTE_STATUS_LABELS[newStatus]}`);
  }

  async function handleDeleteCagnotte() {
    if (!actor || !cagnotte) return;
    await deleteCagnotte(cagnotte, actor);
    toast.success("Cagnotte supprimée");
    router.push("/cagnottes");
  }

  function handleShareBilan() {
    if (!cagnotte) return;
    const msg = buildBilanMessage(cagnotte, stats);
    window.open(whatsAppShareUrl(msg), "_blank", "noopener");
  }

  return (
    <div className="space-y-5">
      <Link href="/cagnottes" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft size={16} /> Mes cagnottes
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">{cagnotte.title}</h1>
            <CagnotteStatusBadge status={cagnotte.status} />
          </div>
          {cagnotte.description && <p className="mt-1 max-w-2xl text-sm text-muted">{cagnotte.description}</p>}
          <p className="mt-1.5 text-xs text-muted">
            {formatDate(cagnotte.startDate)} → {cagnotte.endDate ? formatDate(cagnotte.endDate) : "indéterminée"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/cagnottes/${id}/rapport`}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted-soft"
          >
            <BarChart3 size={15} /> Rapport
          </Link>
          <button
            onClick={handleShareBilan}
            className="flex items-center gap-1.5 rounded-xl bg-whatsapp px-3.5 py-2 text-sm font-semibold text-white hover:bg-whatsapp-dark"
          >
            <Share2 size={15} /> Partager le bilan
          </button>
          <Link
            href={`/cagnottes/${id}/edit`}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-muted-soft"
            aria-label="Modifier la cagnotte"
          >
            <Pencil size={15} />
          </Link>
        </div>
      </div>

      {/* Objectif & progression */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        {cagnotte.goalAmount > 0 ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="text-2xl font-extrabold tabular-nums text-foreground">{formatFCFA(stats.totalCollected)}</span>
                <span className="ml-1.5 text-sm text-muted">collecté sur {formatFCFA(stats.goalAmount)}</span>
              </div>
              <span className={`text-sm font-bold ${stats.isGoalReached ? "text-success" : "text-primary"}`}>
                {formatPct(stats.progressPct)}
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar pct={stats.progressPct} goalReached={stats.isGoalReached} />
            </div>
            <p className="mt-2.5 text-sm">
              {stats.isGoalReached ? (
                <span className="font-semibold text-success">
                  🎉 Objectif atteint — 100 %{stats.surplus > 0 && ` · Excédent : +${formatFCFA(stats.surplus)}`}
                </span>
              ) : (
                <span className="text-muted">
                  Reste <span className="font-semibold text-foreground">{formatFCFA(stats.remaining)}</span> (
                  {formatPct(100 - stats.progressPct)} restants)
                </span>
              )}
            </p>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-extrabold tabular-nums text-foreground">{formatFCFA(stats.totalCollected)}</span>
              <span className="ml-1.5 text-sm text-muted">collecté</span>
            </div>
            <span className="text-xs text-muted">Aucun objectif défini</span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard icon={Target} label="Objectif" value={cagnotte.goalAmount > 0 ? formatFCFA(cagnotte.goalAmount) : "—"} />
        <KPICard icon={Users} label="Cotisants" value={String(stats.contributorsCount)} hint={`${stats.entriesCount} entrée(s)`} />
        <KPICard icon={TrendingUp} label="Moyenne" value={formatFCFA(stats.averageAmount)} />
        <KPICard icon={Trophy} label="Plus forte" value={stats.maxContribution ? formatFCFA(stats.maxContribution.amount) : "—"} hint={stats.maxContribution?.name} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Contacts */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Contacts administratifs</h2>
          <ContactsList contacts={cagnotte.contacts} />
        </div>

        {/* Gestion du statut */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Gestion de la cagnotte</h2>
          <div className="flex flex-wrap gap-2">
            {cagnotte.status !== "active" && cagnotte.status !== "archived" && (
              <StatusButton icon={CheckCircle2} label="Activer" onClick={() => handleStatusChange("active")} />
            )}
            {cagnotte.status === "active" && (
              <StatusButton icon={Clock3} label="Clôturer" onClick={() => handleStatusChange("completed")} />
            )}
            {cagnotte.status === "completed" && (
              <StatusButton icon={RotateCcw} label="Réouvrir" onClick={() => handleStatusChange("active")} />
            )}
            {cagnotte.status !== "archived" && (
              <StatusButton icon={Archive} label="Archiver" onClick={() => handleStatusChange("archived")} />
            )}
            {cagnotte.status === "archived" && (
              <StatusButton icon={RotateCcw} label="Désarchiver" onClick={() => handleStatusChange("active")} />
            )}
            {cagnotte.status === "draft" && (
              <StatusButton icon={Trash2} label="Supprimer" tone="danger" onClick={() => setConfirmDeleteCagnotte(true)} />
            )}
          </div>
          {readOnly && (
            <p className="mt-3 text-xs text-muted">
              Cette cagnotte est archivée : elle est en lecture seule. Désarchivez-la pour la modifier à nouveau.
            </p>
          )}
        </div>
      </div>

      {/* Cotisations */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Cotisations</h2>
          {!readOnly && (
            <button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              <Plus size={15} /> Ajouter
            </button>
          )}
        </div>
        <CotisationsTable
          cotisations={cotisations}
          readOnly={readOnly}
          onEdit={(c) => {
            setEditing(c);
            setModalOpen(true);
          }}
          onDelete={(c) => setToDelete(c)}
        />
      </div>

      <CotisationFormModal
        open={modalOpen}
        initial={editing}
        onSubmit={handleAddOrEdit}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer cette cotisation ?"
        description={toDelete ? `${toDelete.name} — ${formatFCFA(toDelete.amount)}. Cette action est irréversible.` : ""}
        confirmLabel="Supprimer"
        onConfirm={handleDeleteCotisation}
        onCancel={() => setToDelete(null)}
      />

      <ConfirmDialog
        open={confirmDeleteCagnotte}
        title="Supprimer cette cagnotte brouillon ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={handleDeleteCagnotte}
        onCancel={() => setConfirmDeleteCagnotte(false)}
      />
    </div>
  );
}

function StatusButton({
  icon: Icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: typeof CheckCircle2;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium ${
        tone === "danger"
          ? "border-danger-soft text-danger hover:bg-danger-soft"
          : "border-line text-foreground hover:bg-muted-soft"
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}
