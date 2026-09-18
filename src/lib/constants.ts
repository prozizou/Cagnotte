/**
 * Constantes globales de l'application.
 */

// Email du Super Administrateur : seul compte capable de gérer les
// autorisations d'accès des autres utilisateurs. Ce compte est
// automatiquement approuvé et promu "superadmin" à la première connexion.
export const SUPER_ADMIN_EMAIL = "prozizou298@gmail.com";

// Numéro de contact du Super Admin pour les demandes de création/validation
// de compte : aucune inscription libre dans l'app (accès strictement sur
// invitation), donc un visiteur — ou un nouvel utilisateur connecté via
// Google mais pas encore autorisé — n'a pas d'autre moyen de joindre
// l'administrateur. Partagé entre l'écran de connexion et l'écran d'attente.
export const SUPER_ADMIN_WHATSAPP = "+221 77 350 05 95";

export const APP_NAME = "CagnottePro";
export const APP_TAGLINE = "Gestion administrative des cagnottes et cotisations";

export const USER_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
} as const;

export const CAGNOTTE_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  COMPLETED: "completed",
  ARCHIVED: "archived",
} as const;

export const CAGNOTTE_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  active: "Active",
  completed: "Terminée",
  archived: "Archivée",
};

export const USER_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Autorisé",
  rejected: "Refusé",
  suspended: "Suspendu",
};

export const PAGE_SIZE_COTISATIONS = 20;
