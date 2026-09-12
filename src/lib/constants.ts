/**
 * Constantes globales de l'application.
 */

// Email du Super Administrateur : seul compte capable de gérer les
// autorisations d'accès des autres utilisateurs. Ce compte est
// automatiquement approuvé et promu "superadmin" à la première connexion.
export const SUPER_ADMIN_EMAIL = "prozizou298@gmail.com";

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
