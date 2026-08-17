"use client";

import Link from "next/link";
import { FiClock, FiCornerUpLeft } from "react-icons/fi";
import type { Recent } from "@/lib/recents";
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
 */
export function Recents({
  label,
  items,
  onPick,
  className,
}: {
  label: string;
  items: Recent[];
  onPick?: (title: string) => void;
  className?: string;
}) {
  if (!items.length) return null;

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
            "group flex w-full items-center gap-2.5 rounded-[10px] border border-transparent",
            "px-3 py-2 text-left text-[13.5px] text-ink-2 transition-colors duration-150",
            "hover:border-line hover:bg-rail hover:text-ink",
          );

          return (
            <li
              key={r.id}
              className="nx-in"
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
