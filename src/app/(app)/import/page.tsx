"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FileJson, Upload, ScanSearch, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCagnottes } from "@/hooks/useCagnottes";
import { subscribeAllUsers } from "@/lib/data/users";
import { parseImportJSON, importEntriesToCagnotte, createCagnotteForImport, ParseImportResult } from "@/lib/data/jsonImport";
import { UserProfile } from "@/lib/types";
import { Field, inputClass } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { USER_STATUS_LABELS } from "@/lib/constants";
import { formatFCFA, formatDate, todayISO } from "@/lib/format";

type TargetMode = "existing" | "new";

export default function JsonImportPage() {
  const router = useRouter();
  const { firebaseUser, profile, isSuperAdmin } = useAuth();
  const { cagnottes } = useCagnottes();
  const [users, setUsers] = useState<UserProfile[]>([]);

  const [rawJson, setRawJson] = useState("");
  const [parseResult, setParseResult] = useState<ParseImportResult | null>(null);

  const [targetMode, setTargetMode] = useState<TargetMode>("existing");
  const [cagnotteId, setCagnotteId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [goalAmount, setGoalAmount] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (profile && !isSuperAdmin) router.replace("/dashboard");
  }, [profile, isSuperAdmin, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    return subscribeAllUsers(setUsers);
  }, [isSuperAdmin]);

  const actor = firebaseUser && profile ? { uid: firebaseUser.uid, name: profile.displayName } : null;

  const totalAmount = useMemo(
    () => (parseResult ? parseResult.entries.reduce((s, e) => s + e.amount, 0) : 0),
    [parseResult]
  );

  const selectedOwner = users.find((u) => u.uid === ownerId) || null;
  const resolvedCagnotte = cagnottes.find((c) => c.id === cagnotteId.trim()) || null;

  const canImport =
    !!parseResult &&
    parseResult.entries.length > 0 &&
    (targetMode === "existing" ? !!resolvedCagnotte : !!ownerId && !!title.trim() && !!startDate);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setRawJson(text);
      setParseResult(parseImportJSON(text));
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleAnalyze() {
    if (!rawJson.trim()) {
      toast.error("Collez ou importez d'abord du JSON.");
      return;
    }
    const result = parseImportJSON(rawJson);
    setParseResult(result);
    if (result.entries.length === 0) toast.error("Aucune entrée valide trouvée dans ce JSON.");
  }

  async function handleImport() {
    if (!actor || !parseResult) return;
    setImporting(true);
    try {
      let targetId = cagnotteId.trim();
      if (targetMode === "new") {
        if (!selectedOwner) throw new Error("Choisissez un compte propriétaire.");
        const created = await createCagnotteForImport(
          {
            ownerId: selectedOwner.uid,
            ownerName: selectedOwner.displayName || selectedOwner.email,
            title: title.trim(),
            description: description.trim(),
            startDate,
            endDate,
            goalAmount: Number(goalAmount) || 0,
          },
          actor
        );
        targetId = created.id;
      }
      if (!targetId) throw new Error("Choisissez une cagnotte cible.");
      const result = await importEntriesToCagnotte(targetId, parseResult.entries, actor);
      toast.success(`${result.count} cotisation(s) importée(s) ✔ — ${formatFCFA(result.total)}`);
      router.push(`/cagnottes/${targetId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setImporting(false);
      setConfirmOpen(false);
    }
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Import de données (JSON)</h1>
        <p className="text-sm text-muted">
          Réservé au Super Admin — ajoutez des cotisations en masse depuis un export JSON (ex. ancienne base Realtime
          Database).
        </p>
      </div>

      {/* Étape 1 — source JSON */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">1. Collez ou importez le JSON</h2>
        <textarea
          className={`${inputClass} font-mono text-xs`}
          rows={8}
          placeholder={'{ "name": "Demba Sall", "amount": 2000, "date": "2026-07-21" }\nou un tableau [...], ou un export Realtime Database { "clé": { "name", "amount", "ts" } }'}
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted-soft">
            <Upload size={15} /> Importer un fichier .json
            <input type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />
          </label>
          <button
            onClick={handleAnalyze}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            <ScanSearch size={15} /> Analyser
          </button>
        </div>
      </div>

      {/* Étape 2 — aperçu */}
      {parseResult && (
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">2. Aperçu</h2>

          {parseResult.entries.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl bg-success-soft p-3 text-sm text-success">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                <strong>{parseResult.entries.length}</strong> entrée{parseResult.entries.length > 1 ? "s" : ""} valide
                {parseResult.entries.length > 1 ? "s" : ""} détectée{parseResult.entries.length > 1 ? "s" : ""} — total{" "}
                <strong>{formatFCFA(totalAmount)}</strong>
              </span>
            </div>
          )}

          {parseResult.errors.length > 0 && (
            <div className="mt-2.5 flex items-start gap-2.5 rounded-xl bg-danger-soft p-3 text-sm text-danger">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p>
                  <strong>{parseResult.errors.length}</strong> entrée{parseResult.errors.length > 1 ? "s" : ""} ignorée
                  {parseResult.errors.length > 1 ? "s" : ""} :
                </p>
                <ul className="mt-1 max-h-24 list-disc space-y-0.5 overflow-y-auto pl-4 text-xs">
                  {parseResult.errors.slice(0, 30).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {parseResult.warnings.length > 0 && (
            <div className="mt-2.5 flex items-start gap-2.5 rounded-xl bg-warning-soft p-3 text-sm text-warning">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p>
                  <strong>{parseResult.warnings.length}</strong> avertissement{parseResult.warnings.length > 1 ? "s" : ""} :
                </p>
                <ul className="mt-1 max-h-24 list-disc space-y-0.5 overflow-y-auto pl-4 text-xs">
                  {parseResult.warnings.slice(0, 30).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {parseResult.entries.length > 0 && (
            <div className="mt-3 overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-muted-soft text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-3 py-2">Nom</th>
                    <th className="px-3 py-2">Montant</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.entries.slice(0, 10).map((e, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="px-3 py-2 text-foreground">{e.name}</td>
                      <td className="px-3 py-2 font-medium tabular-nums text-success">{formatFCFA(e.amount)}</td>
                      <td className="px-3 py-2 text-muted">{formatDate(e.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parseResult.entries.length > 10 && (
                <p className="border-t border-line px-3 py-2 text-xs text-muted">
                  … et {parseResult.entries.length - 10} autre(s) entrée(s).
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Étape 3 — destination */}
      {parseResult && parseResult.entries.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">3. Destination</h2>

          <div className="mb-4 flex gap-2">
            <ModeButton active={targetMode === "existing"} onClick={() => setTargetMode("existing")} label="Cagnotte existante" />
            <ModeButton active={targetMode === "new"} onClick={() => setTargetMode("new")} label="Nouvelle cagnotte" />
          </div>

          {targetMode === "existing" ? (
            <div className="space-y-3">
              <Field label="Cagnotte cible" required hint="Ou collez directement un identifiant ci-dessous.">
                <select
                  className={inputClass}
                  value={resolvedCagnotte ? cagnotteId.trim() : ""}
                  onChange={(e) => setCagnotteId(e.target.value)}
                >
                  <option value="">— Choisir une cagnotte —</option>
                  {cagnottes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} — {c.ownerName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ou coller un ID de cagnotte" hint="Identifiant copié depuis la console Firebase ou une autre page de l'app.">
                <input
                  className={`${inputClass} font-mono`}
                  value={cagnotteId}
                  onChange={(e) => setCagnotteId(e.target.value.trim())}
                  placeholder="ex. -P1I1r8D9doFzErEEunJ"
                />
              </Field>
              {cagnotteId.trim() &&
                (resolvedCagnotte ? (
                  <p className="text-xs font-medium text-success">
                    ✔ « {resolvedCagnotte.title} » — {resolvedCagnotte.ownerName}
                  </p>
                ) : (
                  <p className="text-xs font-medium text-danger">Aucune cagnotte trouvée avec cet identifiant.</p>
                ))}
            </div>
          ) : (
            <div className="space-y-3.5">
              <Field label="Compte propriétaire" required hint="Un compte non encore connecté doit d'abord être pré-approuvé (page Utilisateurs).">
                <select className={inputClass} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                  <option value="">— Choisir un utilisateur —</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName} ({u.email}) — {USER_STATUS_LABELS[u.status]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Titre de la cagnotte" required>
                <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
              </Field>
              <Field label="Description" hint="Facultatif">
                <textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date de début" required>
                  <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </Field>
                <Field label="Date de fin">
                  <input type="date" className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </Field>
              </div>
              <Field label="Objectif financier (F CFA)" hint="0 = pas d'objectif défini">
                <input type="number" min={0} step={1} className={inputClass} value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} />
              </Field>
            </div>
          )}

          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!canImport}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 sm:w-auto sm:px-8"
          >
            <FileJson size={16} /> Importer {parseResult.entries.length} cotisation(s)
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        tone="primary"
        title="Confirmer l'import ?"
        description={
          parseResult
            ? `${parseResult.entries.length} cotisation(s) — ${formatFCFA(totalAmount)} — seront ajoutées ${
                targetMode === "existing"
                  ? `à « ${resolvedCagnotte?.title || ""} »`
                  : `à une nouvelle cagnotte « ${title} » pour ${selectedOwner?.displayName || ""}`
              }. Cette action écrit directement dans Realtime Database.`
            : ""
        }
        confirmLabel={importing ? "Import en cours…" : "Importer"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleImport}
      />
    </div>
  );
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
        active ? "border-primary bg-primary-soft text-primary" : "border-line text-muted hover:bg-muted-soft"
      }`}
    >
      {label}
    </button>
  );
}
