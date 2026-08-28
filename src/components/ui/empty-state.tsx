import * as React from "react";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";

/**
 * What a list looks like before it has anything in it.
 *
 * Deliberately says what to do next rather than only what is missing: "No
 * agents yet" is a dead end, "Build your first agent" plus a button is a
 * starting point.
 *
 * Takes either a plain `icon`, which is framed in the usual circle, or a whole
 * `illustration` for pages that have a drawing of their own — the agents page
 * has one, and swapping it for a generic glyph to fit the primitive would make
 * the page worse.
 *
 * `action` is a node rather than an href so this stays a server component:
 * most of these sit on server-rendered pages, and the one caller that needs a
 * click handler passes its own client button in.
 */
export function EmptyState({
  icon: Icon,
  illustration,
  title,
  body,
  action,
  className,
}: {
  icon?: IconType;
  illustration?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "nx-in flex flex-col items-center rounded-[var(--r-panel)] border border-dashed border-line-strong px-6 py-16 text-center",
        className,
      )}
    >
      {illustration ?? (
        Icon ? (
          <span className="grid h-11 w-11 place-items-center rounded-full bg-sunk text-ink-3">
            <Icon size={19} />
          </span>
        ) : null
      )}

      <h2 className="mt-5 text-[16px] font-semibold text-ink">{title}</h2>

      {body ? (
        <p className="mt-1.5 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-3">
          {body}
        </p>
      ) : null}

      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
