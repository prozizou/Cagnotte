"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BarChart3, ArrowRight, Coins, Wallet, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCagnottes } from "@/hooks/useCagnottes";
import { useOwnerCotisations } from "@/hooks/useOwnerCotisations";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard, KPICardSkeleton } from "@/components/ui/KPICard";
import { CagnotteStatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatFCFA } from "@/lib/format";

export default function RapportsHubPage() {
  const { isSuperAdmin } = useAuth();
  const { cagnottes, loading: loadingCagnottes } = useCagnottes();
  const { cotisations, loading: loadingCotisations } = useOwnerCotisations();
  const loading = loadingCagnottes || loadingCotisations;

  const totalsByCagnotte = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cotisations) map.set(c.cagnotteId, (map.get(c.cagnotteId) || 0) + (c.amount || 0));
    return map;
  }, [cotisations]);

  const totalCollected = cotisations.reduce((s, c) => s + (c.amount || 0), 0);
  const totalGoal = cagnottes.reduce((s, c) => s + (c.goalAmount || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Rapports & Bilan</h1>
        <p className="text-sm text-muted">Sélectionnez une cagnotte pour consulter son rapport détaillé et l&apos;exporter.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : (
          <>
            <KPICard icon={Wallet} label="Cagnottes" value={String(cagnottes.length)} tone="primary" />
            <KPICard icon={Coins} label="Total collecté" value={formatFCFA(totalCollected)} tone="success" />
            <KPICard icon={TrendingUp} label="Objectifs cumulés" value={formatFCFA(totalGoal)} />
          </>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      ) : cagnottes.length === 0 ? (
        <EmptyState icon={BarChart3} title="Aucun rapport disponible" description="Créez une cagnotte pour générer son premier rapport." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cagnottes.map((c) => {
            const total = totalsByCagnotte.get(c.id) || 0;
            const pct = c.goalAmount > 0 ? Math.min(100, (total / c.goalAmount) * 100) : 0;
            return (
              <Link
                key={c.id}
                href={`/cagnottes/${c.id}/rapport`}
                className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-foreground">{c.title}</h3>
                  <CagnotteStatusBadge status={c.status} />
                </div>
                {isSuperAdmin && c.ownerName && (
                  <p className="mt-0.5 truncate text-[11px] font-medium text-primary">{c.ownerName}</p>
                )}
                <p className="mt-2 text-sm font-bold text-foreground">{formatFCFA(total)}</p>
                {c.goalAmount > 0 && (
                  <div className="mt-2">
                    <ProgressBar pct={pct} size="sm" />
                  </div>
                )}
                <span className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                  Voir le rapport <ArrowRight size={12} />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
