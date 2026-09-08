import { Cotisation } from "@/lib/types";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export type Granularity = "day" | "week" | "month";

export interface PeriodPoint {
  key: string;
  label: string;
  total: number;
}

export function groupByPeriod(cotisations: Cotisation[], granularity: Granularity): PeriodPoint[] {
  const buckets = new Map<string, { label: string; total: number; sortKey: string }>();

  for (const c of cotisations) {
    const d = new Date(c.date + "T00:00:00");
    if (Number.isNaN(d.getTime())) continue;
    let key: string;
    let label: string;
    if (granularity === "day") {
      key = c.date;
      label = format(d, "dd MMM", { locale: fr });
    } else if (granularity === "week") {
      const weekStart = startOfWeek(d, { weekStartsOn: 1 });
      key = format(weekStart, "yyyy-MM-dd");
      label = "Sem. du " + format(weekStart, "dd MMM", { locale: fr });
    } else {
      const monthStart = startOfMonth(d);
      key = format(monthStart, "yyyy-MM");
      label = format(monthStart, "MMM yyyy", { locale: fr });
    }
    const existing = buckets.get(key);
    if (existing) {
      existing.total += c.amount;
    } else {
      buckets.set(key, { label, total: c.amount, sortKey: key });
    }
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
    .map(([key, v]) => ({ key, label: v.label, total: v.total }));
}

export interface CumulativePoint {
  date: string;
  label: string;
  cumulative: number;
}

export function cumulativeSeries(cotisations: Cotisation[]): CumulativePoint[] {
  const dailyTotals = new Map<string, number>();
  for (const c of cotisations) {
    dailyTotals.set(c.date, (dailyTotals.get(c.date) || 0) + c.amount);
  }
  let running = 0;
  const dates = Array.from(dailyTotals.keys()).sort();
  return dates.map((date) => {
    running += dailyTotals.get(date) || 0;
    return {
      date,
      label: format(new Date(date + "T00:00:00"), "dd MMM", { locale: fr }),
      cumulative: running,
    };
  });
}
