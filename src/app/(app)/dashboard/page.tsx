"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { Wallet, CheckCircle2, Coins, Users, Plus, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCagnottes } from "@/hooks/useCagnottes";
import { useOwnerCotisations } from "@/hooks/useOwnerCotisations";
import { KPICard, KPICardSkeleton } from "@/components/ui/KPICard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CagnotteStatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatFCFA, formatDateTime } from "@/lib/format";
import { subscribeHistoryForOwner } from "@/lib/data/history";
import { HistoryEntry } from "@/lib/types";
import { HistoryIcon } from "@/components/history/HistoryIcon";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const { profile, firebaseUser } = useAuth();
  const { cagnottes, loading: loadingCagnottes } = useCagnottes();
  const { cotisations, loading: loadingCotisations } = useOwnerCotisations();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeHistoryForOwner(firebaseUser.uid, setHistory, 8);
  }, [firebaseUser]);

  const stats = useMemo(() => {
    const active = cagnottes.filter((c) => c.status === "active").length;
    const completed = cagnottes.filter((c) => c.status === "completed").length;
    const total = cotisations.reduce((s, c) => s + (c.amount || 0), 0);
    const uniqueNames = new Set(cotisations.map((c) => c.name.trim().toLowerCase()).filter(Boolean));
    return { active, completed, total, contributors: uniqueNames.size };
  }, [cagnottes, cotisations]);

  const chartData = useMemo(() => {
    const byId = new Map(cagnottes.map((c) => [c.id, { title: c.title, total: 0 }]));
    for (const c of cotisations) {
      const entry = byId.get(c.cagnotteId);
      if (entry) entry.total += c.amount || 0;
    }
    return Array.from(byId.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
      .map((e) => ({ name: e.title.length > 14 ? e.title.slice(0, 13) + "…" : e.title, total: e.total }));
  }, [cagnottes, cotisations]);

  const loading = loadingCagnottes || loadingCotisations;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            Bonjour {profile?.displayName?.split(" ")[0] || ""} 👋
          </h1>
          <p className="text-sm text-muted">Voici un aperçu de vos cagnottes.</p>
        </div>
        <Link
          href="/cagnottes/new"
          className="hidden items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark sm:flex"
        >
          <Plus size={16} /> Nouvelle cagnotte
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : (
          <>
            <KPICard icon={Wallet} label="Cagnottes" value={String(cagnottes.length)} tone="primary" />
            <KPICard icon={CheckCircle2} label="Actives" value={String(stats.active)} tone="success" hint={`${stats.completed} terminée(s)`} />
            <KPICard icon={Coins} label="Total collecté" value={formatFCFA(stats.total)} tone="warning" />
            <KPICard icon={Users} label="Cotisants" value={String(stats.contributors)} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Cagnottes les plus collectées</h2>
          </div>
          {loading ? (
            <div className="skeleton h-56 w-full" />
          ) : chartData.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">Aucune donnée pour le moment.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={chartData} margin={{ left: -18, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => Number(v).toLocaleString("fr-FR")} />
                <Tooltip formatter={(v) => formatFCFA(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="total" fill="#4338ca" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Dernières activités</h2>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Rien à signaler pour l&apos;instant.</p>
          ) : (
            <ul className="space-y-3.5">
              {history.map((h) => (
                <li key={h.id} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <HistoryIcon type={h.type} size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{h.description}</p>
                    <p className="text-[11px] text-muted">{formatDateTime(h.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Mes cagnottes récentes</h2>
          <Link href="/cagnottes" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Tout voir <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-32 rounded-2xl" />
            ))}
          </div>
        ) : cagnottes.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Aucune cagnotte pour le moment"
            description="Créez votre première cagnotte pour commencer à enregistrer des cotisations."
            action={
              <Link href="/cagnottes/new" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
                <Plus size={16} /> Nouvelle cagnotte
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cagnottes.slice(0, 6).map((c) => {
              const total = cotisations.filter((x) => x.cagnotteId === c.id).reduce((s, x) => s + x.amount, 0);
              const pct = c.goalAmount > 0 ? Math.min(100, (total / c.goalAmount) * 100) : 0;
              return (
                <Link
                  key={c.id}
                  href={`/cagnottes/${c.id}`}
                  className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground">{c.title}</h3>
                    <CagnotteStatusBadge status={c.status} />
                  </div>
                  <p className="mt-2 text-xs text-muted">{formatFCFA(total)} collecté{c.goalAmount ? ` sur ${formatFCFA(c.goalAmount)}` : ""}</p>
                  {c.goalAmount > 0 && (
                    <div className="mt-2.5">
                      <ProgressBar pct={pct} size="sm" />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
