"use client";

import { useState } from "react";
import { MoreVertical, type LucideIcon } from "lucide-react";
import clsx from "clsx";

export interface ActionMenuItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: "default" | "danger";
}

/**
 * Bouton "⋮" ouvrant un petit menu d'actions secondaires (modifier, voir
 * les détails, supprimer…) — pensé pour sortir les actions destructives de
 * la surface directement tapable d'une carte (liste de cotisations,
 * d'utilisateurs…) : un menu qu'il faut ouvrir puis choisir dans une liste
 * réduit nettement le risque de suppression accidentelle par mauvaise
 * manipulation tactile, comparé à une icône corbeille posée directement sur
 * la ligne.
 */
export function ActionMenu({ items, ariaLabel = "Actions" }: { items: ActionMenuItem[]; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);

  function close(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setOpen(false);
  }

  return (
    <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-muted-soft hover:text-foreground"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={close} />
          <div className="absolute right-0 top-9 z-[95] w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={(e) => {
                  close(e);
                  item.onClick();
                }}
                className={clsx(
                  "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium",
                  item.tone === "danger" ? "text-danger hover:bg-danger-soft" : "text-foreground hover:bg-muted-soft"
                )}
              >
                <item.icon size={15} className="flex-shrink-0" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
