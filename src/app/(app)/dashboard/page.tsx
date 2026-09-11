"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { Wallet, CheckCircle2, Coins, Users, Plus, ArrowRight, UserCheck, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCagnottes } from "@/hooks/useCagnottes";
import { useOwnerCotisations } from "@/hooks/useOwnerCotisations";
import { usePendingUsersCount } from "@/hooks/usePendingUsersCount";
import { KPICard, KPICardSkeleton } from "@/components/ui/KPICard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CagnotteStatusBadge, UserStatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatFCFA, formatPct, formatDateTime } from "@/lib/format";
import { computeCagnotteStats, buildEvolutionSeries, EvolutionPeriod } from "@/lib/stats";
import { subscribeHistoryForOwner, subscribeAllHistory } from "@/lib/data/history";
import { subscribeAllUsers } from "@/lib/data/users";
import { HistoryEntry, UserProfile } from "@/lib/types";
import { HistoryIcon } from "@/components/history/HistoryIcon";
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
  const { profile, firebaseUser, isSuperAdmin } = useAuth();
  const { cagnottes, loading: loadingCagnottes } = useCagnottes();
  const { cotisations, loading: loadingCotisations } = useOwnerCotisations();
  const pendingUsersCount = usePendingUsersCount();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [period, setPeriod] = useState<EvolutionPeriod>("30j");

  useEffect(() => {
    if (!firebaseUser) return;
    return isSuperAdmin
      ? subscribeAllHistory(setHistory, 8)
      : subscribeHistoryForOwner(firebaseUser.uid, setHistory, 8);
  }, [firebaseUser, isSuperAdmin]);

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
    return { active, completed, total, contributors: uniqueNames.size };
  }, [cagnottes, cotisations]);

  const goalStats = useMemo(() => {
    const totalGoal = cagnottes.reduce((s, c) => s + (c.goalAmount || 0), 0);
    return computeCagnotteStats(cotisations, totalGoal);
  }, [cagnottes, cotisations]);

  const evolutionData = useMemo(() => buildEvolutionSeries(cotisations, period), [cotisations, period]);

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
            {isSuperAdmin ? "Vue d'ensemble de toute la plateforme." : "Voici un aperçu de vos cagnottes."}
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
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          {goalStats.goalAmount > 0 ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="text-2xl font-extrabold tabular-nums text-foreground">{formatFCFA(goalStats.totalCollected)}</span>
                  <span className="ml-1.5 text-sm text-muted">collecté sur {formatFCFA(goalStats.goalAmount)}</span>
                </div>
                <span className={`text-sm font-bold ${goalStats.isGoalReached ? "text-success" : "text-primary"}`}>
                  {formatPct(goalStats.progressPct)}
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar pct={goalStats.progressPct} goalReached={goalStats.isGoalReached} />
              </div>
              <p className="mt-2.5 text-sm">
                {goalStats.isGoalReached ? (
                  <span className="font-semibold text-success">🎉 Objectifs atteints — 100 %</span>
                ) : (
                  <span className="text-muted">
                    Reste <span className="font-semibold text-foreground">{formatFCFA(goalStats.remaining)}</span> à
                    collecter, tous objectifs confondus
                  </span>
                )}
              </p>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-extrabold tabular-nums text-foreground">{formatFCFA(goalStats.totalCollected)}</span>
                <span className="ml-1.5 text-sm text-muted">collecté au total</span>
              </div>
              <span className="text-xs text-muted">Aucun objectif défini</span>
            </div>
          )}
        </div>
      )}

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
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={evolutionData} margin={{ left: -18, right: 8 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => Number(v).toLocaleString("fr-FR")} />
              <Tooltip
                formatter={(v, name) => [formatFCFA(Number(v)), name === "cumulative" ? "Cumulé" : "Collecté"]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Bar dataKey="amount" fill="#c7d2fe" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Line type="monotone" dataKey="cumulative" stroke="#4338ca" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
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
              {users.slice(0, 8).map((u) => (
                <Link
                  key={u.uid}
                  href={`/utilisateurs/${u.uid}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  {u.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.photoURL} alt="" className="h-9 w-9 flex-shrink-0 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                      {u.displayName?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-foreground">{u.displayName}</p>
                      {u.role === "superadmin" && <ShieldCheck size={13} className="flex-shrink-0 text-primary" />}
                    </div>
                    <p className="truncate text-xs text-muted">{u.email}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-muted">
                    {cagnotteCountByOwner.get(u.uid) || 0} cagnotte{(cagnotteCountByOwner.get(u.uid) || 0) > 1 ? "s" : ""}
                  </span>
                  <UserStatusBadge status={u.status} />
                </Link>
              ))}
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
