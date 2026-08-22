"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IconType } from "react-icons";
import { FiArrowRight } from "react-icons/fi";
import {
  TbLayoutGrid,
  TbWorld,
  TbFileText,
  TbRobot,
} from "react-icons/tb";
import { Ico, type Motion } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

/**
 * The first screen, built around the box rather than around a paragraph.
 *
 * A landing page for a tool you type into should put the thing you type into
 * at the optical centre and let everything else explain it. The previous hero
 * put prose on the left and a picture of the product on the right, which meant
 * the one interactive element on the page was a button labelled "Start
 * building" that led somewhere else entirely.
 *
 * What is typed here survives signing in: it goes to /chat?q=…, middleware
 * carries the whole path through ?next=, and the composer opens with it
 * already in the box. Losing someone's first sentence at the login wall is the
 * fastest way to make them not write a second one.
 */

interface Lane {
  id: string;
  label: string;
  icon: IconType;
  motion: Motion;
  placeholder: string;
  examples: string[];
}

const LANES: Lane[] = [
  {
    id: "site",
    label: "Websites",
    icon: TbWorld,
    motion: "spin",
    placeholder: "Build a landing page for my specialty coffee roastery…",
    examples: ["Landing page", "Portfolio", "Online shop", "Booking site"],
  },
  {
    id: "docs",
    label: "Documents",
    icon: TbFileText,
    motion: "stack",
    placeholder: "Write a project proposal for a six-week design retainer…",
    examples: ["Proposal", "Report", "Postmortem", "Spreadsheet"],
  },
  {
    id: "agents",
    label: "Agents",
    icon: TbRobot,
    motion: "scan",
    placeholder: "Create an agent that answers questions about our pricing…",
    examples: ["Support agent", "Researcher", "Editor", "Analyst"],
  },
  {
    id: "code",
    label: "Code",
    icon: TbLayoutGrid,
    motion: "type",
    placeholder: "Write a TypeScript function that parses a CSV safely…",
    examples: ["API endpoint", "Migration", "Test suite", "CLI tool"],
  },
];

export function Hero({ freeCredits }: { freeCredits: number }) {
  const router = useRouter();
  const [lane, setLane] = useState(LANES[0]);
  const [value, setValue] = useState("");

  function go(text: string) {
    const idea = text.trim();
    if (!idea) return;
    // Signed out, middleware bounces this to /login?next=… and brings it back.
    router.push(`/chat?q=${encodeURIComponent(idea.slice(0, 2000))}`);
  }

  return (
    <section className="relative px-5 pb-16 pt-14 lg:pb-24 lg:pt-20">
      <div className="spotlight" />

      <div className="relative mx-auto max-w-[880px] text-center">
        <h1 className="nx-rise-big text-[clamp(2.5rem,1.4rem+3.4vw,4.25rem)] font-semibold leading-[1.04] tracking-[-0.025em] text-ink">
          Describe it once.{" "}
          {/* One phrase in accent, not the whole line — the emphasis has to
              land on the promise, and a fully coloured headline emphasises
              nothing. */}
          <span className="text-accent">Keep the file.</span>
        </h1>

        <p
          className="nx-rise mx-auto mt-5 max-w-[52ch] text-[17.5px] leading-relaxed text-ink-3"
          style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
        >
          An AI workspace that turns a sentence into finished work — websites,
          documents, spreadsheets, code and agents you can actually download.
        </p>

        {/* The lanes change the placeholder and the examples below, so picking
            one changes what the page is offering rather than just which pill
            is highlighted. */}
        <div
          className="nx-rise mt-8 flex flex-wrap items-center justify-center gap-2"
          style={{ animationDelay: "110ms", animationFillMode: "backwards" }}
          role="tablist"
          aria-label="What to build"
        >
          {LANES.map((l) => {
            const on = l.id === lane.id;
            return (
              <button
                key={l.id}
                role="tab"
                aria-selected={on}
                onClick={() => setLane(l)}
                className={cn(
                  "group flex h-10 items-center gap-2 rounded-[10px] border px-3.5 text-[13.5px] font-medium transition-colors",
                  on
                    ? "border-line-strong bg-raised text-ink shadow-[var(--elev)]"
                    : "border-transparent text-ink-3 hover:bg-hover hover:text-ink",
                )}
              >
                <Ico icon={l.icon} motion={l.motion} size={15} active={on} />
                {l.label}
              </button>
            );
          })}
        </div>

        <div
          className="nx-rise mt-5 text-left"
          style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              go(value);
            }}
            className="composer rounded-[18px] border bg-raised shadow-[var(--sh-2)]"
          >
            <label className="sr-only" htmlFor="hero-idea">
              Describe what to build
            </label>
            <textarea
              id="hero-idea"
              rows={2}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  go(value);
                }
              }}
              placeholder={lane.placeholder}
              className="block max-h-[180px] w-full resize-none bg-transparent px-5 pb-3 pt-5 text-[16.5px] leading-[1.6] text-ink outline-none placeholder:text-ink-4"
            />
            <div className="flex items-center gap-2 px-3.5 pb-3.5">
              <span className="flex-1" />
              <button
                type="submit"
                disabled={!value.trim()}
                className={cn(
                  "group flex h-11 items-center gap-2 rounded-[10px] px-5 text-[14.5px] font-semibold transition-all duration-200",
                  value.trim() ? "btn-grad hover:scale-[1.02]" : "bg-sunk text-ink-4",
                )}
              >
                Build it
                <Ico icon={FiArrowRight} motion="nudge" size={16} />
              </button>
            </div>
          </form>
        </div>

        {/* Filling the box rather than navigating away — the point being taught
            is "describe it here". */}
        <div
          className="nx-rise mt-5 flex flex-wrap items-center justify-center gap-2"
          style={{ animationDelay: "210ms", animationFillMode: "backwards" }}
        >
          <span className="text-[13px] text-ink-4">Try one</span>
          {lane.examples.map((e) => (
            <button
              key={e}
              onClick={() => setValue(`${e} — `)}
              className="rounded-full border border-line bg-rail px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:bg-hover hover:text-ink"
            >
              {e}
            </button>
          ))}
        </div>

        <p
          className="nx-rise mt-7 text-[13.5px] text-ink-4"
          style={{ animationDelay: "260ms", animationFillMode: "backwards" }}
        >
          {/* A real number from lib/credits, not a claim about how many people
              use this. */}
          Free to start · {freeCredits.toLocaleString()} credits every month · no card required
        </p>
      </div>
    </section>
  );
}
