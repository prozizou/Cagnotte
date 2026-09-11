"use client";

import Link from "next/link";
import { BarChart3, History, Settings, FileJson, ChevronRight, LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PlusLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  superAdminOnly?: boolean;
}

const LINKS: PlusLink[] = [
  { href: "/rapports", label: "Rapports & Bilan", description: "Analyses, graphiques et exports.", icon: BarChart3 },
  { href: "/historique", label: "Historique", description: "Journal des opérations effectuées.", icon: History },
  { href: "/import", label: "Import JSON", description: "Ajouter des cotisations en masse.", icon: FileJson, superAdminOnly: true },
  { href: "/parametres", label: "Paramètres", description: "Informations de votre compte.", icon: Settings },
];

export default function PlusPage() {
  const { isSuperAdmin } = useAuth();
  const links = LINKS.filter((l) => !l.superAdminOnly || isSuperAdmin);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Plus</h1>
        <p className="text-sm text-muted">Rapports, historique et paramètres.</p>
      </div>

      <div className="space-y-2.5">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <l.icon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{l.label}</p>
              <p className="truncate text-xs text-muted">{l.description}</p>
            </div>
            <ChevronRight size={16} className="flex-shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
