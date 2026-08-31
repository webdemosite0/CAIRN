"use client";

import Link from "next/link";
import { FiClock, FiCornerUpLeft } from "react-icons/fi";
import type { Recent } from "@/lib/recents";
import { SavedMenu } from "@/components/ui/saved-menu";
import { cn } from "@/lib/utils";

function ago(ts: number) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

/**
 * The strip under a page's composer. Two modes: `onPick` re-runs the prompt in
 * place, `href` navigates. Renders nothing at all when there is no history —
 * an empty "Recents" heading is worse than no heading.
 *
 * `manage` adds the rename/delete menu. It is off by default because the same
 * strip appears in places where the row is a shortcut rather than the item
 * itself, and offering to delete something from a page that only borrowed it
 * reads as a different, more alarming action than it is.
 */
export function Recents({
  label,
  items,
  onPick,
  manage = false,
  emptyHint,
  className,
}: {
  label: string;
  items: Recent[];
  onPick?: (title: string) => void;
  /** Show the per-row rename and delete menu. */
  manage?: boolean;
  /**
   * What to say when there is nothing here yet. Supplied only by pages where
   * this strip is the library — elsewhere the strip is a shortcut, and a
   * shortcut with nothing behind it is better left out than explained.
   */
  emptyHint?: string;
  className?: string;
}) {
  if (!items.length) {
    if (!emptyHint) return null;
    return (
      <section className={cn("nx-in", className)} aria-label={label}>
        <div className="rounded-[var(--r-panel)] border border-dashed border-line-strong px-5 py-7 text-center">
          <p className="text-[13px] leading-relaxed text-ink-3">{emptyHint}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("nx-in", className)} aria-label={label}>
      <h2 className="mb-2.5 flex items-center gap-1.5 px-0.5 text-[11.5px] font-medium uppercase tracking-[0.1em] text-ink-4">
        <FiClock size={11} />
        {label}
      </h2>

      <ul className="flex flex-col gap-1">
        {items.map((r, i) => {
          const body = (
            <>
              <FiCornerUpLeft
                size={12}
                className="shrink-0 text-ink-4 transition-colors group-hover:text-accent"
              />
              <span className="min-w-0 flex-1 truncate">{r.title}</span>
              <span className="shrink-0 text-[11.5px] tabular-nums text-ink-4">
                {ago(r.createdAt)}
              </span>
            </>
          );

          const shell = cn(
            "flex w-full min-w-0 items-center gap-2.5 rounded-[var(--r-control)] border border-transparent",
            "px-3 py-2 text-left text-[13.5px] text-ink-2 transition-colors duration-[var(--t-hover)]",
            "hover:border-line hover:bg-rail hover:text-ink",
          );

          return (
            <li
              key={r.id}
              // `group` moved from the link to the row so the menu button,
              // which sits beside the link rather than inside it, is revealed
              // by hovering anywhere on the row.
              className="nx-in group relative flex items-center gap-0.5"
              style={{
                animationDelay: `${i * 45}ms`,
                animationFillMode: "backwards",
              }}
            >
              {r.href ? (
                <Link href={r.href} className={shell}>
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => onPick?.(r.title)}
                  className={shell}
                >
                  {body}
                </button>
              )}

              {/* Only rows backed by a saved conversation can be renamed or
                  deleted. Older rows recorded a prompt and nothing else, so
                  there is no stored item behind them to act on. */}
              {manage && r.conversationId ? (
                <SavedMenu id={r.conversationId} title={r.title} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
