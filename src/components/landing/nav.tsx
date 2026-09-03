"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiMenu, FiX } from "react-icons/fi";
import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shell/theme";
import { cn } from "@/lib/utils";

/**
 * The landing header.
 *
 * Compacts on scroll rather than being tall and staying tall. The scroll
 * listener is passive and only ever flips one boolean, so it does no work
 * beyond a comparison on most frames.
 *
 * Every link points at a section on this page or a route that exists — there
 * is no Solutions or Resources here, because neither exists to link to.
 */
/**
 * Anchors point within the landing page; paths are real pages.
 *
 * The anchors only resolve on "/", so this nav is rendered on the feature and
 * pricing pages too — where "#pricing" would scroll to nothing. They are
 * written as "/#pricing" for that reason: on the landing page the browser
 * treats it as an in-page jump, and anywhere else it navigates home and then
 * jumps.
 */
const LINKS = [
  { href: "/#capabilities", label: "Product" },
  { href: "/features/ai-agents", label: "Agents" },
  { href: "/features/documents-and-spreadsheets", label: "Files" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[height,background-color,border-color,backdrop-filter] duration-[var(--t-hover)]",
        scrolled
          ? "border-b border-line bg-canvas/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1140px] items-center gap-3 px-5 transition-[height] duration-[var(--t-hover)] lg:px-8",
          scrolled ? "h-14" : "h-16",
        )}
      >
        <Link href="/" aria-label="Trove" className="flex shrink-0 items-center gap-2">
          <TroveOrb size={22} state="idle" />
          <Wordmark size={16} sweep={false} />
        </Link>

        <nav aria-label="Sections" className="ml-6 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-[var(--r-chip)] px-3 py-2 text-[14px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <span className="flex-1" />

        <div className="hidden items-center gap-1.5 sm:flex">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-[var(--r-chip)] px-3 py-2 text-[14px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/chat"
            className="btn-grad group flex h-9 items-center gap-1.5 rounded-[var(--r-control)] px-4 text-[13.5px] font-medium"
          >
            Start building
            <FiArrowRight
              size={14}
              className="transition-transform duration-[var(--t-hover)] group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid h-9 w-9 place-items-center rounded-[var(--r-control)] text-ink-2 transition-colors hover:bg-hover sm:hidden"
        >
          {open ? <FiX size={19} /> : <FiMenu size={19} />}
        </button>
      </div>

      {open ? (
        <div className="nx-in border-t border-line bg-canvas px-5 py-3 sm:hidden">
          <nav aria-label="Sections" className="flex flex-col">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-[var(--r-chip)] px-2 py-2.5 text-[15px] text-ink-2 transition-colors hover:bg-hover"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-[var(--r-chip)] px-3 py-2 text-[14px] text-ink-2 hover:bg-hover"
            >
              Sign in
            </Link>
            <Link
              href="/chat"
              className="btn-grad ml-auto flex h-9 items-center rounded-[var(--r-control)] px-4 text-[13.5px] font-medium"
            >
              Start building
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
