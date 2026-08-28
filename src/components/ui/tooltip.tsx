"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Side = "top" | "bottom" | "left" | "right";

/**
 * A label that appears on hover or keyboard focus.
 *
 * Wraps its child rather than rendering a trigger of its own, so it can go
 * around a button, a link or an icon without changing what that element is.
 *
 * Shown on focus as well as hover: an icon-only control whose only
 * explanation appears on hover is unusable by keyboard. The text is also
 * mirrored into aria-label on the wrapper, because a visual tooltip is not
 * announced by a screen reader.
 *
 * Not a replacement for a visible label on anything important — a tooltip is
 * for a hint, and hints are invisible on touch, where there is no hover.
 */
export function Tooltip({
  label,
  side = "top",
  delay = 350,
  children,
  className,
}: {
  label: string;
  side?: Side;
  delay?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const [shown, setShown] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  React.useEffect(() => clear, [clear]);

  const show = () => {
    clear();
    timer.current = setTimeout(() => setShown(true), delay);
  };
  const hide = () => {
    clear();
    setShown(false);
  };

  const pos: Record<Side, string> = {
    top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
    bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
    left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
    right: "left-full top-1/2 ml-1.5 -translate-y-1/2",
  };

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={() => setShown(true)}
      onBlurCapture={hide}
      // Escape dismisses it, matching every other transient layer here.
      onKeyDown={(e) => {
        if (e.key === "Escape") hide();
      }}
    >
      {children}
      {shown ? (
        <span
          role="tooltip"
          className={cn(
            "nx-fade pointer-events-none absolute z-[90] whitespace-nowrap rounded-[var(--r-chip)] border border-line bg-raised px-2 py-1 text-[12px] font-medium text-ink shadow-[var(--elev)]",
            pos[side],
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
