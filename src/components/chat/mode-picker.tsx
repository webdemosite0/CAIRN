"use client";

import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import { TroveOrb } from "@/components/brand/orb";
import { MODE_LIST, MODES, type ModeId } from "@/lib/modes";
import { cn } from "@/lib/utils";

/**
 * Picks how loosely the model answers.
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
}: {
  value: ModeId;
  onChange: (id: ModeId) => void;
  disabled?: boolean;
  compact?: boolean;
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
          "group flex items-center gap-1.5 rounded-[7px] text-ink-3 transition-colors",
          "hover:bg-hover hover:text-ink disabled:opacity-40",
          compact ? "px-1.5 py-1 text-[11.5px]" : "px-2 py-1.5 text-[12.5px]",
        )}
      >
        <TroveOrb size={compact ? 13 : 15} state="idle" />
        <span className="hidden sm:inline">{MODES[value].label}</span>
        <FiChevronDown
          size={12}
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="nx-in absolute bottom-full left-0 z-50 mb-2 w-[248px] overflow-hidden rounded-[8px] border border-line bg-raised shadow-[var(--sh-3)]"
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
              <span className="mt-0.5 w-3.5 shrink-0">
                {m.id === value ? <FiCheck size={13} className="text-accent" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-ink">{m.label}</span>
                <span className="block text-[11.5px] leading-snug text-ink-4">
                  {m.blurb}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
