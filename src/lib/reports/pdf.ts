import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Cagnotte, CagnotteStats, Cotisation } from "@/lib/types";
import { formatFCFA, formatPct, formatDate } from "@/lib/format";
import { APP_NAME } from "@/lib/constants";

export function generateBilanPDF(cagnotte: Cagnotte, stats: CagnotteStats, cotisations: Cotisation[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  let y = 50;

  doc.setFillColor(67, 56, 202);
  doc.rect(0, 0, 595, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(cagnotte.title, marginX, 40);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Période : ${formatDate(cagnotte.startDate)} → ${cagnotte.endDate ? formatDate(cagnotte.endDate) : "indéterminée"}`,
    marginX,
    60
  );
  doc.text(`Rapport généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`, marginX, 76);

  y = 120;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Bilan financier", marginX, y);
  y += 20;

  const kpis: [string, string][] = [
    ["Objectif", cagnotte.goalAmount > 0 ? formatFCFA(stats.goalAmount) : "Non défini"],
    ["Total collecté", formatFCFA(stats.totalCollected)],
    ["Montant restant", cagnotte.goalAmount > 0 ? formatFCFA(stats.remaining) : "—"],
    ["Progression", cagnotte.goalAmount > 0 ? formatPct(stats.progressPct) : "—"],
    ["Nombre de cotisants", String(stats.contributorsCount)],
    ["Nombre d'entrées", String(stats.entriesCount)],
    ["Montant moyen", formatFCFA(stats.averageAmount)],
    ["Plus forte cotisation", stats.maxContribution ? `${formatFCFA(stats.maxContribution.amount)} (${stats.maxContribution.name})` : "—"],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 180 } },
    body: kpis,
    didParseCell: (data) => {
      if (data.row.index % 2 === 0) data.cell.styles.fillColor = [241, 245, 249];
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 30;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Détail des cotisations", marginX, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["#", "Cotisant", "Montant", "Date", "Commentaire"]],
    body: cotisations
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((c, i) => [String(i + 1), c.name, formatFCFA(c.amount), formatDate(c.date), c.comment || "—"]),
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${APP_NAME} — Bilan « ${cagnotte.title} » · Page ${i}/${pageCount}`, marginX, 820);
  }

  doc.save(`bilan-${slugify(cagnotte.title)}.pdf`);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
