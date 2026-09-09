import {
  LayoutDashboard,
  Wallet,
  Receipt,
  BarChart3,
  History,
  Users,
  Settings,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  superAdminOnly?: boolean;
  // Masqué pour le Super Admin : son parcours passe désormais par
  // Utilisateurs → fiche d'un compte → ses cagnottes, plutôt que par ces
  // pages orientées "espace personnel" d'un utilisateur standard.
  hiddenForSuperAdmin?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, hiddenForSuperAdmin: true },
  { href: "/cagnottes", label: "Mes cagnottes", icon: Wallet, hiddenForSuperAdmin: true },
  { href: "/cotisations", label: "Cotisations", icon: Receipt },
  { href: "/rapports", label: "Rapports & Bilan", icon: BarChart3, hiddenForSuperAdmin: true },
  { href: "/historique", label: "Historique", icon: History, hiddenForSuperAdmin: true },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Users, superAdminOnly: true },
  { href: "/parametres", label: "Paramètres", icon: Settings, hiddenForSuperAdmin: true },
];
