import * as React from "react";

import { cn } from "@/lib/utils";

/** One titled box in settings. Every section is built from these. */
export function Panel({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  /** A muted strip along the bottom, usually holding the save button. */
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[var(--r-panel)] border border-line bg-rail",
        className,
      )}
    >
      <div className="px-5 pb-5 pt-4.5">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-[64ch] text-[13px] leading-relaxed text-ink-3">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
      {footer ? (
        <div className="flex items-center justify-between gap-3 border-t border-line bg-sunk px-5 py-3">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

/**
 * A labelled row inside a panel.
 *
 * Stacks on a phone and sits side by side from `sm` up, so a long value has
 * the whole width on a narrow screen instead of being squeezed into a column
 * beside its own label.
 */
export function Row({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 sm:max-w-[46%]">
        <span className="block text-[13.5px] text-ink">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[12px] leading-snug text-ink-4">
            {hint}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 sm:flex-1 sm:text-right">{children}</div>
    </div>
  );
}

/** The shared field styling, so inputs across settings match. */
export const fieldClass =
  "w-full rounded-[var(--r-control)] border border-line-strong bg-sunk px-3 py-2 text-[16px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-accent sm:text-[13.5px]";
