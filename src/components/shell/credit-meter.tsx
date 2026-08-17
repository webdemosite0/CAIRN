import Link from "next/link";
import type { Balance } from "@/lib/credits";

/**
 * The credit meter in the rail. Deliberately borderless: it sits directly above
 * the theme switch and the account row, and three stacked bordered boxes read
 * as clutter. The bar carries the meaning; the box was doing nothing.
 */
export function CreditMeter({ balance }: { balance: Balance | null }) {
  if (!balance) return null;

  const { granted, used, remaining, plan } = balance;
  const pct = granted > 0 ? Math.min(100, Math.round((used / granted) * 100)) : 0;
  const level = remaining <= 0 ? "out" : pct >= 85 ? "low" : "ok";

  const tone =
    level === "out" ? "text-critical" : level === "low" ? "text-caution" : "text-ink-2";
  const fill =
    level === "out" ? "bg-critical" : level === "low" ? "bg-caution" : "bg-accent";

  return (
    <Link
      href="/plans"
      className="group block rounded-[8px] px-2 py-1.5 transition-colors hover:bg-hover"
      title={`${remaining.toLocaleString()} of ${granted.toLocaleString()} credits left on ${plan.name}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.09em] text-ink-4">
          Credits
        </span>
        <span className={`text-[12px] font-semibold tabular-nums ${tone}`}>
          {remaining.toLocaleString()}
        </span>
      </div>

      <div
        className="mt-1.5 h-1 overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${remaining.toLocaleString()} of ${granted.toLocaleString()} credits left`}
      >
        <span
          className={`block h-full rounded-full transition-[width] duration-500 ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}
