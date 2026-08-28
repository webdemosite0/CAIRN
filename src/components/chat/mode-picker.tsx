"use client";

import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import type { IconType } from "react-icons";
import { TbBolt, TbScale, TbTelescope, TbSparkles } from "react-icons/tb";
import { MODE_LIST, MODES, type ModeId } from "@/lib/modes";
import { cn } from "@/lib/utils";
import { Ico } from "@/components/ui/ico";

/** One icon per mode. Tabler, matching the navigation, so the set stays one
  * family rather than a fifth library imported for four glyphs. */
const ICON: Record<ModeId, IconType> = {
  fast: TbBolt,
  balanced: TbScale,
  deep: TbTelescope,
  creative: TbSparkles,
};

/**
 * Picks how the model answers.
 *
 * Each option sets a real temperature that reaches the API, so the choice
 * changes the reply. It sits where a model selector would in most products;
 * there is no model choice here because every model in the fallback chain is a
 * Flash variant, and a dropdown that reshuffles equivalent options is just
 * furniture.
 */
export function ModePicker({
  value,
  onChange,
  disabled,
  compact = false,
  touch = false,
}: {
  value: ModeId;
  onChange: (id: ModeId) => void;
  disabled?: boolean;
  /** Tighter, for a narrow side panel. */
  compact?: boolean;
  /** 44px tall, for a finger. Wins over compact when both are set. */
  touch?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  /** Which option to focus once the menu exists. A ref, not state: nothing
   *  renders from it, and storing it in state would mean setting state from
   *  the effect that consumes it. */
  const landOn = useRef<number | null>(null);

  /** Opens with a given option focused, so the keyboard lands somewhere. */
  function openAt(index: number) {
    landOn.current = index;
    setOpen(true);
  }

  // The menu does not exist on the frame that opens it, so the focus has to
  // wait for the commit. An effect, not requestAnimationFrame: rAF is tied to
  // the frame loop, and a throttled or backgrounded tab never runs it — which
  // would leave the menu open with focus stranded on the trigger, exactly the
  // state a keyboard user cannot get out of.
  useEffect(() => {
    if (!open || landOn.current === null) return;
    items.current[landOn.current]?.focus();
    landOn.current = null;
  }, [open]);

  function close({ restore = true } = {}) {
    setOpen(false);
    if (restore) trigger.current?.focus();
  }

  /** Wraps, so Down from the last option reaches the first. */
  function step(from: number, delta: number) {
    const n = MODE_LIST.length;
    items.current[(from + delta + n) % n]?.focus();
  }

  const checkedIndex = Math.max(0, MODE_LIST.findIndex((m) => m.id === value));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      // A click outside is a dismissal, not a cancellation: pulling focus back
      // to the trigger would yank the page away from wherever they clicked.
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    // Escape belongs on the document, not on the menu: focus may still be on
    // the trigger (a mouse user never moved it), and a dismissal that only
    // works from inside the thing being dismissed is not a dismissal.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative shrink-0">
      <button
        ref={trigger}
        type="button"
        onClick={() => (open ? close({ restore: false }) : openAt(checkedIndex))}
        onKeyDown={(e) => {
          // Down opens on the first option, Up on the last — the convention
          // every native select follows, and the reason Up exists at all.
          if (e.key === "ArrowDown") {
            e.preventDefault();
            openAt(open ? 0 : checkedIndex);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            openAt(MODE_LIST.length - 1);
          }
        }}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        title="How loosely Trove answers"
        className={cn(
          "tap-44 group flex items-center gap-1.5 rounded-[var(--r-chip)] text-ink-3 transition-colors",
          "hover:bg-hover hover:text-ink disabled:opacity-40",
          touch
            ? "h-11 rounded-full px-3.5 text-[13.5px]"
            : compact
              ? "px-1.5 py-1 text-[11.5px]"
              : "px-2 py-1.5 text-[12.5px]",
        )}
      >
        {(() => {
          const Glyph = ICON[value];
          return <Glyph size={touch ? 16 : compact ? 13 : 15} className="shrink-0 text-accent" />;
        })()}
        <span className={touch ? "" : "hidden sm:inline"}>{MODES[value].label}</span>
        <FiChevronDown
          size={12}
          className={cn(
            "transition-transform duration-[var(--t-hover)] ease-[var(--ease-ui)]",
            open && "rotate-180",
          )}
        />
      </button>

      {open && touch ? (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="nx-fade fixed inset-0 z-40 cursor-default bg-[rgba(4,5,10,0.6)]"
        />
      ) : null}

      {open ? (
        <div
          role="menu"
          onKeyDown={(e) => {
            const i = items.current.indexOf(e.target as HTMLButtonElement);
            if (e.key === "ArrowDown") { e.preventDefault(); step(i, 1); }
            else if (e.key === "ArrowUp") { e.preventDefault(); step(i, -1); }
            else if (e.key === "Home") { e.preventDefault(); items.current[0]?.focus(); }
            else if (e.key === "End") { e.preventDefault(); items.current[MODE_LIST.length - 1]?.focus(); }
            // Tab leaves the menu entirely rather than walking its options —
            // a popup you can Tab out of while it stays open loses its
            // dismissal, and the next Tab lands somewhere behind it.
            else if (e.key === "Tab") close({ restore: false });
          }}
          className={cn(
            "nx-in z-50 overflow-hidden border border-line bg-raised shadow-[var(--sh-3)]",
            touch
              ? // Anchored to the viewport, not the trigger. The trigger sits
                // partway across the composer, so a 264px panel hung off its
                // left edge ran 17px past the screen at 320px wide. Pinning it
                // to the bottom always fits and puts the options under a thumb.
                "fixed inset-x-3 bottom-3 rounded-[var(--r-card)]"
              : "absolute bottom-full left-0 mb-2 w-[264px] rounded-[var(--r-panel)]",
          )}
        >
          {MODE_LIST.map((m, i) => (
            <button
              key={m.id}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={m.id === value}
              // One stop for the whole menu: arrows move within it, Tab leaves.
              tabIndex={m.id === value ? 0 : -1}
              onClick={() => {
                onChange(m.id);
                close();
              }}
              className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-hover"
            >
              <span
                className={cn(
                  "mt-px grid h-6 w-6 shrink-0 place-items-center rounded-[var(--r-chip)]",
                  m.id === value ? "bg-accent-soft text-accent" : "text-ink-3",
                )}
              >
                {(() => {
                  const Glyph = ICON[m.id];
                  return <Glyph size={14} />;
                })()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ink">{m.label}</span>
                <span className="block text-[11.5px] leading-snug text-ink-4">
                  {m.blurb}
                </span>
              </span>
              {m.id === value ? (
                <Ico icon={FiCheck} motion="check" size={14} className="mt-1 shrink-0 text-accent" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
