"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History as HistoryIconLucide } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeHistoryForOwner } from "@/lib/data/history";
import { HistoryEntry } from "@/lib/types";
import { HistoryIcon } from "@/components/history/HistoryIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";

export default function HistoriquePage() {
  const { firebaseUser } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    return subscribeHistoryForOwner(firebaseUser.uid, (list) => {
      setEntries(list);
      setLoading(false);
    }, 200);
  }, [firebaseUser]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Historique</h1>
        <p className="text-sm text-muted">Journal des opérations effectuées sur vos cagnottes et cotisations.</p>
      </div>

      {loading ? (
        <div className="skeleton h-80 w-full rounded-2xl" />
      ) : entries.length === 0 ? (
        <EmptyState icon={HistoryIconLucide} title="Aucune activité" description="Les actions effectuées sur vos cagnottes apparaîtront ici." />
      ) : (
        <div className="rounded-2xl border border-line bg-surface shadow-sm">
          <ul className="divide-y divide-line">
            {entries.map((h) => (
              <li key={h.id} className="flex items-start gap-3 p-4">
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <HistoryIcon type={h.type} size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{h.description}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span>{formatDateTime(h.createdAt)}</span>
                    <span>·</span>
                    <span>par {h.actorName}</span>
                    {h.cagnotteId && (
                      <>
                        <span>·</span>
                        <Link href={`/cagnottes/${h.cagnotteId}`} className="text-primary hover:underline">
                          {h.cagnotteTitle}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
