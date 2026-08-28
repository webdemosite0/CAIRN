"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  TbLayoutDashboard,
  TbBell,
  TbPlugConnected,
  TbSettings,
  TbCreditCard,
} from "react-icons/tb";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: IconType;
  href: string;
  keys?: string;
}

/** Every destination is a route that exists — nothing here 404s. */
const COMMANDS: Command[] = [
  { id: "new", label: "New chat", hint: "Start something", icon: TbMessageCircle, href: "/chat", keys: "⌘K" },
  { id: "website", label: "Build a website", hint: "Plan, then build", icon: TbWorld, href: "/websites", keys: "⌘1" },
  { id: "agent", label: "Create an agent", hint: "A specialist with a brief", icon: TbRobot, href: "/agents", keys: "⌘2" },
  { id: "code", label: "Write code", hint: "Complete and runnable", icon: TbCode, href: "/code", keys: "⌘3" },
  { id: "doc", label: "Write a document", hint: "Exports to Word", icon: TbFileText, href: "/documents", keys: "⌘4" },
  { id: "sheet", label: "Build a spreadsheet", hint: "Exports to Excel", icon: TbTable, href: "/spreadsheets", keys: "⌘5" },
  { id: "research", label: "Research a topic", hint: "Findings and open questions", icon: TbSearch, href: "/research", keys: "⌘6" },
  { id: "slides", label: "Build a deck", hint: "Present, then export", icon: TbPresentation, href: "/slides" },
  { id: "design", label: "Design a screen", hint: "Palette, type, spacing", icon: TbPalette, href: "/design" },
  { id: "team", label: "Run the AI team", hint: "Four specialists, one task", icon: TbUsers, href: "/team" },
  { id: "home", label: "Home", hint: "Dashboard", icon: TbLayoutDashboard, href: "/dashboard" },
  { id: "reminders", label: "Reminders", hint: "Notify me later", icon: TbBell, href: "/reminders" },
  { id: "integrations", label: "Integrations", hint: "Connect a service", icon: TbPlugConnected, href: "/integrations" },
  { id: "plans", label: "Plan and usage", hint: "Credits and limits", icon: TbCreditCard, href: "/plans" },
  { id: "settings", label: "Settings", hint: "Account and appearance", icon: TbSettings, href: "/settings" },
];

/** Subsequence match, so "bws" finds "Build a website". */
function score(cmd: Command, q: string): number {
  if (!q) return 1;
  const hay = `${cmd.label} ${cmd.hint}`.toLowerCase();
  const needle = q.toLowerCase();
  if (hay.includes(needle)) return 100 - hay.indexOf(needle);

  let i = 0;
  for (const ch of needle) {
    i = hay.indexOf(ch, i);
    if (i === -1) return 0;
    i++;
  }
  return 1;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () =>
      COMMANDS.map((c) => ({ c, s: score(c, q) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.c),
    [q],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setActive(0);
  }, []);

  const go = useCallback(
    (cmd: Command | undefined) => {
      if (!cmd) return;
      close();
      router.push(cmd.href);
    },
    [close, router],
  );

  // Cmd/Ctrl+K opens; Escape closes. Bound to the window so it works from
  // anywhere, but never while the user is mid-word in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-i="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
      <button
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="nx-stage relative w-full max-w-[560px] overflow-hidden rounded-[var(--r-panel)] border border-line bg-raised shadow-[var(--sh-3)]"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <TbSearch size={17} className="shrink-0 text-ink-4" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(results[active]);
              }
            }}
            placeholder="Search Trove…"
            className="w-full bg-transparent py-3.5 text-[14.5px] text-ink outline-none placeholder:text-ink-4"
          />
          <kbd className="shrink-0 rounded-[var(--r-tight)] border border-line px-1.5 py-0.5 text-[10.5px] text-ink-4">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink-4">
              Nothing matches “{q}”.
            </p>
          ) : (
            results.map((c, i) => (
              <button
                key={c.id}
                data-i={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(c)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--r-control)] px-3 py-2.5 text-left transition-colors",
                  i === active ? "bg-hover" : "hover:bg-hover/60",
                )}
              >
                <c.icon
                  size={17}
                  className="shrink-0 text-ink"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-ink">{c.label}</span>
                  <span className="block truncate text-[11.5px] text-ink-4">{c.hint}</span>
                </span>
                {c.keys ? (
                  <kbd className="shrink-0 rounded-[var(--r-tight)] bg-sunk px-1.5 py-0.5 text-[10.5px] tabular-nums text-ink-4">
                    {c.keys}
                  </kbd>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
