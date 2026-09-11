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

export type EvolutionPeriod = "7j" | "30j" | "year" | "all";

export interface EvolutionPoint {
  key: string;
  label: string;
  amount: number;
  cumulative: number;
}

function dayLabel(key: string): string {
  return new Date(key + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function monthLabel(key: string): string {
  return new Date(key + "-01T00:00:00").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

/**
 * Série temporelle des montants collectés, pour la courbe d'évolution du
 * tableau de bord. "7j"/"30j" : un point par jour (les jours sans
 * cotisation valent 0, pour un tracé continu). "year" : un point par mois
 * de l'année en cours. "all" : un point par mois depuis la toute première
 * cotisation. `cumulative` repart de zéro au début de la période affichée
 * (et non depuis l'origine des temps), pour rester lisible quelle que soit
 * la période choisie.
 */
export function buildEvolutionSeries(cotisations: Cotisation[], period: EvolutionPeriod): EvolutionPoint[] {
  const now = new Date();
  const granularity: "day" | "month" = period === "7j" || period === "30j" ? "day" : "month";

  const sums = new Map<string, number>();
  for (const c of cotisations) {
    const key = granularity === "day" ? c.date : c.date.slice(0, 7);
    sums.set(key, (sums.get(key) || 0) + (c.amount || 0));
  }

  const points: { key: string; amount: number }[] = [];

  if (granularity === "day") {
    const span = period === "7j" ? 6 : 29;
    for (let i = span; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      points.push({ key, amount: sums.get(key) || 0 });
    }
  } else {
    let startYear: number;
    let startMonth: number;
    if (period === "year") {
      startYear = now.getFullYear();
      startMonth = 0;
    } else {
      const earliestKey = [...sums.keys()].sort()[0];
      if (!earliestKey) return [];
      startYear = Number(earliestKey.slice(0, 4));
      startMonth = Number(earliestKey.slice(5, 7)) - 1;
    }
    const cursor = new Date(startYear, startMonth, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      points.push({ key, amount: sums.get(key) || 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  let running = 0;
  return points.map((p) => {
    running += p.amount;
    return {
      key: p.key,
      label: granularity === "day" ? dayLabel(p.key) : monthLabel(p.key),
      amount: p.amount,
      cumulative: running,
    };
  });
}
