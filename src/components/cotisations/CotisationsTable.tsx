"use client";

import { useMemo, useState } from "react";
import { Search, Pencil, Trash2, ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { Cotisation } from "@/lib/types";
import { formatFCFA, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { PAGE_SIZE_COTISATIONS } from "@/lib/constants";

type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "name_asc" | "name_desc";

const SORT_LABELS: Record<SortKey, string> = {
  date_desc: "Plus récent d'abord",
  date_asc: "Plus ancien d'abord",
  amount_desc: "Montant décroissant",
  amount_asc: "Montant croissant",
  name_asc: "Nom (A → Z)",
  name_desc: "Nom (Z → A)",
};

export function CotisationsTable({
  cotisations,
  readOnly,
  onEdit,
  onDelete,
}: {
  cotisations: Cotisation[];
  readOnly?: boolean;
  onEdit: (c: Cotisation) => void;
  onDelete: (c: Cotisation) => void;
}) {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = cotisations;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (from) list = list.filter((c) => c.date >= from);
    if (to) list = list.filter((c) => c.date <= to);

    const sorted = [...list].sort((a, b) => {
      switch (sort) {
        case "date_asc":
          return a.date.localeCompare(b.date) || cmpCreated(a, b);
        case "amount_desc":
          return b.amount - a.amount;
        case "amount_asc":
          return a.amount - b.amount;
        case "name_asc":
          return a.name.localeCompare(b.name, "fr");
        case "name_desc":
          return b.name.localeCompare(a.name, "fr");
        case "date_desc":
        default:
          return b.date.localeCompare(a.date) || -cmpCreated(a, b);
      }
    });
    return sorted;
  }, [cotisations, search, from, to, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE_COTISATIONS));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE_COTISATIONS, currentPage * PAGE_SIZE_COTISATIONS);

  function resetPage() {
    setPage(1);
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-[180px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Rechercher un nom…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
        </div>
        <input
          type="date"
          className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-muted focus:border-primary focus:outline-none"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            resetPage();
          }}
          aria-label="Depuis le"
        />
        <input
          type="date"
          className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-muted focus:border-primary focus:outline-none"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            resetPage();
          }}
          aria-label="Jusqu'au"
        />
        <select
          className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none sm:ml-auto"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={cotisations.length === 0 ? "Aucune cotisation enregistrée" : "Aucun résultat"}
          description={
            cotisations.length === 0
              ? "Ajoutez la première cotisation avec le bouton ci-dessus."
              : "Essayez une autre recherche ou une autre période."
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line bg-muted-soft text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Cotisant</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Commentaire</th>
                  {!readOnly && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-muted-soft/50">
                    <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-success">{formatFCFA(c.amount)}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(c.date)}</td>
                    <td className="hidden truncate px-4 py-3 text-muted sm:table-cell max-w-[220px]">{c.comment || "—"}</td>
                    {!readOnly && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => onEdit(c)}
                            className="rounded-lg p-1.5 text-muted hover:bg-primary-soft hover:text-primary"
                            aria-label={`Modifier la cotisation de ${c.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => onDelete(c)}
                            className="rounded-lg p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                            aria-label={`Supprimer la cotisation de ${c.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm text-muted">
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

function cmpCreated(a: Cotisation, b: Cotisation): number {
  return (a.createdAt ?? 0) - (b.createdAt ?? 0);
}
