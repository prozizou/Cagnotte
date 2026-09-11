import { Cotisation, CagnotteStats } from "./types";

/**
 * Calcule tous les indicateurs d'une cagnotte à partir de la liste
 * (fiable, provenant directement de Realtime Database) de ses cotisations.
 * Aucune valeur n'est stockée séparément : le total affiché correspond
 * toujours exactement à la somme des cotisations enregistrées.
 */
export function computeCagnotteStats(cotisations: Cotisation[], goalAmount: number): CagnotteStats {
  const totalCollected = cotisations.reduce((sum, c) => sum + (c.amount || 0), 0);
  const remaining = Math.max(0, goalAmount - totalCollected);
  const progressPct = goalAmount > 0 ? Math.min(100, (totalCollected / goalAmount) * 100) : 0;
  const isGoalReached = goalAmount > 0 && totalCollected >= goalAmount;
  const surplus = isGoalReached ? totalCollected - goalAmount : 0;

  const uniqueNames = new Set(cotisations.map((c) => c.name.trim().toLowerCase()).filter(Boolean));

  let maxContribution: Cotisation | null = null;
  let lastContribution: Cotisation | null = null;
  for (const c of cotisations) {
    if (!maxContribution || c.amount > maxContribution.amount) maxContribution = c;
    if (!lastContribution || compareCreatedAt(c, lastContribution) > 0) lastContribution = c;
  }

  return {
    goalAmount,
    totalCollected,
    remaining,
    progressPct,
    contributorsCount: uniqueNames.size,
    entriesCount: cotisations.length,
    averageAmount: cotisations.length > 0 ? totalCollected / cotisations.length : 0,
    maxContribution,
    lastContribution,
    isGoalReached,
    surplus,
  };
}

function compareCreatedAt(a: Cotisation, b: Cotisation): number {
  const aMs = a.createdAt ?? new Date(a.date).getTime();
  const bMs = b.createdAt ?? new Date(b.date).getTime();
  return aMs - bMs;
}
