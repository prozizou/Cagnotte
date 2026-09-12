import ExcelJS from "exceljs";
import { Cagnotte, CagnotteStats, Cotisation } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { APP_NAME } from "@/lib/constants";

export async function generateBilanExcel(cagnotte: Cagnotte, stats: CagnotteStats, cotisations: Cotisation[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = APP_NAME;
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Bilan");
  summary.columns = [
    { header: "Indicateur", key: "label", width: 28 },
    { header: "Valeur", key: "value", width: 24 },
  ];
  summary.getRow(1).font = { bold: true };
  summary.addRows([
    { label: "Cagnotte", value: cagnotte.title },
    { label: "Période", value: `${formatDate(cagnotte.startDate)} → ${cagnotte.endDate ? formatDate(cagnotte.endDate) : "indéterminée"}` },
    { label: "Statut", value: cagnotte.status },
    { label: "Objectif (F CFA)", value: cagnotte.goalAmount || 0 },
    { label: "Total collecté (F CFA)", value: stats.totalCollected },
    { label: "Montant restant (F CFA)", value: stats.remaining },
    { label: "Progression (%)", value: Math.round(stats.progressPct * 10) / 10 },
    { label: "Nombre de cotisants", value: stats.contributorsCount },
    { label: "Nombre d'entrées", value: stats.entriesCount },
    { label: "Montant moyen (F CFA)", value: Math.round(stats.averageAmount) },
    { label: "Plus forte cotisation (F CFA)", value: stats.maxContribution?.amount || 0 },
    { label: "Date de génération", value: new Date().toLocaleString("fr-FR") },
  ]);

  const detail = workbook.addWorksheet("Cotisations");
  detail.columns = [
    { header: "Cotisant", key: "name", width: 26 },
    { header: "Montant (F CFA)", key: "amount", width: 18 },
    { header: "Date", key: "date", width: 14 },
    { header: "Commentaire", key: "comment", width: 32 },
  ];
  detail.getRow(1).font = { bold: true };
  detail.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
  cotisations
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((c) => {
      detail.addRow({ name: c.name, amount: c.amount, date: formatDate(c.date), comment: c.comment || "" });
    });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bilan-${slugify(cagnotte.title)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
