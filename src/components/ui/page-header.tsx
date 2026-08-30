import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The top of a workspace page: what this is, what it's for, and the one thing
 * you most likely came to do.
 *
 * Every list page had been writing its own — different type sizes, different
 * gaps, the action sometimes above the title and sometimes beside it. The
 * pages read as a set now because the header is one component rather than
 * eight near-copies.
 *
 * `action` is a node, not an href, so a page can pass a link, a button that
 * opens a dialog, or nothing at all without this needing to know which.
 */
export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Baseline, not centre: the action is a control and the title is text,
        // and centring them leaves the button looking dropped when the
        // subtitle wraps to a second line.
        "flex flex-wrap items-start justify-between gap-x-4 gap-y-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.015em] text-ink">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export interface Tab {
  id: string;
  label: string;
  /** Shown after the label, for a count. Omitted rather than shown as 0. */
  count?: number;
}

/**
 * The row of view switches under a page header.
 *
 * A tablist, not a row of buttons: arrow keys move between tabs and only the
 * selected one is a tab stop, which is what a screen reader and a keyboard
 * both expect from something announced as tabs. Getting that wrong is the
 * usual cost of drawing tabs by hand.
 */
export function Tabs({
  tabs,
  value,
  onChange,
  className,
  label = "View",
}: {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  /** Names the tablist for assistive technology. */
  label?: string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, tabs.findIndex((t) => t.id === value));

  function move(delta: number) {
    const next = (index + delta + tabs.length) % tabs.length;
    // Selection follows focus, which is correct for tabs whose panels are
    // already loaded — arrowing across them shows each one rather than
    // requiring a second keypress to commit.
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex items-center gap-1 border-b border-line", className)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
        else if (e.key === "Home") { e.preventDefault(); onChange(tabs[0].id); refs.current[0]?.focus(); }
        else if (e.key === "End") {
          e.preventDefault();
          onChange(tabs[tabs.length - 1].id);
          refs.current[tabs.length - 1]?.focus();
        }
      }}
    >
      {tabs.map((t, i) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative -mb-px shrink-0 px-3 py-2 text-[13.5px] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              selected
                ? "font-medium text-ink"
                : "text-ink-3 hover:text-ink",
            )}
          >
            {t.label}
            {typeof t.count === "number" && t.count > 0 ? (
              <span className="ml-1.5 text-[12px] tabular-nums text-ink-4">
                {t.count}
              </span>
            ) : null}
            {/* The underline is a child rather than a border on the button, so
                it can sit flush on the container's own border without the
                one-pixel argument between the two. */}
            {selected ? (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
