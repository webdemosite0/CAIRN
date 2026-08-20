"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

/**
 * A panel that rises from the bottom edge.
 *
 * The mobile equivalent of the desktop Modal, and a different component rather
 * than a prop on it, because almost nothing is shared: this is anchored to one
 * edge, sized by its content, dismissed by a swipe as well as a tap, and has
 * to clear the home indicator. A single component doing both ends up being two
 * components in a trench coat.
 *
 * Dragging down past a third of its height closes it. That threshold is on
 * distance rather than velocity deliberately — a flick and a slow drag should
 * both need the same commitment, and velocity makes the control feel twitchy
 * on a list that also scrolls.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const mounted = useMounted();
  const [drag, setDrag] = React.useState(0);
  const start = React.useRef<number | null>(null);
  const panel = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const { body } = document;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Reset the drag offset whenever open flips, or a sheet closed mid-drag
  // reopens already pushed halfway down. Adjusted during render rather than in
  // an effect: an effect here is a setState-in-effect cascade, and React
  // documents this exact pattern for state derived from a prop changing.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setDrag(0);
  }

  if (!mounted || !open) return null;

  const finish = () => {
    const height = panel.current?.offsetHeight ?? 1;
    if (drag > height / 3) onClose();
    else setDrag(0);
    start.current = null;
  };

  return createPortal(
    <div className="nx-no-print fixed inset-0 z-[120] flex flex-col justify-end">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="nx-fade absolute inset-0 cursor-default bg-[rgba(6,6,9,0.6)]"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Menu"}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        onTouchStart={(e) => {
          start.current = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          if (start.current === null) return;
          const delta = e.touches[0].clientY - start.current;
          // Downward only. Dragging up should not stretch the sheet.
          if (delta > 0) setDrag(delta);
        }}
        onTouchEnd={finish}
        onTouchCancel={finish}
        className={cn(
          "nx-sheet-in relative max-h-[85vh] overflow-y-auto rounded-t-[20px] border-t border-line bg-raised",
          "pb-[calc(env(safe-area-inset-bottom)+16px)]",
          drag ? "transition-none" : "transition-transform duration-200",
        )}
      >
        {/* The grab handle. Doubles as the affordance that this can be dragged
            away, which nothing else on the sheet communicates. */}
        <div className="sticky top-0 z-10 flex justify-center bg-raised pb-1 pt-2.5">
          <span aria-hidden className="h-1 w-9 rounded-full bg-line-strong" />
        </div>

        {title ? (
          <h2 className="px-5 pb-1 pt-1 text-[15px] font-semibold text-ink">{title}</h2>
        ) : null}

        <div className="px-3 pt-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
