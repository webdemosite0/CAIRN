"use client";

import Link from "next/link";
import { FiMenu } from "react-icons/fi";
import { Lockup } from "@/components/brand/logo";
import { useNav } from "@/components/shell/nav-state";
import { Ico } from "@/components/ui/ico";

/**
 * Narrow-screen header. Sits in normal flow at the top of the main column, so
 * nothing overlaps page content the way a floating button did.
 */
export function MobileBar() {
  const { setOpen } = useNav();

  return (
    <header className="nx-no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-canvas/90 px-3 backdrop-blur-md lg:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="group grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
      >
        <Ico icon={FiMenu} motion="pop" size={18} />
      </button>
      <Link href="/chat" aria-label="Trove home">
        <Lockup size={22} />
      </Link>
    </header>
  );
}
