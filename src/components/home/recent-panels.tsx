"use client";

import Link from "next/link";
import {
  TbWorld,
  TbRobot,
  TbCode,
  TbFileText,
  TbTable,
  TbSearch,
  TbPresentation,
  TbPalette,
  TbUsers,
  TbMessageCircle,
} from "react-icons/tb";
import type { IconType } from "react-icons";
import type { Recent, RecentKind } from "@/lib/recents";
import { relativeTime } from "@/lib/time";
import { TroveOrb } from "@/components/brand/orb";
import { cn } from "@/lib/utils";

const META: Record<RecentKind, { label: string; icon: IconType; tone: string }> = {
  chat: { label: "Chat", icon: TbMessageCircle, tone: "var(--color-accent)" },
  site: { label: "Website", icon: TbWorld, tone: "#38bdf8" },
  agent: { label: "AI Agent", icon: TbRobot, tone: "#a78bfa" },
  team: { label: "AI Team", icon: TbUsers, tone: "#f472b6" },
  code: { label: "Code", icon: TbCode, tone: "#34d399" },
  docs: { label: "Document", icon: TbFileText, tone: "#60a5fa" },
  sheets: { label: "Spreadsheet", icon: TbTable, tone: "#4ade80" },
  slides: { label: "Slides", icon: TbPresentation, tone: "#fbbf24" },
  design: { label: "Design", icon: TbPalette, tone: "#f472b6" },
  research: { label: "Research", icon: TbSearch, tone: "#22d3ee" },
};

const metaFor = (k: RecentKind) => META[k] ?? META.chat;

/**
 * What you were last working on.
 *
 * Every card is a real saved item with its real timestamp — the panel is empty
 * when you have not made anything yet, rather than showing sample projects that
 * would look like work you had done and lost.
 */
export function ContinuePanel({ items }: { items: Recent[] }) {
  // Five across on a wide screen, matching the strip in the design. More than
  // that and each thumbnail is too small to tell the projects apart.
  const shown = items.slice(0, 5);

  if (shown.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <TroveOrb size={30} state="idle" />
        <p className="text-[13.5px] text-ink-3">Nothing here yet</p>
        <p className="max-w-[34ch] text-[12.5px] text-ink-4">
          Describe something above and it will show up here so you can pick it
          back up.
        </p>
      </div>
    );
  }

  return (
    <section className="min-w-0">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[14px] font-medium text-ink">Recent creations</h2>
        {items.length > shown.length ? (
          <Link href="/dashboard" className="tap-44 text-[12.5px] text-accent hover:underline">
            View all
          </Link>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {shown.map((r, i) => {
          const m = metaFor(r.kind);
          return (
            <Link
              key={r.id}
              href={r.href || "/chat"}
              title={`${r.title || "Untitled"} — edited ${relativeTime(r.createdAt)}`}
              className={cn(
                "nx-in group min-w-0",
                "transition-transform duration-200 hover:-translate-y-[2px]",
              )}
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
            >
              {/* A tinted field, not a screenshot. There is no render of this
                  artefact, and a fake preview image would be a picture of work
                  that was never done. The tint is the kind's own colour, so the
                  row is still scannable by type. */}
              <span
                aria-hidden
                className="mb-2 grid h-[86px] place-items-center rounded-[var(--r-panel)] border border-line transition-colors group-hover:border-line-strong"
                style={{
                  background: `linear-gradient(150deg, color-mix(in oklab, ${m.tone} 70%, #0b0b12) 0%, #0b0b12 90%)`,
                }}
              >
                <m.icon size={20} className="text-white/85" />
              </span>

              <span className="block truncate text-[13px] font-medium text-ink">
                {r.title || "Untitled"}
              </span>
              <span className="block text-[11.5px] text-ink-4">{m.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/**
 * A feed of what actually happened, newest first.
 *
 * Built from the same saved rows as the cards, so every line corresponds to a
 * real thing at a real time. Inventing entries here — "Research Agent found 18
 * sources" — would read well and be a fabrication presented as history.
 */
export function ActivityPanel({ items }: { items: Recent[] }) {
  const shown = items.slice(0, 6);

  return (
    <section className="min-w-0 rounded-[var(--r-panel)] border border-line bg-canvas p-4 shadow-[var(--sh-1)]">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-medium text-ink">Recent activity</h2>
        {items.length > 6 ? (
          <Link href="/dashboard" className="tap-44 text-[12.5px] text-accent hover:underline">
            View all
          </Link>
        ) : null}
      </header>

      {shown.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-ink-4">
          Your activity will appear here.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {shown.map((r, i) => {
            const m = metaFor(r.kind);
            return (
              <li
                key={r.id}
                className="nx-in flex items-center gap-2.5 rounded-[var(--r-chip)] px-1 py-1.5"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: m.tone }}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">
                  <span className="text-ink-3">{m.label}</span>
                  {" · "}
                  {r.title || "Untitled"}
                </span>
                <span className="shrink-0 text-[11.5px] tabular-nums text-ink-4">
                  {relativeTime(r.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
