"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Categorical columns render as coloured pills rather than bare text — an
 * assignee or a status is a label, and a wall of identical grey strings is what
 * makes a generated table look like debug output instead of a real sheet.
 *
 * The hue is derived from the value itself, so the same person keeps the same
 * colour across every row and across reloads without anything being stored.
 */
const TAG_HUES = [
  "var(--tag-a)",
  "var(--tag-b)",
  "var(--tag-c)",
  "var(--tag-d)",
  "var(--tag-e)",
  "var(--tag-f)",
];

/**
 * FNV-1a with an avalanche finalizer. A plain `h * 31 + c` rolling hash bunches
 * short similar strings into the same bucket — five names came out as three
 * colours — because the low bits barely move between them.
 */
function hueFor(value: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  // `^=` yields a SIGNED 32-bit int, so without this the index could come out
  // negative and hand back undefined — which rendered as uncoloured ink.
  h = (h ^ (h >>> 16)) >>> 0;
  return TAG_HUES[h % TAG_HUES.length];
}

export function Cell({
  value,
  header,
  tag,
  active,
  label,
  onChange,
  onFocus,
}: {
  value: string;
  /** The first row is the sheet's own header. */
  header: boolean;
  /** This column holds short repeating labels, so draw a pill. */
  tag: boolean;
  active: boolean;
  label: string;
  onChange: (v: string) => void;
  onFocus: () => void;
}) {
  // A pill is not editable, so clicking one swaps it for the real input.
  const [editing, setEditing] = useState(false);
  const showPill = tag && !header && !editing && value.trim().length > 0;

  if (showPill) {
    const hue = hueFor(value.trim().toLowerCase());
    return (
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          setEditing(true);
          onFocus();
        }}
        className="flex w-full items-center px-2.5 py-[7px] text-left"
      >
        <span
          className="max-w-full truncate rounded-full px-2.5 py-[3px] text-[12px] font-medium"
          style={{
            background: `color-mix(in oklab, ${hue} 14%, transparent)`,
            color: hue,
          }}
        >
          {value}
        </span>
      </button>
    );
  }

  return (
    <input
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={() => setEditing(false)}
      autoFocus={editing}
      className={cn(
        "w-full bg-transparent px-3 py-[7px] outline-none",
        header
          ? "font-semibold text-ink"
          : active
            ? "text-ink"
            : "text-ink-2",
      )}
    />
  );
}
