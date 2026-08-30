"use client";

import { TbWorld, TbRobot, TbSearch, TbFileText } from "react-icons/tb";
import { FiArrowRight } from "react-icons/fi";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";

/**
 * Somewhere to start, for a workspace with nothing in it yet.
 *
 * These fill the composer rather than navigating away, so the first thing a
 * new person does is see their intent appear in the box they will keep using —
 * the point being taught is "describe it here", not "click through to a tool".
 *
 * Always shown. They are shortcuts rather than filler for an empty page —
 * someone with a full workspace still wants a one-tap way to start the next
 * thing.
 */
export interface Starter {
  icon: IconType;
  label: string;
  prompt: string;
  copy: string;
  tone: string;
  preview: "site" | "agent" | "doc" | "research";
}

const STARTERS: Starter[] = [
  {
    icon: TbWorld,
    label: "Build a website",
    prompt: "Create a polished landing page for my startup",
    copy: "A complete, responsive site from one description.",
    tone: "#7c6fff",
    preview: "site",
  },
  {
    icon: TbRobot,
    label: "Create an AI agent",
    prompt: "Build a customer support agent that answers common questions",
    copy: "A specialist with its own brief and memory.",
    tone: "#a78bfa",
    preview: "agent",
  },
  {
    icon: TbSearch,
    label: "Research something",
    prompt: "Research the AI agent market and summarise the key players",
    copy: "Findings kept apart from what it could not verify.",
    tone: "#22d3ee",
    preview: "research",
  },
  {
    icon: TbFileText,
    label: "Write a document",
    prompt: "Write a professional business proposal for a design retainer",
    copy: "Polished, and downloads as real Word.",
    tone: "#60a5fa",
    preview: "doc",
  },
];

/** A very small drawing of what the card produces. Deliberately faint. */
function Preview({ kind, tone }: { kind: Starter["preview"]; tone: string }) {
  const bar = (w: string, o = 0.28) => (
    <span className="block h-[3px] rounded-full" style={{ width: w, background: tone, opacity: o }} />
  );

  if (kind === "site") {
    return (
      <span className="flex flex-col gap-1">
        {bar("40%", 0.5)}
        {bar("70%")}
        <span className="mt-0.5 flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-3 flex-1 rounded-[var(--r-tight)]" style={{ background: tone, opacity: 0.14 }} />
          ))}
        </span>
      </span>
    );
  }
  if (kind === "agent") {
    return (
      <span className="flex flex-col gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: tone, opacity: i === 2 ? 0.4 : 0.85 }}
            />
            {bar(i === 1 ? "80%" : "60%")}
          </span>
        ))}
      </span>
    );
  }
  if (kind === "research") {
    return (
      <span className="flex flex-col gap-1">
        {bar("30%", 0.5)}
        {bar("88%")}
        {bar("72%")}
        {bar("54%")}
      </span>
    );
  }
  return (
    <span className="flex flex-col gap-1">
      {bar("52%", 0.5)}
      {bar("100%")}
      {bar("92%")}
      {bar("66%")}
    </span>
  );
}

export function StarterCards({
  onPick,
  className,
}: {
  /** Fills the composer with this text. */
  onPick: (prompt: string) => void;
  className?: string;
}) {
  return (
    <section className={className} aria-labelledby="starter-heading">
      <h2
        id="starter-heading"
        className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-4"
      >
        Start with something
      </h2>

      <div className="nx-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STARTERS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onPick(s.prompt)}
            className={cn(
              "group flex flex-col rounded-[var(--r-card)] border border-line bg-canvas p-4 text-left",
              "shadow-[var(--sh-1)] transition-[transform,border-color,box-shadow] duration-[var(--t-hover)]",
              "hover:-translate-y-[2px] hover:border-accent/35 hover:shadow-[var(--sh-2)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
            )}
          >
            <span className="flex items-center gap-2.5">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r-control)]"
                style={{ background: `color-mix(in srgb, ${s.tone} 14%, transparent)` }}
              >
                <s.icon size={16} style={{ color: `color-mix(in srgb, ${s.tone}, #000 var(--tint-darken))` }} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
                {s.label}
              </span>
              <FiArrowRight
                size={14}
                className="shrink-0 text-ink-4 transition-transform duration-[var(--t-hover)] group-hover:translate-x-0.5"
              />
            </span>

            <span className="mt-2.5 block text-[12.5px] leading-relaxed text-ink-3">
              {s.copy}
            </span>

            <span className="mt-3.5 block rounded-[var(--r-control)] border border-line bg-sunk p-2.5">
              <Preview kind={s.preview} tone={s.tone} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
