import {
  PlusCircle,
  PenLine,
  Trash2,
  Wallet,
  CheckCircle2,
  RotateCcw,
  Archive,
  UserCheck,
  UserX,
  UserMinus,
  UserPlus,
  ShieldOff,
} from "lucide-react";
import { HistoryEventType } from "@/lib/types";

const ICONS: Record<HistoryEventType, typeof PlusCircle> = {
  cagnotte_created: Wallet,
  cagnotte_updated: PenLine,
  cagnotte_closed: CheckCircle2,
  cagnotte_reopened: RotateCcw,
  cagnotte_archived: Archive,
  cotisation_added: PlusCircle,
  cotisation_updated: PenLine,
  cotisation_deleted: Trash2,
  user_approved: UserCheck,
  user_rejected: UserX,
  user_suspended: ShieldOff,
  user_reactivated: UserPlus,
  user_revoked: UserMinus,
};

export function HistoryIcon({ type, size = 14 }: { type: HistoryEventType; size?: number }) {
  const Icon = ICONS[type] || PenLine;
  return <Icon size={size} strokeWidth={2.2} />;
}
