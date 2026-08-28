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

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
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
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        title="How loosely Trove answers"
        className={cn(
          "tap-44 group flex items-center gap-1.5 rounded-[7px] text-ink-3 transition-colors",
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
          className={cn("transition-transform duration-200", open && "rotate-180")}
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
          className={cn(
            "nx-in z-50 overflow-hidden border border-line bg-raised shadow-[var(--sh-3)]",
            touch
              ? // Anchored to the viewport, not the trigger. The trigger sits
                // partway across the composer, so a 264px panel hung off its
                // left edge ran 17px past the screen at 320px wide. Pinning it
                // to the bottom always fits and puts the options under a thumb.
                "fixed inset-x-3 bottom-3 rounded-[16px]"
              : "absolute bottom-full left-0 mb-2 w-[264px] rounded-[12px]",
          )}
        >
          {MODE_LIST.map((m) => (
            <button
              key={m.id}
              type="button"
              role="menuitemradio"
              aria-checked={m.id === value}
              onClick={() => {
                onChange(m.id);
                setOpen(false);
              }}
              className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-hover"
            >
              <span
                className={cn(
                  "mt-px grid h-6 w-6 shrink-0 place-items-center rounded-[7px]",
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
