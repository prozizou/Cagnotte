import { ReactNode } from "react";

export function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

// text-base (16px), pas text-sm : en dessous de 16px, Safari iOS zoome
// automatiquement la page au focus d'un champ — décision produit "supprimer
// tout zoom" (voir aussi viewport.maximumScale dans layout.tsx). Toucher ce
// point unique couvre la quasi-totalité des champs de saisie de l'app.
export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
