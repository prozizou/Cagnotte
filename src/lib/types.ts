// Realtime Database ne connaît pas le type Timestamp de Firestore : les
// horodatages sont stockés comme des nombres (millisecondes depuis epoch),
// posés côté serveur via ServerValue.TIMESTAMP au moment de l'écriture.
export type Millis = number;

export type UserStatus = "pending" | "approved" | "rejected" | "suspended";
export type UserRole = "superadmin" | "user";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  status: UserStatus;
  role: UserRole;
  createdAt: Millis | null;
  updatedAt: Millis | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: Millis | null;
}

export type CagnotteStatus = "draft" | "active" | "completed" | "archived";

export interface Contact {
  id: string;
  name: string;
  phone: string;
}

export interface Cagnotte {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  startDate: string; // ISO date (yyyy-MM-dd)
  endDate: string; // ISO date (yyyy-MM-dd)
  goalAmount: number;
  contacts: Contact[];
  status: CagnotteStatus;
  // Image de couverture (Firebase Storage) : utilisée dans l'app et
  // incluse lors du partage du bilan (WhatsApp l'affiche en pièce jointe
  // avec la légende), pour un rendu proche d'une affiche.
  imageUrl: string | null;
  createdAt: Millis | null;
  updatedAt: Millis | null;
}

export interface Cotisation {
  id: string;
  cagnotteId: string;
  ownerId: string; // dénormalisé depuis la cagnotte parente (pour les règles de sécurité & requêtes)
  name: string;
  amount: number;
  date: string; // ISO date (yyyy-MM-dd)
  comment: string;
  createdBy: string;
  createdByName: string;
  createdAt: Millis | null;
  updatedAt: Millis | null;
}

export type HistoryEventType =
  | "cagnotte_created"
  | "cagnotte_updated"
  | "cagnotte_closed"
  | "cagnotte_reopened"
  | "cagnotte_archived"
  | "cagnotte_deleted"
  | "cotisation_added"
  | "cotisation_updated"
  | "cotisation_deleted"
  | "user_approved"
  | "user_rejected"
  | "user_suspended"
  | "user_reactivated"
  | "user_revoked"
  | "user_deleted";

export interface HistoryEntry {
  id: string;
  type: HistoryEventType;
  description: string;
  ownerId: string;
  cagnotteId?: string | null;
  cagnotteTitle?: string | null;
  actorId: string;
  actorName: string;
  createdAt: Millis | null;
  metadata?: Record<string, string | number | null>;
}

export interface CagnotteStats {
  goalAmount: number;
  totalCollected: number;
  remaining: number;
  progressPct: number;
  contributorsCount: number;
  entriesCount: number;
  averageAmount: number;
  maxContribution: Cotisation | null;
  lastContribution: Cotisation | null;
  isGoalReached: boolean;
  surplus: number;
}
