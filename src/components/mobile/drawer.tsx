"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

/**
 * The navigation panel, sliding in from the left edge.
 *
 * Replaces the bottom tab bar. A tab bar can hold four destinations; this app
 * has sixteen, and the four that fit were chosen by guessing which ones matter
 * — a drawer just shows them all, which is the honest answer when the list is
 * that long and that flat.
 *
 * Dragging left past a third of its width closes it, matching the direction it
 * arrived from. The threshold is on distance rather than velocity so a flick
 * and a slow drag need the same commitment.
 */
export function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
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

  // Adjusted during render rather than in an effect: an effect here is a
  // setState-in-effect cascade, and this is the pattern React documents for
  // state derived from a prop changing.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setDrag(0);
  }

  if (!mounted || !open) return null;

  const finish = () => {
    const width = panel.current?.offsetWidth ?? 1;
    if (-drag > width / 3) onClose();
    else setDrag(0);
    start.current = null;
  };

  return createPortal(
    <div className="nx-no-print fixed inset-0 z-[120] flex">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="nx-fade absolute inset-0 cursor-default bg-[rgba(4,5,10,0.66)]"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        style={{ transform: drag ? `translateX(${drag}px)` : undefined }}
        onTouchStart={(e) => {
          start.current = e.touches[0].clientX;
        }}
        onTouchMove={(e) => {
          if (start.current === null) return;
          const delta = e.touches[0].clientX - start.current;
          // Leftward only — dragging right should not stretch the panel.
          if (delta < 0) setDrag(delta);
        }}
        onTouchEnd={finish}
        onTouchCancel={finish}
        className={cn(
          "nx-drawer-in relative flex w-[80%] max-w-[300px] flex-col border-r border-line bg-rail",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          drag ? "transition-none" : "transition-transform duration-[var(--t-hover)]",
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
