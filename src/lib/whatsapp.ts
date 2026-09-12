import { Cagnotte, CagnotteStats, CagnotteStatus, Cotisation } from "@/lib/types";
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

// La liste reçue par buildGroupShareMessage est généralement déjà triée
// (la fiche cagnotte affiche les cotisations les plus récentes en premier),
// mais l'annonce de groupe doit lister les dons du plus ancien au plus
// récent. On trie ici sur le champ "date" (la date de la cotisation,
// saisie par l'utilisateur — présente sur chaque nœud Firebase), et non sur
// createdAt : createdAt reflète le moment d'écriture en base, qui n'a rien
// à voir avec la chronologie réelle des dons pour des cotisations
// importées ou saisies après coup (toutes écrites à peu près au même
// moment, sans rapport avec leur date réelle).
function sortByDateAsc(list: Cotisation[]): Cotisation[] {
  return [...list].sort((a, b) => a.date.localeCompare(b.date));
}

// Formulation dédiée à l'annonce de groupe (buildGroupShareMessage) :
// volontairement plus explicite que CAGNOTTE_STATUS_LABELS (qui sert aux
// badges de l'interface), pour donner d'un coup d'œil l'état de la collecte
// dans un message WhatsApp.
const GROUP_STATUS_LABEL: Record<CagnotteStatus, string> = {
  draft: "🆕 Brouillon",
  active: "🔄 Collecte en cours",
  completed: "✅ Collecte terminée",
  archived: "📦 Cagnotte archivée",
};

/**
 * Message "à envoyer dans le groupe" : une seule annonce prête à partager
 * qui reprend, dans l'ordre, le titre, le statut, les contacts (numéros où
 * envoyer les contributions), le bilan chiffré et la liste nominative des
 * dons — le tout pensé pour accompagner l'image de couverture lors du
 * partage (voir handleShareGroup dans la fiche cagnotte), à la manière
 * d'une affiche complète postée dans un groupe WhatsApp.
 */
export function buildGroupShareMessage(cagnotte: Cagnotte, stats: CagnotteStats, cotisations: Cotisation[]): string {
  const lines: string[] = [];
  lines.push(`*${cagnotte.title}*`);
  if (cagnotte.description?.trim()) {
    lines.push("");
    lines.push(cagnotte.description.trim());
  }
  lines.push("");
  lines.push(GROUP_STATUS_LABEL[cagnotte.status]);
  lines.push("");

  if (cagnotte.contacts.length > 0) {
    lines.push("Merci de contribuer aux numéros ci-dessous :");
    lines.push("");
    cagnotte.contacts.forEach((c) => {
      lines.push(`• *${c.name}* : ${c.phone}`);
    });
    lines.push("");
  }

  lines.push(`💰 Total collecté : *${formatFCFA(stats.totalCollected)}*`);
  lines.push(`👥 Nombre de contributeurs : *${stats.contributorsCount}*`);
  lines.push("");

  lines.push("📋 Liste des dons :");
  if (cotisations.length === 0) {
    lines.push("_Aucune cotisation enregistrée._");
  } else {
    sortByDateAsc(cotisations).forEach((c, i) => {
      lines.push(`${i + 1} - ${c.name} : ${formatFCFA(c.amount)}`);
    });
  }
  lines.push("");
  lines.push("🙏 Merci à toutes les personnes ayant participé.");

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
