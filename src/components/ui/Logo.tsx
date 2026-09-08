import clsx from "clsx";
import { APP_NAME } from "@/lib/constants";

export function Logo({ withText = true, size = 34 }: { withText?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill="#4338ca" />
        <path
          d="M12 21.5c0-4.7 3.6-8.5 8-8.5 3.3 0 6.1 2.1 7.3 5.1"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d="M27 22v5.5H21.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20" cy="21.5" r="2.4" fill="#facc15" />
      </svg>
      {withText && <span className={clsx("text-lg font-bold tracking-tight text-foreground")}>{APP_NAME}</span>}
    </div>
  );
}
