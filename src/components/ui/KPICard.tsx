import { LucideIcon } from "lucide-react";
import clsx from "clsx";

export function KPICard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "success" | "warning";
}) {
  const toneStyles: Record<string, string> = {
    default: "bg-muted-soft text-foreground",
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>
        <span className={clsx("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg", toneStyles[tone])}>
          <Icon size={14} strokeWidth={2.25} />
        </span>
      </div>
      <div className="mt-1.5 truncate text-lg font-bold tabular-nums text-foreground sm:text-xl">{value}</div>
      {hint && <div className="mt-0.5 truncate text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

export function KPICardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-sm">
      <div className="skeleton h-3 w-16" />
      <div className="skeleton mt-2.5 h-5 w-20" />
    </div>
  );
}
