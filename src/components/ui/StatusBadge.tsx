import { CAGNOTTE_STATUS_LABELS, USER_STATUS_LABELS } from "@/lib/constants";
import { CagnotteStatus, UserStatus } from "@/lib/types";
import clsx from "clsx";

const CAGNOTTE_STYLES: Record<CagnotteStatus, string> = {
  draft: "bg-muted-soft text-muted",
  active: "bg-success-soft text-success",
  completed: "bg-primary-soft text-primary",
  archived: "bg-slate-200 text-slate-600",
};

const USER_STYLES: Record<UserStatus, string> = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
  suspended: "bg-slate-200 text-slate-600",
};

export function CagnotteStatusBadge({ status }: { status: CagnotteStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        CAGNOTTE_STYLES[status]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {CAGNOTTE_STATUS_LABELS[status]}
    </span>
  );
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        USER_STYLES[status]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {USER_STATUS_LABELS[status]}
    </span>
  );
}
