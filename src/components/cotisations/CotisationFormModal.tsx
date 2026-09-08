"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Field, inputClass } from "@/components/ui/Field";
import { Cotisation } from "@/lib/types";
import { CotisationFormInput } from "@/lib/data/cotisations";
import { todayISO } from "@/lib/format";

export function CotisationFormModal({
  open,
  initial,
  onSubmit,
  onClose,
}: {
  open: boolean;
  initial?: Cotisation | null;
  onSubmit: (input: CotisationFormInput) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date || todayISO());
  const [comment, setComment] = useState(initial?.comment || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsedAmount = Number(amount);
    if (!name.trim()) return setError("Le nom du cotisant est obligatoire.");
    if (!parsedAmount || parsedAmount <= 0) return setError("Montant invalide.");
    if (!date) return setError("La date est obligatoire.");

    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), amount: parsedAmount, date, comment: comment.trim() });
      onClose();
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{initial ? "Modifier la cotisation" : "Ajouter une cotisation"}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-muted-soft" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5">
          <Field label="Nom du cotisant" required>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Montant (F CFA)" required>
              <input type="number" min={1} step={1} className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Date" required>
              <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Commentaire" hint="Facultatif">
            <input className={inputClass} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={140} />
          </Field>
        </div>

        {error && <p className="mt-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {submitting ? "Enregistrement…" : initial ? "Enregistrer" : "Ajouter"}
        </button>
      </form>
    </div>
  );
}
