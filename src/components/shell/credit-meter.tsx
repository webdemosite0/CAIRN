"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowRight, FiLoader } from "react-icons/fi";
import type { Balance, UsageRow } from "@/lib/credits";
import { kindLabel } from "@/lib/kind-label";
import { cn } from "@/lib/utils";
import { Ico } from "@/components/ui/ico";

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
 *
 * Clicking opens a breakdown of where the month went rather than jumping
 * straight to pricing. "I am running low" and "what is eating my credits" are
 * the same moment, and the pricing page cannot answer the second question
 * without a scroll. The plans link stays, at the foot of the popover.
 *
 * The breakdown is fetched on first open, not rendered with the rail: the rail
 * is on every page and the popover is opened rarely, so the grouped query
 * should not be on the critical path of every navigation.
 */
export function CreditMeter({
  balance,
  collapsed = false,
}: {
  balance: Balance | null;
  collapsed?: boolean;
}) {
  // Which route the popover was opened on, rather than a bare boolean.
  // Navigating away should not leave a panel floating over the new page, and
  // deriving "open" from the current path closes it without an effect that
  // sets state on every navigation.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageRow[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const wrap = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const open = openedAt === pathname;
  const setOpen = useCallback(
    (next: boolean) => setOpenedAt(next ? pathname : null),
    [pathname],
  );

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, setOpen]);

  const load = useCallback(async () => {
    // Already have it — the month's spend does not move while a popover is
    // open, so one fetch per mount is enough.
    if (usage) return;
    setState("loading");
    try {
      const res = await fetch("/api/usage", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { usage: UsageRow[] };
      setUsage(data.usage ?? []);
      setState("idle");
    } catch {
      setState("error");
    }
  }, [usage]);

  if (!balance) return null;

  const { granted, used, remaining, plan } = balance;
  const pct = granted > 0 ? Math.min(100, Math.round((used / granted) * 100)) : 0;
  const level = remaining <= 0 ? "out" : pct >= 85 ? "low" : "ok";

  const tone =
    level === "out" ? "text-critical" : level === "low" ? "text-caution" : "text-ink-2";
  const fill =
    level === "out" ? "bg-critical" : level === "low" ? "bg-caution" : "bg-accent";

  const title = `${remaining.toLocaleString()} of ${granted.toLocaleString()} credits left on ${plan.name}`;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load();
  };

  const popover = (
    <div
      role="dialog"
      aria-label="Credit usage this month"
      className={cn(
        "nx-reveal absolute z-50 w-[272px] rounded-[var(--r-panel)] border border-line bg-raised p-3.5 shadow-[var(--elev)]",
        // Expanded rail: above the meter. The collapsed rail is 64px wide, so
        // the panel goes beside it instead of hanging off both edges.
        collapsed ? "bottom-0 left-full ml-2" : "bottom-full left-0 mb-2",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink">This month</span>
        <span className="meta">{plan.name}</span>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={cn("text-[19px] font-semibold tabular-nums", tone)}>
          {remaining.toLocaleString()}
        </span>
        <span className="text-[12.5px] text-ink-4">
          of {granted.toLocaleString()} credits left
        </span>
      </div>

      <div className="mt-3 border-t border-line pt-3">
        {state === "loading" ? (
          <p className="flex items-center gap-2 text-[13px] text-ink-4">
            <Ico icon={FiLoader} motion="spin" size={13} className="animate-spin" />
            Loading breakdown…
          </p>
        ) : state === "error" ? (
          <p className="text-[13px] text-ink-4">
            Could not load the breakdown just now.
          </p>
        ) : usage && usage.length ? (
          <ul className="space-y-1.5">
            {usage.map((u) => (
              <li
                key={u.kind}
                className="flex items-center justify-between gap-3 text-[13px]"
              >
                <span className="truncate text-ink-2">{kindLabel(u.kind)}</span>
                <span className="flex shrink-0 items-center gap-2.5 tabular-nums">
                  <span className="text-ink-4">{u.calls}×</span>
                  <span className="text-ink-2">{u.credits.toLocaleString()} cr</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-4">Nothing used yet this month.</p>
        )}
      </div>

      <Link
        href="/plans"
        className="mt-3 flex items-center justify-between gap-2 rounded-[var(--r-chip)] px-2 py-1.5 text-[13px] font-medium text-accent transition-colors hover:bg-hover"
      >
        Credits and plans
        <Ico icon={FiArrowRight} motion="nudge" size={13} />
      </Link>
    </div>
  );

  if (collapsed) {
    return (
      <div ref={wrap} className="relative mx-auto w-8">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="dialog"
          title={title}
          aria-label={title}
          className="group grid h-8 w-8 place-items-center rounded-[var(--r-chip)] transition-colors hover:bg-hover"
        >
          <span className={cn("text-[11px] font-semibold tabular-nums", tone)}>
            {remaining > 999 ? `${Math.round(remaining / 1000)}k` : remaining}
          </span>
        </button>
        {open ? popover : null}
      </div>
    );
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={title}
        className="group block w-full rounded-[var(--r-chip)] px-2 py-1.5 text-left transition-colors hover:bg-hover"
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
          // "69" on its own says nothing about whether that is a lot. The
          // sentence is already written for the tooltip; read it out too.
          aria-valuetext={title}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500 ease-[var(--ease-ui)]",
              fill,
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>
      {open ? popover : null}
    </div>
  );
}
