"use client";

import Link from "next/link";
import { TbSearch, TbBell, TbHelpCircle } from "react-icons/tb";
import { FiMenu } from "react-icons/fi";
import { useNav } from "@/components/shell/nav-state";
import { cn } from "@/lib/utils";
import { Ico } from "@/components/ui/ico";

/**
 * The bar above every page: search, and the two things that are always
 * reachable.
 *
 * The search field is a button rather than an input. It opens the command
 * palette, which is where search actually lives — a second input that silently
 * forwarded keystrokes to a different one would be two places to type with one
 * behaviour between them.
 */
export function TopBar({ initial }: { initial?: string }) {
  const { setOpen } = useNav();

  const openPalette = () =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );

  return (
    <header className="nx-no-print sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur-xl lg:px-5">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] text-ink-3 transition-colors hover:bg-hover hover:text-ink sm:h-9 sm:w-9 lg:hidden"
      >
        <Ico icon={FiMenu} motion="menu" size={18} />
      </button>

      <button
        onClick={openPalette}
        className={cn(
          "group flex h-9 min-w-0 max-w-[420px] flex-1 items-center gap-2.5 rounded-[8px]",
          "border border-line bg-sunk px-3 text-left transition-colors",
          "hover:border-line-strong hover:bg-hover",
        )}
      >
        <Ico icon={TbSearch} motion="scan" size={16} className="shrink-0 text-ink-4" />
        <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-4">
          Search anything…
        </span>
        <kbd className="shrink-0 rounded-[4px] border border-line px-1.5 py-0.5 text-[10.5px] tabular-nums text-ink-4">
          ⌘K
        </kbd>
      </button>

      <span className="flex-1" />

      <Link
        href="/reminders"
        aria-label="Reminders"
        title="Reminders"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] text-ink-3 transition-colors hover:bg-hover hover:text-ink sm:h-9 sm:w-9"
      >
        <Ico icon={TbBell} motion="ring" size={18} />
      </Link>
      <Link
        href="/plans"
        aria-label="Plan and usage"
        title="Plan and usage"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] text-ink-3 transition-colors hover:bg-hover hover:text-ink sm:h-9 sm:w-9"
      >
        <Ico icon={TbHelpCircle} motion="pop" size={18} />
      </Link>
      <Link
        href="/settings"
        aria-label="Account"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft sm:h-8 sm:w-8 text-[12px] font-semibold text-accent transition-transform duration-150 hover:scale-105"
      >
        {(initial ?? "Y").slice(0, 1).toUpperCase()}
      </Link>
    </header>
  );
}
