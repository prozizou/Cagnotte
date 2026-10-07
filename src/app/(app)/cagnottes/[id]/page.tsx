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
import { ActionMenu } from "@/components/ui/ActionMenu";
import { GoalProgressCard } from "@/components/ui/GoalProgressCard";
import { CagnotteStatusBadge } from "@/components/ui/StatusBadge";
import { ContactsList } from "@/components/cagnottes/ContactsList";
import { CotisationsTable } from "@/components/cotisations/CotisationsTable";
import { CotisationFormModal } from "@/components/cotisations/CotisationFormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatFCFA, formatDate } from "@/lib/format";
import { buildGroupShareMessage, whatsAppShareUrl } from "@/lib/whatsapp";
import { CAGNOTTE_STATUS_LABELS } from "@/lib/constants";

export default function CagnotteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { firebaseUser, profile, isSuperAdmin } = useAuth();
  const [cagnotte, setCagnotte] = useState<Cagnotte | null | undefined>(undefined);
  const [cotisations, setCotisations] = useState<Cotisation[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cotisation | null>(null);
  const [toDelete, setToDelete] = useState<Cotisation | null>(null);
  const [confirmDeleteCagnotte, setConfirmDeleteCagnotte] = useState(false);
  // Image de couverture pré-téléchargée en fichier, prête à être partagée.
  // Indispensable pour le partage natif (voir handleShare) : on la charge
  // AVANT le clic pour ne pas avoir à attendre un fetch pendant le clic —
  // sur mobile, tout `await` avant navigator.share() « périme » le geste
  // tactile et fait échouer le partage du fichier (WhatsApp ne recevait
  // alors que le texte).
  const [shareImageFile, setShareImageFile] = useState<File | null>(null);

  useEffect(() => subscribeCagnotte(id, setCagnotte), [id]);
  useEffect(
    () =>
      subscribeCotisations(id, setCotisations, (err) =>
        toast.error("Impossible de charger les cotisations : " + err.message)
      ),
    [id]
  );

  // Pré-télécharge l'image de couverture en fichier dès qu'elle est connue,
  // pour que le partage WhatsApp (handleShare) puisse appeler navigator.share()
  // immédiatement au clic, sans fetch intermédiaire (cf. shareImageFile).
  useEffect(() => {
    const url = cagnotte?.imageUrl;
    if (!url) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShareImageFile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const blob = await res.blob();
        if (cancelled) return;
        setShareImageFile(new File([blob], "cagnotte.jpg", { type: blob.type || "image/jpeg" }));
      } catch {
        // Image non pré-chargée (réseau) : le partage se rabattra sur le texte.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cagnotte?.imageUrl]);

  // Ouvre directement le formulaire d'ajout quand on arrive depuis le menu
  // "+" global (Nouvelle cotisation → choix de la cagnotte → ?add=1).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("add") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModalOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

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

  // Partage du bilan dans un groupe WhatsApp : l'image de couverture ET le
  // texte complet (titre, statut, numéros, bilan, liste des dons) partis
  // ENSEMBLE, sur le modèle de l'annonce que l'utilisateur composait à la
  // main. Le seul moyen web d'attacher une image + une légende à WhatsApp
  // est l'API Web Share avec fichier ; on l'appelle donc en priorité, et —
  // point crucial — sans aucun `await` préalable : l'image est déjà prête
  // (shareImageFile, pré-téléchargée), sinon navigator.share() est refusé
  // par le navigateur mobile faute de geste utilisateur « frais » et seul
  // le texte partait (bug observé).
  async function handleShare() {
    if (!cagnotte) return;
    const message = buildGroupShareMessage(cagnotte, stats, cotisations);

    if (
      shareImageFile &&
      typeof navigator !== "undefined" &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [shareImageFile] })
    ) {
      try {
        await navigator.share({ files: [shareImageFile], text: message });
        return;
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return; // annulé par l'utilisateur
        toast.error("Le partage avec l'image a échoué, envoi du texte seul.");
      }
    } else if (cagnotte.imageUrl) {
      // Navigateur sans partage de fichier (ex. ordinateur, WebView limitée) :
      // WhatsApp via un lien ne peut pas transporter d'image. On ouvre alors
      // la photo à part pour que l'utilisateur puisse la joindre lui-même.
      window.open(cagnotte.imageUrl, "_blank", "noopener");
      toast("Sur cet appareil l'image ne peut pas être jointe automatiquement : enregistrez-la puis ajoutez-la à votre message.", {
        icon: "📎",
        duration: 6000,
      });
    }

    window.open(whatsAppShareUrl(message), "_blank", "noopener");
  }

  return (
    <div className="space-y-4">
      <Link href="/cagnottes" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft size={16} /> Mes cagnottes
      </Link>

      {/* En-tête compact : miniature + titre + statut, actions secondaires
          dans le menu "⋯" (Rapport, Modifier) pour ne garder qu'un bouton
          principal visible. */}
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-soft text-lg font-bold text-primary sm:h-20 sm:w-20">
          {cagnotte.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cagnotte.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            cagnotte.title.trim()[0]?.toUpperCase() || "C"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="min-w-0 text-lg font-bold leading-tight text-foreground sm:text-2xl">{cagnotte.title}</h1>
            <CagnotteStatusBadge status={cagnotte.status} />
          </div>
          {cagnotte.description && (
            <p className="mt-0.5 line-clamp-2 max-w-2xl text-sm text-muted">{cagnotte.description}</p>
          )}
          <p className="mt-0.5 text-xs text-muted">
            {formatDate(cagnotte.startDate)} → {cagnotte.endDate ? formatDate(cagnotte.endDate) : "indéterminée"}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            onClick={handleShare}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-whatsapp px-3 text-sm font-semibold text-white hover:bg-whatsapp-dark"
            aria-label="Partager le bilan"
          >
            <Share2 size={15} /> <span className="hidden sm:inline">Partager le bilan</span>
          </button>
          <ActionMenu
            ariaLabel="Plus d'actions"
            items={[
              { label: "Rapport", icon: BarChart3, onClick: () => router.push(`/cagnottes/${id}/rapport`) },
              { label: "Modifier la cagnotte", icon: Pencil, onClick: () => router.push(`/cagnottes/${id}/edit`) },
            ]}
          />
        </div>
      </div>

      {/* Bilan unique : collecté / objectif, progression, reste, puis
          indicateurs secondaires sur une ligne (plus de tuile "Objectif"
          en doublon ni de 4 cartes KPI). */}
      <GoalProgressCard
        compact
        label="Collecté"
        stats={stats}
        footer={
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <span className="font-semibold text-foreground">{stats.contributorsCount}</span> cotisant
              {stats.contributorsCount > 1 ? "s" : ""} · {stats.entriesCount} entrée{stats.entriesCount > 1 ? "s" : ""}
            </span>
            <span>
              Moy. <span className="font-semibold text-foreground">{formatFCFA(stats.averageAmount)}</span>
            </span>
            {stats.maxContribution && (
              <span>
                Max <span className="font-semibold text-foreground">{formatFCFA(stats.maxContribution.amount)}</span>
              </span>
            )}
          </div>
        }
      />

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
            {(cagnotte.status === "draft" || isSuperAdmin) && (
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
        title="Supprimer définitivement cette cagnotte ?"
        description={`« ${cagnotte.title} » et ses ${stats.entriesCount} cotisation(s) (${formatFCFA(stats.totalCollected)}) seront supprimées. Action irréversible.`}
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
