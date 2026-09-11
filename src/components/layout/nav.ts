import { Home, Wallet, Receipt, Users, MoreHorizontal, LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  superAdminOnly?: boolean;
}

// Navigation à 5 entrées maximum : Accueil, Cagnottes, Cotisations,
// Utilisateurs (Super Admin uniquement) et Plus (rapports, historique,
// paramètres — et import JSON pour le Super Admin). Un utilisateur
// standard n'en voit que 4 (pas de gestion des comptes).
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/cagnottes", label: "Cagnottes", icon: Wallet },
  { href: "/cotisations", label: "Cotisations", icon: Receipt },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Users, superAdminOnly: true },
  { href: "/plus", label: "Plus", icon: MoreHorizontal },
];
