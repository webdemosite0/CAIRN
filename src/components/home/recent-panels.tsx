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
  const shown = items.slice(0, 3);

  return (
    <section className="rounded-[12px] border border-line bg-canvas p-4 shadow-[var(--sh-1)]">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-medium text-ink">Continue where you left off</h2>
        {items.length > 3 ? (
          <Link href="/dashboard" className="text-[12.5px] text-accent hover:underline">
            View all
          </Link>
        ) : null}
      </header>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <TroveOrb size={30} state="idle" />
          <p className="text-[13.5px] text-ink-3">Nothing here yet</p>
          <p className="max-w-[34ch] text-[12.5px] text-ink-4">
            Describe something above and it will show up here so you can pick it
            back up.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r, i) => {
            const m = metaFor(r.kind);
            return (
              <Link
                key={r.id}
                href={r.href || "/chat"}
                className={cn(
                  "nx-in group flex flex-col overflow-hidden rounded-[10px] border border-line bg-canvas",
                  "transition-[transform,border-color,box-shadow] duration-200",
                  "hover:-translate-y-[2px] hover:border-line-strong hover:shadow-[var(--sh-2)]",
                )}
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
              >
                {/* A tinted field standing in for a thumbnail. Honest: there is
                    no screenshot of this artefact, so it does not pretend. */}
                <span
                  aria-hidden
                  className="grid h-[92px] place-items-center border-b border-line"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in oklab, ${m.tone} 16%, transparent), transparent 70%), var(--color-sunk)`,
                  }}
                >
                  <m.icon size={22} style={{ color: m.tone }} />
                </span>

                <span className="flex flex-col gap-0.5 p-3">
                  <span className="truncate text-[13px] font-medium text-ink">
                    {r.title || "Untitled"}
                  </span>
                  <span className="text-[11.5px] text-ink-4">{m.label}</span>
                  <span className="mt-1 text-[11px] text-ink-4">
                    Edited {relativeTime(r.createdAt)}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
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
    <section className="rounded-[12px] border border-line bg-canvas p-4 shadow-[var(--sh-1)]">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-medium text-ink">Recent activity</h2>
        {items.length > 6 ? (
          <Link href="/dashboard" className="text-[12.5px] text-accent hover:underline">
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
                className="nx-in flex items-center gap-2.5 rounded-[6px] px-1 py-1.5"
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
