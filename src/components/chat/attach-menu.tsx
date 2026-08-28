"use client";

import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { FiPlus } from "react-icons/fi";
import { TbPhoto, TbFileText, TbFileCode, TbPaperclip } from "react-icons/tb";
import { Ico, type Motion } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

/**
 * The + button, and what it opens.
 *
 * Each entry sets a different `accept` on the file input, so choosing "Photos"
 * genuinely opens the OS picker filtered to images. That is the whole reason
 * this is a menu rather than one paperclip: on a phone, an image filter is the
 * difference between the photo library and a file browser.
 *
 * Anything the model cannot read is still accepted by the last entry and
 * labelled "not readable" once attached — refusing it at the picker would hide
 * the reason.
 */

const IMAGES = "image/png,image/jpeg,image/webp,image/heic,image/heif";
const DOCS = "application/pdf";
const CODE =
  "text/*,.txt,.md,.markdown,.csv,.tsv,.json,.jsonc,.yml,.yaml,.toml,.ini,.env,.log," +
  ".html,.htm,.css,.scss,.less,.js,.jsx,.ts,.tsx,.mjs,.cjs,.py,.rb,.go,.rs,.java,.kt," +
  ".swift,.c,.h,.cpp,.hpp,.cs,.php,.sh,.bash,.zsh,.sql,.graphql,.xml,.svg";

const OPTIONS: {
  id: string;
  label: string;
  hint: string;
  icon: IconType;
  motion: Motion;
  accept?: string;
}[] = [
  { id: "image", label: "Photo", hint: "PNG, JPEG, WebP", icon: TbPhoto, motion: "lift", accept: IMAGES },
  { id: "pdf", label: "Document", hint: "PDF", icon: TbFileText, motion: "stack", accept: DOCS },
  { id: "code", label: "Text or code", hint: "Read as text", icon: TbFileCode, motion: "type", accept: CODE },
  { id: "any", label: "Any file", hint: "Browse everything", icon: TbPaperclip, motion: "nudge" },
];

export function AttachMenu({
  onPick,
  disabled = false,
  compact = false,
}: {
  /** Called with the accept filter for the chosen kind. */
  onPick: (accept?: string) => void;
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
        aria-label="Attach"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Attach a photo, document or file"
        className={cn(
          "tap-44 group grid place-items-center rounded-full border border-line text-ink-3 transition-colors hover:border-line-strong hover:bg-hover hover:text-ink disabled:opacity-40",
          compact ? "size-7" : "size-9",
        )}
      >
        <Ico
          icon={FiPlus}
          motion="open"
          size={compact ? 15 : 17}
          className={cn("transition-transform duration-200", open && "rotate-45")}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="nx-in absolute bottom-[calc(100%+8px)] left-0 z-50 w-[228px] overflow-hidden rounded-[var(--r-panel)] border border-line bg-raised p-1 shadow-[var(--sh-2)]"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onPick(o.accept);
              }}
              className="group flex w-full items-center gap-2.5 rounded-[var(--r-control)] px-2.5 py-2 text-left transition-colors hover:bg-hover"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-[var(--r-chip)] bg-sunk text-ink-2">
                <Ico icon={o.icon} motion={o.motion} size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-ink">{o.label}</span>
                <span className="block text-[11.5px] text-ink-4">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
