"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Receipt, ChevronLeft, ChevronRight, Target, PiggyBank, Users, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCagnottes } from "@/hooks/useCagnottes";
import { useOwnerCotisations } from "@/hooks/useOwnerCotisations";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard, KPICardSkeleton } from "@/components/ui/KPICard";
import { GoalProgressCard } from "@/components/ui/GoalProgressCard";
import { computeCagnotteStats } from "@/lib/stats";
import { formatFCFA, formatDate } from "@/lib/format";
import { PAGE_SIZE_COTISATIONS } from "@/lib/constants";

export default function CotisationsGlobalPage() {
  const { isSuperAdmin } = useAuth();
  const { cagnottes, loading: loadingCagnottes } = useCagnottes();
  const { cotisations, loading: loadingCotisations } = useOwnerCotisations();
  const [search, setSearch] = useState("");
  const [cagnotteFilter, setCagnotteFilter] = useState("all");
  const [page, setPage] = useState(1);

  const loading = loadingCagnottes || loadingCotisations;
  const titleById = useMemo(() => new Map(cagnottes.map((c) => [c.id, c.title])), [cagnottes]);
  const ownerById = useMemo(() => new Map(cagnottes.map((c) => [c.id, c.ownerName])), [cagnottes]);
  const selectedCagnotte = useMemo(
    () => (cagnotteFilter === "all" ? null : cagnottes.find((c) => c.id === cagnotteFilter) || null),
    [cagnottes, cagnotteFilter]
  );

  // Le bloc objectif/KPI reflète la cagnotte sélectionnée dans le filtre —
  // et non la recherche par nom, qui ne sert qu'à repérer une ligne.
  const scopedCotisations = useMemo(
    () => cotisations.filter((c) => (cagnotteFilter === "all" ? true : c.cagnotteId === cagnotteFilter)),
    [cotisations, cagnotteFilter]
  );
  const scopedGoalAmount = useMemo(() => {
    if (selectedCagnotte) return selectedCagnotte.goalAmount || 0;
    return cagnottes.reduce((sum, c) => sum + (c.goalAmount || 0), 0);
  }, [selectedCagnotte, cagnottes]);
  const stats = useMemo(
    () => computeCagnotteStats(scopedCotisations, scopedGoalAmount),
    [scopedCotisations, scopedGoalAmount]
  );

  const filtered = useMemo(() => {
    return scopedCotisations
      .filter((c) => (search.trim() ? c.name.toLowerCase().includes(search.trim().toLowerCase()) : true))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [scopedCotisations, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE_COTISATIONS));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE_COTISATIONS, currentPage * PAGE_SIZE_COTISATIONS);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Cotisations</h1>
        <p className="text-sm text-muted">Toutes les cotisations enregistrées, toutes cagnottes confondues.</p>
      </div>

      {/* Objectif & progression — dynamique selon la cagnotte sélectionnée */}
      {loading ? (
        <div className="skeleton h-28 w-full rounded-2xl" />
      ) : (
        <GoalProgressCard stats={stats} label={selectedCagnotte ? "Objectif" : "Objectif global"} />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : (
          <>
            <KPICard icon={Target} label="Objectif" value={scopedGoalAmount > 0 ? formatFCFA(scopedGoalAmount) : "—"} />
            <KPICard icon={PiggyBank} label="Reste à collecter" value={scopedGoalAmount > 0 ? formatFCFA(stats.remaining) : "—"} />
            <KPICard icon={Users} label="Cotisants" value={String(stats.contributorsCount)} hint={`${stats.entriesCount} entrée(s)`} />
            <KPICard icon={TrendingUp} label="Cotisation moyenne" value={formatFCFA(stats.averageAmount)} />
          </>
        )}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Rechercher un nom…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="rounded-xl border border-line bg-surface px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none"
          value={cagnotteFilter}
          onChange={(e) => {
            setCagnotteFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Toutes les cagnottes</option>
          {cagnottes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="skeleton h-80 w-full rounded-2xl" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="Aucune cotisation" description="Ajoutez des cotisations depuis une cagnotte." />
      ) : (
        <>
          {/* Cartes de transaction — mobile : le montant reste l'information dominante,
              la date, la cagnotte et le propriétaire passent en secondaire. */}
          <div className="space-y-2 sm:hidden">
            {paged.map((c) => (
              <div key={c.id} className="rounded-xl border border-line bg-surface p-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                    <Link
                      href={`/cagnottes/${c.cagnotteId}`}
                      className="mt-0.5 block truncate text-xs text-primary hover:underline"
                    >
                      {titleById.get(c.cagnotteId) || "—"}
                    </Link>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-base font-bold tabular-nums text-success">{formatFCFA(c.amount)}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{formatDate(c.date)}</p>
                  </div>
                </div>
                {isSuperAdmin && (
                  <p className="mt-2 border-t border-line pt-2 text-[11px] text-muted">
                    Propriétaire : <span className="font-medium text-foreground">{ownerById.get(c.cagnotteId) || "—"}</span>
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Tableau — tablette / ordinateur */}
          <div className="hidden overflow-x-auto rounded-2xl border border-line sm:block">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line bg-muted-soft text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Cotisant</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Cagnotte</th>
                  {isSuperAdmin && <th className="px-4 py-3">Propriétaire</th>}
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-muted-soft/50">
                    <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-success">{formatFCFA(c.amount)}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(c.date)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/cagnottes/${c.cagnotteId}`} className="text-primary hover:underline">
                        {titleById.get(c.cagnotteId) || "—"}
                      </Link>
                    </td>
                    {isSuperAdmin && <td className="px-4 py-3 text-muted">{ownerById.get(c.cagnotteId) || "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between text-sm text-muted">
              <span>
                Page {currentPage} / {pageCount} · {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line disabled:opacity-40"
                  aria-label="Page précédente"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line disabled:opacity-40"
                  aria-label="Page suivante"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
