"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Wallet, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { useCagnottes } from "@/hooks/useCagnottes";
import { useOwnerCotisations } from "@/hooks/useOwnerCotisations";
import { EmptyState } from "@/components/ui/EmptyState";
import { CagnotteStatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatFCFA, formatDate } from "@/lib/format";
import { CAGNOTTE_STATUS_LABELS } from "@/lib/constants";
import { CagnotteStatus } from "@/lib/types";

const FILTERS: Array<{ value: CagnotteStatus | "all"; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "active", label: CAGNOTTE_STATUS_LABELS.active },
  { value: "draft", label: CAGNOTTE_STATUS_LABELS.draft },
  { value: "completed", label: CAGNOTTE_STATUS_LABELS.completed },
  { value: "archived", label: CAGNOTTE_STATUS_LABELS.archived },
];

export default function CagnottesListPage() {
  const { isSuperAdmin } = useAuth();
  const { cagnottes, loading } = useCagnottes();
  const { cotisations } = useOwnerCotisations();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CagnotteStatus | "all">("all");

  const totalsByCagnotte = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cotisations) {
      map.set(c.cagnotteId, (map.get(c.cagnotteId) || 0) + (c.amount || 0));
    }
    return map;
  }, [cotisations]);

  const filtered = useMemo(() => {
    return cagnottes.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (search.trim() && !c.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [cagnottes, filter, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
            {isSuperAdmin ? "Toutes les cagnottes" : "Mes cagnottes"}
            {isSuperAdmin && <ShieldCheck size={17} className="text-primary" />}
          </h1>
          <p className="text-sm text-muted">
            {cagnottes.length} cagnotte{cagnottes.length > 1 ? "s" : ""} au total
            {isSuperAdmin && " · toute la plateforme"}
          </p>
        </div>
        <Link
          href="/cagnottes/new"
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          <Plus size={16} /> Nouvelle cagnotte
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Rechercher une cagnotte…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                "flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filter === f.value ? "bg-primary text-white" : "bg-muted-soft text-muted hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-36 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={cagnottes.length === 0 ? "Aucune cagnotte pour le moment" : "Aucun résultat"}
          description={
            cagnottes.length === 0
              ? "Créez votre première cagnotte pour commencer à enregistrer des cotisations."
              : "Essayez une autre recherche ou un autre filtre."
          }
          action={
            cagnottes.length === 0 ? (
              <Link href="/cagnottes/new" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
                <Plus size={16} /> Nouvelle cagnotte
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const total = totalsByCagnotte.get(c.id) || 0;
            const pct = c.goalAmount > 0 ? Math.min(100, (total / c.goalAmount) * 100) : 0;
            return (
              <Link
                key={c.id}
                href={`/cagnottes/${c.id}`}
                className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                {c.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt="" className="h-28 w-full object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground">{c.title}</h3>
                    <CagnotteStatusBadge status={c.status} />
                  </div>
                  {isSuperAdmin && c.ownerName && (
                    <p className="mt-0.5 truncate text-[11px] font-medium text-primary">{c.ownerName}</p>
                  )}
                  <p className="mt-1 line-clamp-1 text-xs text-muted">{c.description || "—"}</p>
                  <p className="mt-3 text-sm font-bold text-foreground">
                    {formatFCFA(total)}
                    {c.goalAmount > 0 && <span className="ml-1 text-xs font-normal text-muted">/ {formatFCFA(c.goalAmount)}</span>}
                  </p>
                  {c.goalAmount > 0 && (
                    <div className="mt-2">
                      <ProgressBar pct={pct} size="sm" />
                    </div>
                  )}
                  <p className="mt-3 text-[11px] text-muted">
                    {formatDate(c.startDate)} → {c.endDate ? formatDate(c.endDate) : "indéterminée"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
