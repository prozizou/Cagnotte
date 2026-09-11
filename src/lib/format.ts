import { Millis } from "./types";

export function formatFCFA(amount: number): string {
  const rounded = Math.round(amount || 0);
  return rounded.toLocaleString("fr-FR").replace(/ /g, " ") + " F CFA";
}

export function formatFCFAShort(amount: number): string {
  const rounded = Math.round(amount || 0);
  return rounded.toLocaleString("fr-FR").replace(/ /g, " ") + " F";
}

export function formatPct(pct: number): string {
  return (Math.round(pct * 10) / 10).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + " %";
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(ts: Millis | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T00:00:00");
  const to = new Date(toISO + "T00:00:00");
  return Math.ceil((to.getTime() - from.getTime()) / 86400000);
}

/** Nettoie une chaîne de caractères d'un numéro de téléphone pour un lien wa.me (format international, chiffres uniquement). */
export function phoneToWhatsAppDigits(phone: string, defaultCountryCode = "221"): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.length <= 9) return defaultCountryCode + digits.replace(/^0+/, "");
  return digits;
}
