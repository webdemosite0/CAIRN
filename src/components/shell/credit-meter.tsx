import Link from "next/link";
import type { Balance } from "@/lib/credits";
import { cn } from "@/lib/utils";

/**
 * The credit indicator in the rail.
 *
 * Borderless on purpose: it sits directly above the theme switch and the
 * account row, and three stacked bordered boxes read as clutter. The bar
 * carries the meaning.
 *
 * Reads "200 / 500 credits" rather than a bare number, because a number alone
 * gives no sense of whether it is a lot — the denominator is what makes it
 * legible at a glance.
 */
export function CreditMeter({
  balance,
  collapsed = false,
}: {
  balance: Balance | null;
  collapsed?: boolean;
}) {
  if (!balance) return null;

  const { granted, used, remaining, plan } = balance;
  const pct = granted > 0 ? Math.min(100, Math.round((used / granted) * 100)) : 0;
  const level = remaining <= 0 ? "out" : pct >= 85 ? "low" : "ok";

  const tone =
    level === "out" ? "text-critical" : level === "low" ? "text-caution" : "text-ink-2";
  const fill =
    level === "out" ? "bg-critical" : level === "low" ? "bg-caution" : "bg-accent";

  const title = `${remaining.toLocaleString()} of ${granted.toLocaleString()} credits left on ${plan.name}`;

  if (collapsed) {
    return (
      <Link
        href="/plans"
        title={title}
        aria-label={title}
        className="group mx-auto grid h-8 w-8 place-items-center rounded-[6px] transition-colors hover:bg-hover"
      >
        <span className={cn("text-[11px] font-semibold tabular-nums", tone)}>
          {remaining > 999 ? `${Math.round(remaining / 1000)}k` : remaining}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/plans"
      className="group block rounded-[6px] px-2 py-1.5 transition-colors hover:bg-hover"
      title={title}
    >
      <div className="flex items-baseline gap-1.5">
        <span aria-hidden className="text-[11px] leading-none text-accent">
          ✦
        </span>
        <span className={cn("text-[12.5px] font-medium tabular-nums", tone)}>
          {remaining.toLocaleString()}
          <span className="text-ink-4"> / {granted.toLocaleString()}</span>
        </span>
        <span className="text-[12px] text-ink-4">credits</span>
      </div>

      <div
        className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Credits used"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", fill)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}
