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
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/cagnottes", label: "Mes cagnottes", icon: Wallet },
  { href: "/cotisations", label: "Cotisations", icon: Receipt },
  { href: "/rapports", label: "Rapports & Bilan", icon: BarChart3 },
  { href: "/historique", label: "Historique", icon: History },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Users, superAdminOnly: true },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];
