"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, ImagePlus, X } from "lucide-react";
import { Field, inputClass } from "@/components/ui/Field";
import { Cagnotte, CagnotteStatus, Contact } from "@/lib/types";
import { CagnotteFormInput, uploadCagnotteImage } from "@/lib/data/cagnottes";
import { CAGNOTTE_STATUS_LABELS } from "@/lib/constants";
import { todayISO } from "@/lib/format";

function newContact(): Contact {
  return { id: crypto.randomUUID(), name: "", phone: "" };
}

export function CagnotteForm({
  initial,
  ownerId,
  onSubmit,
  submitLabel = "Créer la cagnotte",
  submitting,
}: {
  initial?: Cagnotte;
  // Propriétaire réel de la cagnotte (soi-même à la création ; le
  // propriétaire déjà enregistré en édition, y compris quand le Super
  // Admin modifie la cagnotte d'un autre compte) — détermine le chemin
  // Storage de l'image, vérifié par les règles de sécurité.
  ownerId: string;
  onSubmit: (input: CagnotteFormInput) => void | Promise<void>;
  submitLabel?: string;
  submitting?: boolean;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [startDate, setStartDate] = useState(initial?.startDate || todayISO());
  const [endDate, setEndDate] = useState(initial?.endDate || "");
  const [goalAmount, setGoalAmount] = useState(initial?.goalAmount ? String(initial.goalAmount) : "");
  const [status, setStatus] = useState<CagnotteStatus>(initial?.status || "active");
  const [contacts, setContacts] = useState<Contact[]>(initial?.contacts?.length ? initial.contacts : [newContact()]);
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imageUrl || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateContact(id: string, patch: Partial<Contact>) {
    setContacts((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeContact(id: string) {
    setContacts((cs) => cs.filter((c) => c.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Le titre est obligatoire.");
    if (endDate && startDate && endDate < startDate) return setError("La date de fin doit être après la date de début.");
    const cleanContacts = contacts
      .map((c) => ({ ...c, name: c.name.trim(), phone: c.phone.trim() }))
      .filter((c) => c.name || c.phone);

    let finalImageUrl = imageUrl;
    if (imageFile) {
      setUploadingImage(true);
      try {
        finalImageUrl = await uploadCagnotteImage(ownerId, imageFile);
      } catch (err) {
        setUploadingImage(false);
        return setError(err instanceof Error ? err.message : "Échec de l'envoi de l'image.");
      }
      setUploadingImage(false);
    }

    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      goalAmount: Number(goalAmount) || 0,
      contacts: cleanContacts,
      status,
      imageUrl: finalImageUrl,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Titre de la cagnotte" required>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. Éclairage & Sécurité du quartier"
          maxLength={80}
        />
      </Field>

      <Field label="Description" hint="Objet et contexte de la collecte (facultatif).">
        <textarea
          className={inputClass}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
      </Field>

      <Field
        label="Image de couverture"
        hint="Affichée sur la cagnotte et incluse dans le bilan partagé sur WhatsApp (image + légende). Facultatif."
      >
        {imagePreview ? (
          <div className="relative overflow-hidden rounded-xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="" className="h-40 w-full object-cover" />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
              aria-label="Retirer l'image"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-muted-soft text-muted hover:border-primary/40 hover:text-foreground">
            <ImagePlus size={20} />
            <span className="text-xs font-medium">Ajouter une image</span>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickImage} />
          </label>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date de début" required>
          <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Date de fin">
          <input type="date" className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Objectif financier (F CFA)" hint="0 = pas d'objectif défini">
          <input
            type="number"
            min={0}
            step={1}
            className={inputClass}
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
            placeholder="500000"
          />
        </Field>
        <Field label="Statut">
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as CagnotteStatus)}>
            {Object.entries(CAGNOTTE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Contacts administratifs</span>
          <button
            type="button"
            onClick={() => setContacts((cs) => [...cs, newContact()])}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus size={13} /> Ajouter
          </button>
        </div>
        <p className="mb-3 text-xs text-muted">
          Noms et numéros affichés aux cotisants pour les contacter (WhatsApp). Ce ne sont pas des moyens de
          paiement en ligne.
        </p>
        <div className="space-y-2.5">
          {contacts.map((c) => (
            <div key={c.id} className="flex gap-2">
              <input
                className={inputClass}
                placeholder="Nom"
                value={c.name}
                onChange={(e) => updateContact(c.id, { name: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Téléphone (ex. 77 566 63 89)"
                value={c.phone}
                onChange={(e) => updateContact(c.id, { phone: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeContact(c.id)}
                className="flex-shrink-0 rounded-xl border border-line px-3 text-danger hover:bg-danger-soft"
                aria-label="Retirer ce contact"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={submitting || uploadingImage}
        className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {uploadingImage ? "Envoi de l'image…" : submitting ? "Enregistrement…" : submitLabel}
      </button>
    </form>
  );
}
