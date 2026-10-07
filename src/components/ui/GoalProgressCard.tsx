import type { ReactNode } from "react";
import { CagnotteStats } from "@/lib/types";
import { formatFCFA, formatPct } from "@/lib/format";
import { ProgressBar } from "./ProgressBar";

/**
 * Carte "objectif & progression", partagée par le tableau de bord, la fiche
 * cagnotte et la page Cotisations globale — ces trois écrans affichaient
 * chacun leur propre copie de ce bloc. Empilée verticalement (libellé →
 * montant → objectif → barre → reste) plutôt qu'en ligne : un montant
 * collecté à 7-8 chiffres + "collecté sur X F CFA" sur une seule ligne
 * débordait horizontalement sur mobile.
 */
export function GoalProgressCard({
  stats,
  label = "Objectif",
  noGoalLabel = "collecté",
  compact = false,
  footer,
}: {
  stats: Pick<CagnotteStats, "goalAmount" | "totalCollected" | "progressPct" | "isGoalReached" | "surplus" | "remaining">;
  label?: string;
  noGoalLabel?: string;
  /** Version dense (fiche cagnotte mobile) : moins de marges, montant plus petit. */
  compact?: boolean;
  /** Ligne d'infos secondaires (cotisants, moyenne…) ajoutée sous la barre. */
  footer?: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-surface shadow-sm ${compact ? "p-4" : "p-5"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 font-extrabold tabular-nums text-foreground ${compact ? "text-2xl" : "text-3xl"}`}>
        {formatFCFA(stats.totalCollected)}
        {compact && stats.goalAmount > 0 && (
          <span className="ml-1.5 text-sm font-normal text-muted">/ {formatFCFA(stats.goalAmount)}</span>
        )}
      </p>

      {stats.goalAmount > 0 ? (
        <>
          {!compact && <p className="text-sm text-muted">sur {formatFCFA(stats.goalAmount)}</p>}
          <div className={`flex items-center gap-3 ${compact ? "mt-2" : "mt-4"}`}>
            <div className="flex-1">
              <ProgressBar pct={stats.progressPct} goalReached={stats.isGoalReached} size={compact ? "md" : "lg"} />
            </div>
            <span className={`flex-shrink-0 text-sm font-bold ${stats.isGoalReached ? "text-success" : "text-primary"}`}>
              {formatPct(stats.progressPct)}
            </span>
          </div>
          <p className={`text-sm ${compact ? "mt-2" : "mt-3"}`}>
            {stats.isGoalReached ? (
              <span className="font-semibold text-success">
                🎉 Objectif atteint{stats.surplus > 0 && ` — Excédent : +${formatFCFA(stats.surplus)}`}
              </span>
            ) : (
              <span className="text-muted">
                <span className="font-semibold text-foreground">{formatFCFA(stats.remaining)}</span> restants
              </span>
            )}
          </p>
        </>
      ) : (
        <p className="text-xs text-muted">{noGoalLabel} · aucun objectif défini</p>
      )}
      {footer && <div className="mt-2.5 border-t border-line pt-2.5 text-xs text-muted">{footer}</div>}
    </div>
  );
}
