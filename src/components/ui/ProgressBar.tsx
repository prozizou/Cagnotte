import clsx from "clsx";

export function ProgressBar({
  pct,
  goalReached,
  size = "md",
}: {
  pct: number;
  goalReached?: boolean;
  size?: "sm" | "md";
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className={clsx(
        "w-full overflow-hidden rounded-full bg-muted-soft",
        size === "sm" ? "h-1.5" : "h-2.5"
      )}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={clsx(
          "h-full rounded-full transition-all duration-500 ease-out",
          goalReached ? "bg-success" : "bg-primary"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
