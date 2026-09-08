"use client";

import { ReactNode, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import clsx from "clsx";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={clsx(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
              tone === "danger" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary"
            )}
          >
            <AlertTriangle size={18} />
          </span>
          <button
            onClick={onCancel}
            className="rounded-lg p-1 text-muted hover:bg-muted-soft"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <h3 className="mt-3 text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted-soft"
          >
            {cancelLabel}
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
            className={clsx(
              "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60",
              tone === "danger" ? "bg-danger hover:bg-red-700" : "bg-primary hover:bg-primary-dark"
            )}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
