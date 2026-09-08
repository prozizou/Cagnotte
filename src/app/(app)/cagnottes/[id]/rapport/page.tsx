"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileDown, FileSpreadsheet, Share2, List } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { subscribeCagnotte } from "@/lib/data/cagnottes";
import { subscribeCotisations } from "@/lib/data/cotisations";
import { Cagnotte, Cotisation } from "@/lib/types";
import { computeCagnotteStats } from "@/lib/stats";
import { groupByPeriod, cumulativeSeries, Granularity } from "@/lib/reports/aggregate";
import { KPICard } from "@/components/ui/KPICard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatFCFA, formatPct } from "@/lib/format";
import { generateBilanPDF } from "@/lib/reports/pdf";
import { generateBilanExcel } from "@/lib/reports/excel";
import { buildBilanMessage, buildDetailedListMessage, whatsAppShareUrl } from "@/lib/whatsapp";
import { Target, Coins, Users, TrendingUp } from "lucide-react";

const GRANULARITIES: Array<{ value: Granularity; label: string }> = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
];

export default function CagnotteRapportPage() {
  const { id } = useParams<{ id: string }>();
  const [cagnotte, setCagnotte] = useState<Cagnotte | null | undefined>(undefined);
  const [cotisations, setCotisations] = useState<Cotisation[]>([]);
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  useEffect(() => subscribeCagnotte(id, setCagnotte), [id]);
  useEffect(() => subscribeCotisations(id, setCotisations), [id]);

  const stats = useMemo(() => computeCagnotteStats(cotisations, cagnotte?.goalAmount || 0), [cotisations, cagnotte]);
  const cumulative = useMemo(() => cumulativeSeries(cotisations), [cotisations]);
  const periodData = useMemo(() => groupByPeriod(cotisations, granularity), [cotisations, granularity]);

  if (cagnotte === undefined) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-6 w-32" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }
  if (cagnotte === null) return <p className="text-sm text-muted">Cagnotte introuvable.</p>;

  async function handleExportPDF() {
    if (!cagnotte) return;
    setExporting("pdf");
    try {
      generateBilanPDF(cagnotte, stats, cotisations);
      toast.success("PDF généré ✔");
    } catch {
      toast.error("Échec de la génération du PDF.");
    } finally {
      setExporting(null);
    }
  }

  async function handleExportExcel() {
    if (!cagnotte) return;
    setExporting("excel");
    try {
      await generateBilanExcel(cagnotte, stats, cotisations);
      toast.success("Excel généré ✔");
    } catch {
      toast.error("Échec de la génération du fichier Excel.");
    } finally {
      setExporting(null);
    }
  }

  function handleShareBilan() {
    if (!cagnotte) return;
    window.open(whatsAppShareUrl(buildBilanMessage(cagnotte, stats)), "_blank", "noopener");
  }

  function handleShareList() {
    if (!cagnotte) return;
    window.open(whatsAppShareUrl(buildDetailedListMessage(cagnotte, cotisations)), "_blank", "noopener");
  }

  return (
    <div className="space-y-5">
      <Link href={`/cagnottes/${id}`} className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft size={16} /> {cagnotte.title}
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Rapport & Bilan</h1>
          <p className="text-sm text-muted">{cagnotte.title}</p>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <button
            onClick={handleShareBilan}
            className="flex items-center gap-1.5 rounded-xl bg-whatsapp px-3.5 py-2 text-sm font-semibold text-white hover:bg-whatsapp-dark"
          >
            <Share2 size={15} /> Bilan
          </button>
          <button
            onClick={handleShareList}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted-soft"
          >
            <List size={15} /> Liste détaillée
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting !== null}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted-soft disabled:opacity-60"
          >
            <FileDown size={15} /> PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting !== null}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted-soft disabled:opacity-60"
          >
            <FileSpreadsheet size={15} /> Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard icon={Target} label="Objectif" value={cagnotte.goalAmount > 0 ? formatFCFA(cagnotte.goalAmount) : "—"} />
        <KPICard icon={Coins} label="Collecté" value={formatFCFA(stats.totalCollected)} tone="success" />
        <KPICard icon={TrendingUp} label="Progression" value={cagnotte.goalAmount > 0 ? formatPct(stats.progressPct) : "—"} tone="primary" />
        <KPICard icon={Users} label="Cotisants" value={String(stats.contributorsCount)} />
      </div>

      {cagnotte.goalAmount > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <ProgressBar pct={stats.progressPct} goalReached={stats.isGoalReached} />
          <p className="mt-2 text-xs text-muted">
            {formatFCFA(stats.totalCollected)} / {formatFCFA(stats.goalAmount)} · reste {formatFCFA(stats.remaining)}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Évolution du montant collecté (cumulé)</h2>
        {cumulative.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">Aucune cotisation enregistrée pour le moment.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={cumulative} margin={{ left: -18, right: 8 }}>
              <defs>
                <linearGradient id="fillCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4338ca" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4338ca" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => Number(v).toLocaleString("fr-FR")} />
              <Tooltip formatter={(v) => formatFCFA(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Area type="monotone" dataKey="cumulative" stroke="#4338ca" strokeWidth={2.5} fill="url(#fillCumulative)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Cotisations par période</h2>
          <div className="flex gap-1 no-print">
            {GRANULARITIES.map((g) => (
              <button
                key={g.value}
                onClick={() => setGranularity(g.value)}
                className={clsx(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  granularity === g.value ? "bg-primary text-white" : "bg-muted-soft text-muted"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        {periodData.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">Aucune donnée à afficher.</p>
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={periodData} margin={{ left: -18, right: 8 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => Number(v).toLocaleString("fr-FR")} />
              <Tooltip formatter={(v) => formatFCFA(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="total" fill="#16a34a" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
