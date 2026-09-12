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
}: {
  stats: Pick<CagnotteStats, "goalAmount" | "totalCollected" | "progressPct" | "isGoalReached" | "surplus" | "remaining">;
  label?: string;
  noGoalLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums text-foreground">{formatFCFA(stats.totalCollected)}</p>

      {stats.goalAmount > 0 ? (
        <>
          <p className="text-sm text-muted">sur {formatFCFA(stats.goalAmount)}</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar pct={stats.progressPct} goalReached={stats.isGoalReached} size="lg" />
            </div>
            <span className={`flex-shrink-0 text-sm font-bold ${stats.isGoalReached ? "text-success" : "text-primary"}`}>
              {formatPct(stats.progressPct)}
            </span>
          </div>
          <p className="mt-3 text-sm">
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
    </div>
  );
}
