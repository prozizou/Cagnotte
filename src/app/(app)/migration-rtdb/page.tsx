"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DatabaseZap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { migrateFirestoreToRtdb, MigrationSummary } from "@/lib/data/migrateFirestoreToRtdb";

/**
 * Page ponctuelle, non liée dans la navigation : copie les données de
 * l'ancienne base Firestore vers Realtime Database. À utiliser une seule
 * fois lors du basculement, puis à supprimer (avec migrateFirestoreToRtdb.ts
 * et l'export `firestoreDb` de lib/firebase.ts).
 */
export default function MigrationRtdbPage() {
  const router = useRouter();
  const { profile, isSuperAdmin } = useAuth();
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [summary, setSummary] = useState<MigrationSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile && !isSuperAdmin) router.replace("/dashboard");
  }, [profile, isSuperAdmin, router]);

  async function handleRun() {
    setRunning(true);
    setError("");
    setLog([]);
    setSummary(null);
    try {
      const result = await migrateFirestoreToRtdb((msg) => setLog((l) => [...l, msg]));
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la migration.");
    } finally {
      setRunning(false);
    }
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Migration Firestore → Realtime Database</h1>
        <p className="text-sm text-muted">Outil ponctuel, réservé au Super Admin. À utiliser une seule fois.</p>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-warning-soft bg-warning-soft p-4 text-sm text-warning">
        <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold">Avant de lancer :</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
            <li>
              <code>NEXT_PUBLIC_FIREBASE_DATABASE_URL</code> doit être renseignée (build/déploiement) — sinon les
              écritures échoueront.
            </li>
            <li><code>database.rules.json</code> doit déjà être déployé dans la console Firebase.</li>
            <li>Les anciennes règles Firestore doivent encore être actives (pour que la lecture fonctionne ici).</li>
            <li>Relancer cette migration plusieurs fois est sans risque : chaque document est réécrit à l&apos;identique.</li>
          </ul>
        </div>
      </div>

      <button
        onClick={handleRun}
        disabled={running}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        <DatabaseZap size={16} /> {running ? "Migration en cours…" : "Lancer la migration"}
      </button>

      {log.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4 text-xs text-muted">
          <ul className="space-y-1">
            {log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {summary && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-success-soft bg-success-soft p-4 text-sm text-success">
          <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Migration terminée ✔</p>
            <p className="mt-1 text-xs">
              {summary.users} utilisateur(s), {summary.cagnottes} cagnotte(s), {summary.cotisations} cotisation(s),{" "}
              {summary.history} entrée(s) d&apos;historique.
            </p>
          </div>
        </div>
      )}

      {error && <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}
    </div>
  );
}
