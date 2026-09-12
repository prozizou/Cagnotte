import { Home, Wallet, Receipt, Users, LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  superAdminOnly?: boolean;
}

// Navigation à 4 entrées maximum (3 pour un utilisateur standard, sans
// "Utilisateurs") : Accueil, Cagnottes, Cotisations, Utilisateurs (Super
// Admin uniquement). Rapports, Historique, Import JSON et Paramètres
// restent accessibles par lien direct (ex. depuis une cagnotte pour son
// rapport) mais n'ont plus d'entrée de navigation dédiée.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/cagnottes", label: "Cagnottes", icon: Wallet },
  { href: "/cotisations", label: "Cotisations", icon: Receipt },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Users, superAdminOnly: true },
];
