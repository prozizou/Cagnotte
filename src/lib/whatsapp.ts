import { Cagnotte, CagnotteStats, Cotisation } from "@/lib/types";
import { formatFCFA, formatPct, phoneToWhatsAppDigits } from "@/lib/format";

export function buildBilanMessage(cagnotte: Cagnotte, stats: CagnotteStats): string {
  const lines: string[] = [];
  lines.push(`*CAGNOTTE — ${cagnotte.title.toUpperCase()}*`);
  lines.push("");
  if (cagnotte.goalAmount > 0) {
    lines.push(`🎯 Objectif : *${formatFCFA(stats.goalAmount)}*`);
    lines.push(`💰 Collecté : *${formatFCFA(stats.totalCollected)}*`);
    if (stats.isGoalReached) {
      lines.push(`✅ Objectif atteint${stats.surplus > 0 ? ` — Excédent : +${formatFCFA(stats.surplus)}` : ""}`);
    } else {
      lines.push(`📉 Reste : *${formatFCFA(stats.remaining)}*`);
    }
    lines.push(`📊 Progression : *${formatPct(stats.progressPct)}*`);
  } else {
    lines.push(`💰 Total collecté : *${formatFCFA(stats.totalCollected)}*`);
  }
  lines.push(`👥 Nombre de cotisants : *${stats.contributorsCount}*`);
  lines.push("");
  lines.push("🙏 Merci à toutes les personnes ayant participé.");
  return lines.join("\n");
}

export function buildDetailedListMessage(cagnotte: Cagnotte, cotisations: Cotisation[]): string {
  const lines: string[] = [];
  lines.push(`*Liste des cotisations — ${cagnotte.title}*`);
  lines.push("");
  if (cotisations.length === 0) {
    lines.push("_Aucune cotisation enregistrée._");
  } else {
    cotisations.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name} — ${formatFCFA(c.amount)}`);
    });
  }
  return lines.join("\n");
}

export function whatsAppShareUrl(message: string): string {
  return "https://wa.me/?text=" + encodeURIComponent(message);
}

export function whatsAppContactUrl(phone: string, message?: string): string {
  const digits = phoneToWhatsAppDigits(phone);
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
