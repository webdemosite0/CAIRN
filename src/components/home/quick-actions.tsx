"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TbWorld,
  TbRobot,
  TbCode,
  TbFileText,
  TbTable,
  TbSearch,
} from "react-icons/tb";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";

interface Action {
  href: string;
  label: string;
  icon: IconType;
  /** The digit pressed with Cmd/Ctrl. */
  key: string;
}

/**
 * Shortcuts into the tools, grouped by intent rather than listed flat.
 *
 * These are not filters — each one goes somewhere — so they are links with a
 * keyboard shortcut rather than pills. Every href is a route that exists.
 */
const GROUPS: { label: string; actions: Action[] }[] = [
  {
    label: "Build",
    actions: [
      { href: "/websites", label: "Website", icon: TbWorld, key: "1" },
      { href: "/agents", label: "Agent", icon: TbRobot, key: "2" },
      { href: "/code", label: "Code", icon: TbCode, key: "3" },
    ],
  },
  {
    label: "Create",
    actions: [
      { href: "/documents", label: "Document", icon: TbFileText, key: "4" },
      { href: "/spreadsheets", label: "Spreadsheet", icon: TbTable, key: "5" },
    ],
  },
  {
    // Named Explore rather than Research so the group has room for
    // more than one kind of looking-things-up later.
    label: "Explore",
    actions: [{ href: "/research", label: "Research", icon: TbSearch, key: "6" }],
  },
];

const ALL = GROUPS.flatMap((g) => g.actions);

export function QuickActions({ className }: { className?: string }) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      const hit = ALL.find((a) => a.key === e.key);
      if (!hit) return;
      e.preventDefault();
      router.push(hit.href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className={cn("flex flex-wrap items-start gap-x-6 gap-y-4", className)}>
      {GROUPS.map((g) => (
        <div key={g.label} className="min-w-0">
          <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            {g.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {g.actions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={cn(
                  // A fixed height, so every action lines up whatever the label.
                  "group flex h-[50px] items-center gap-2 rounded-[var(--r-panel)] border border-line bg-canvas",
                  "px-3.5 text-[13.5px] text-ink-2",
                  "transition-[transform,border-color,background-color] duration-[var(--t-hover)]",
                  "hover:-translate-y-[1px] hover:border-accent/40 hover:bg-accent/[0.04] hover:text-ink",
                )}
              >
                <a.icon size={17} className="shrink-0 text-ink-4 transition-colors group-hover:text-accent" />
                {a.label}
                <kbd className="ml-1 rounded-[var(--r-chip)] border border-line bg-sunk px-1.5 py-0.5 font-sans text-[10.5px] tabular-nums text-ink-4">
                  ⌘{a.key}
                </kbd>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
