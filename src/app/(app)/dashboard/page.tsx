"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { Wallet, CheckCircle2, TrendingUp, Users, Plus, ArrowRight, UserCheck, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCagnottes } from "@/hooks/useCagnottes";
import { useOwnerCotisations } from "@/hooks/useOwnerCotisations";
import { usePendingUsersCount } from "@/hooks/usePendingUsersCount";
import { KPICard, KPICardSkeleton } from "@/components/ui/KPICard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CagnotteStatusBadge, UserStatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { GoalProgressCard } from "@/components/ui/GoalProgressCard";
import { formatFCFA, formatPct } from "@/lib/format";
import { computeCagnotteStats, buildEvolutionSeries, EvolutionPeriod } from "@/lib/stats";
import { subscribeAllUsers } from "@/lib/data/users";
import { UserProfile } from "@/lib/types";
import clsx from "clsx";
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const EVOLUTION_PERIODS: Array<{ value: EvolutionPeriod; label: string }> = [
  { value: "7j", label: "7 jours" },
  { value: "30j", label: "30 jours" },
  { value: "year", label: "Cette année" },
  { value: "all", label: "Tout" },
];

export default function DashboardPage() {
  const { profile, isSuperAdmin } = useAuth();
  const { cagnottes, loading: loadingCagnottes } = useCagnottes();
  const { cotisations, loading: loadingCotisations } = useOwnerCotisations();
  const pendingUsersCount = usePendingUsersCount();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [period, setPeriod] = useState<EvolutionPeriod>("30j");

  useEffect(() => {
    if (!isSuperAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingUsers(true);
    return subscribeAllUsers((list) => {
      setUsers(list);
      setLoadingUsers(false);
    });
  }, [isSuperAdmin]);

  const stats = useMemo(() => {
    const active = cagnottes.filter((c) => c.status === "active").length;
    const completed = cagnottes.filter((c) => c.status === "completed").length;
    const total = cotisations.reduce((s, c) => s + (c.amount || 0), 0);
    const uniqueNames = new Set(cotisations.map((c) => c.name.trim().toLowerCase()).filter(Boolean));
    const averageAmount = cotisations.length > 0 ? total / cotisations.length : 0;
    return { active, completed, total, contributors: uniqueNames.size, averageAmount };
  }, [cagnottes, cotisations]);

  const goalStats = useMemo(() => {
    const totalGoal = cagnottes.reduce((s, c) => s + (c.goalAmount || 0), 0);
    return computeCagnotteStats(cotisations, totalGoal);
  }, [cagnottes, cotisations]);

  const evolutionData = useMemo(() => buildEvolutionSeries(cotisations, period), [cotisations, period]);

  // Classement des cagnottes par montant collecté — base commune pour le
  // classement compact (peu de cagnottes) et l'histogramme (plusieurs
  // cagnottes) ci-dessous.
  const rankedCagnottes = useMemo(() => {
    const byId = new Map(cagnottes.map((c) => [c.id, { id: c.id, title: c.title, goalAmount: c.goalAmount || 0, total: 0 }]));
    for (const c of cotisations) {
      const entry = byId.get(c.cagnotteId);
      if (entry) entry.total += c.amount || 0;
    }
    return Array.from(byId.values()).sort((a, b) => b.total - a.total);
  }, [cagnottes, cotisations]);

  const chartData = useMemo(
    () =>
      rankedCagnottes
        .slice(0, 6)
        .map((e) => ({ name: e.title.length > 14 ? e.title.slice(0, 13) + "…" : e.title, total: e.total })),
    [rankedCagnottes]
  );

  const loading = loadingCagnottes || loadingCotisations;

  const cagnotteCountByOwner = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cagnottes) map.set(c.ownerId, (map.get(c.ownerId) || 0) + 1);
    return map;
  }, [cagnottes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            Bonjour {profile?.displayName?.split(" ")[0] || ""} 👋
          </h1>
          <p className="text-sm text-muted">
            {isSuperAdmin ? "Voici l'état de la plateforme aujourd'hui." : "Voici l'état de vos cagnottes aujourd'hui."}
          </p>
        </div>
        <Link
          href="/cagnottes/new"
          className="hidden items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark sm:flex"
        >
          <Plus size={16} /> Nouvelle cagnotte
        </Link>
      </div>

      {isSuperAdmin && pendingUsersCount > 0 && (
        <Link
          href="/utilisateurs"
          className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3.5 text-sm shadow-sm transition hover:border-warning/50"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-warning">
            <UserCheck size={17} />
          </span>
          <span className="flex-1 font-medium text-foreground">
            {pendingUsersCount} demande{pendingUsersCount > 1 ? "s" : ""} d&apos;accès en attente d&apos;autorisation
          </span>
          <span className="flex-shrink-0 text-xs font-semibold text-warning">Gérer →</span>
        </Link>
      )}

      {/* Objectif global & progression */}
      {loading ? (
        <div className="skeleton h-28 w-full rounded-2xl" />
      ) : (
        <GoalProgressCard stats={goalStats} label="Objectif global" noGoalLabel="collecté au total" />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : (
          <>
            <KPICard icon={Wallet} label="Cagnottes" value={String(cagnottes.length)} tone="primary" />
            <KPICard icon={CheckCircle2} label="Actives" value={String(stats.active)} tone="success" hint={`${stats.completed} terminée(s)`} />
            <KPICard icon={Users} label="Cotisants" value={String(stats.contributors)} />
            <KPICard icon={TrendingUp} label="Cotisation moyenne" value={formatFCFA(stats.averageAmount)} tone="warning" />
          </>
        )}
      </div>

      {/* Évolution des montants collectés */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Évolution des montants collectés</h2>
          <div className="flex gap-1.5">
            {EVOLUTION_PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={clsx(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  period === p.value ? "bg-primary text-white" : "bg-muted-soft text-muted hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="skeleton h-56 w-full" />
        ) : evolutionData.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">Aucune donnée pour cette période.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={evolutionData} margin={{ left: -18, right: 8 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => Number(v).toLocaleString("fr-FR")} />
              <Tooltip
                formatter={(v, name) => [formatFCFA(Number(v)), name === "cumulative" ? "Cumulé" : "Collecté"]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Bar dataKey="amount" fill="#bbf7d0" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Line type="monotone" dataKey="cumulative" stroke="#166534" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Cagnottes les plus collectées</h2>
        </div>
        {loading ? (
          <div className="skeleton h-40 w-full" />
        ) : rankedCagnottes.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">Aucune donnée pour le moment.</p>
        ) : rankedCagnottes.length <= 3 ? (
          // Avec peu de cagnottes, un histogramme apporte peu d'information
          // (souvent une seule grande barre presque vide) et tronque les
          // titres longs sur l'axe — un classement compact est plus lisible.
          // Le graphique reprend automatiquement le dessus dès qu'il y a
          // suffisamment de cagnottes à comparer.
          <div className="space-y-4">
            {rankedCagnottes.map((c) => {
              const pct = c.goalAmount > 0 ? Math.min(100, (c.total / c.goalAmount) * 100) : 0;
              return (
                <div key={c.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
                    <p className="flex-shrink-0 text-sm font-bold tabular-nums text-foreground">{formatFCFA(c.total)}</p>
                  </div>
                  {c.goalAmount > 0 && (
                    <>
                      <div className="mt-1.5">
                        <ProgressBar pct={pct} size="sm" />
                      </div>
                      <p className="mt-1 text-xs text-muted">{formatPct(pct)} de l&apos;objectif</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ left: -18, right: 8 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => Number(v).toLocaleString("fr-FR")} />
              <Tooltip formatter={(v) => formatFCFA(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="total" fill="#166534" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {isSuperAdmin ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Utilisateurs</h2>
            <Link href="/utilisateurs" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Tout voir <ArrowRight size={13} />
            </Link>
          </div>

          {loadingUsers ? (
            <div className="skeleton h-64 w-full rounded-2xl" />
          ) : users.length === 0 ? (
            <EmptyState icon={UsersIcon} title="Aucun utilisateur" description="Personne ne s'est encore connecté à l'application." />
          ) : (
            <div className="space-y-2">
              {users.slice(0, 8).map((u) => {
                const count = cagnotteCountByOwner.get(u.uid) || 0;
                return (
                  <Link
                    key={u.uid}
                    href={`/utilisateurs/${u.uid}`}
                    className="block rounded-2xl border border-line bg-surface p-3.5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      {u.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.photoURL} alt="" className="h-10 w-10 flex-shrink-0 rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                          {u.displayName?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{u.displayName}</p>
                        <p className="truncate text-xs text-muted">{u.email}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                      <span className="text-xs text-muted">
                        {count} cagnotte{count > 1 ? "s" : ""}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {u.role === "superadmin" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
                            <ShieldCheck size={11} /> Propriétaire
                          </span>
                        )}
                        <UserStatusBadge status={u.status} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ) : (
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
      )}
    </div>
  );
}
