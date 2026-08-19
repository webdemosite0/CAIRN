"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

/**
 * A centred dialog.
 *
 * Portalled to <body> so a modal opened from inside the rail is not clipped by
 * the rail's own overflow, and is not painted under `main` by a stacking
 * context somewhere up the tree.
 *
 * Focus is moved into the panel on open and returned to whatever opened it on
 * close, and Tab is trapped inside while it is up — a dialog you can Tab out of
 * silently strands keyboard users behind the scrim.
 *
 * Rendering nothing when closed (rather than hiding with CSS) keeps the
 * children unmounted, so a form inside resets between openings.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const panel = React.useRef<HTMLDivElement>(null);
  const restoreTo = React.useRef<HTMLElement | null>(null);
  const mounted = useMounted();

  React.useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;

    // The page behind must not scroll under the scrim. The scrollbar is
    // replaced with equivalent padding so the layout does not jump sideways.
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    const focusables = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    const first = focusables()[0] ?? panel.current;
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      restoreTo.current?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const width =
    size === "sm" ? "max-w-[400px]" : size === "lg" ? "max-w-[760px]" : "max-w-[540px]";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="nx-fade absolute inset-0 cursor-default bg-[rgba(6,6,9,0.62)] backdrop-blur-[2px]"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          // Column layout with a capped height so a tall body scrolls inside
          // the panel and the title and footer stay put, rather than the whole
          // dialog growing past the viewport.
          "nx-reveal relative flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-[12px] border border-line bg-raised shadow-[var(--elev)] outline-none",
          width,
        )}
      >
        <div className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
            {description ? (
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-[6px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            <FiX size={16} />
          </button>
        </div>

        {children ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 text-[14px] leading-relaxed text-ink-2">
            {children}
          </div>
        ) : null}

        {footer ? (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
