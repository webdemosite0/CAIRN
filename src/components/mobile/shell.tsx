"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import { FiPlus } from "react-icons/fi";
import {
  TbLayoutDashboard,
  TbMessageCircle,
  TbRobot,
  TbWorld,
  TbFileText,
  TbTable,
  TbPresentation,
  TbPalette,
  TbCode,
  TbSearch,
  TbUsers,
  TbBell,
  TbPlugConnected,
  TbSettings,
  TbLayoutSidebar,
  TbRefreshDot,
  TbLogout,
} from "react-icons/tb";
import { logOut } from "@/app/actions/auth";
import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shell/theme";
import { Drawer } from "@/components/mobile/drawer";
import type { Balance } from "@/lib/credits";
import { cn } from "@/lib/utils";
import { Ico } from "@/components/ui/ico";

/**
 * The mobile chrome: a thin top bar and a navigation drawer.
 *
 * The bottom tab bar this replaces could hold four destinations. There are
 * sixteen, so four were being picked by guessing which mattered and the rest
 * sat two taps deep behind a "More" sheet. A drawer shows the whole list at
 * once, which is the honest shape for a flat set this long.
 *
 * Everything here is layout. Colour, type, the mark and the motion tokens are
 * the desktop ones unchanged — this is the same product, not a second skin.
 */

interface Dest {
  href: string;
  label: string;
  icon: IconType;
}

/** Grouped the way the desktop rail groups them, so the two agree. */
const GROUPS: { label: string; items: Dest[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Home", icon: TbLayoutDashboard },
      { href: "/chat", label: "AI Workspace", icon: TbMessageCircle },
      { href: "/team", label: "AI Team", icon: TbUsers },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/websites", label: "Websites", icon: TbWorld },
      { href: "/agents", label: "Agents", icon: TbRobot },
      { href: "/code", label: "Code", icon: TbCode },
      { href: "/documents", label: "Docs", icon: TbFileText },
      { href: "/spreadsheets", label: "Sheets", icon: TbTable },
      { href: "/slides", label: "Slides", icon: TbPresentation },
      { href: "/design", label: "Design", icon: TbPalette },
    ],
  },
  {
    label: "Explore",
    items: [
      { href: "/research", label: "Deep Research", icon: TbSearch },
      { href: "/reminders", label: "Reminders", icon: TbBell },
      { href: "/workflows", label: "Workflows", icon: TbRefreshDot },
      { href: "/integrations", label: "Integrations", icon: TbPlugConnected },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function MobileShell({
  children,
  user,
  balance,
}: {
  children: React.ReactNode;
  user: { name: string; email: string } | null;
  balance: Balance | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // Close on navigation, derived from the path rather than reset in an effect.
  const [navPath, setNavPath] = React.useState(pathname);
  if (pathname !== navPath) {
    setNavPath(pathname);
    if (open) setOpen(false);
  }

  const title = ALL.find((d) => isActive(pathname, d.href))?.label ?? "Trove";
  const onHome = pathname === "/chat";

  return (
    <div className="nx-mobile flex min-h-[100dvh] flex-col bg-canvas">
      {/* ---------------- top bar ---------------- */}
      <header className="nx-no-print sticky top-0 z-30 bg-canvas/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex h-14 items-center gap-2 px-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-haspopup="dialog"
            className="press grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-ink-3 transition-colors active:bg-hover"
          >
            <Ico icon={TbLayoutSidebar} motion="panel" size={21} />
          </button>

          {/* Redundant on the home screen, where the wordmark below is already
              the largest thing on the page. */}
          {onHome ? (
            <span className="flex-1" />
          ) : (
            <span className="min-w-0 flex-1 truncate text-[15.5px] font-semibold text-ink">
              {title}
            </span>
          )}

          {balance ? (
            <Link
              href="/plans"
              className="press flex h-[38px] shrink-0 items-center gap-1 rounded-full border border-line px-3.5 text-[12.5px] font-medium tabular-nums text-ink-2 transition-colors active:bg-hover"
            >
              <span className="text-accent">✦</span>{" "}
              {balance.remaining > 999
                ? `${Math.round(balance.remaining / 1000)}k`
                : balance.remaining}
            </Link>
          ) : null}
        </div>
      </header>

      <main className="min-w-0 flex-1 pb-[env(safe-area-inset-bottom)]">{children}</main>

      {/* ---------------- drawer ---------------- */}
      <Drawer open={open} onClose={() => setOpen(false)}>
        <div className="flex items-center justify-between px-4 pb-1 pt-4">
          <span className="flex items-center gap-2">
            <TroveOrb size={26} state="idle" />
            <Wordmark size={16} sweep={false} />
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="press grid h-9 w-9 place-items-center rounded-[9px] text-ink-3 transition-colors active:bg-hover"
          >
            <Ico icon={TbLayoutSidebar} motion="panel" size={19} />
          </button>
        </div>

        <div className="px-3 pt-3">
          <Link
            href="/chat"
            className="press flex h-12 items-center gap-2.5 rounded-[12px] border border-line bg-raised px-3.5 text-[15px] font-medium text-ink transition-colors active:bg-hover"
          >
            <Ico icon={FiPlus} motion="grow" size={18} className="text-accent" />
            New chat
          </Link>
        </div>

        <nav aria-label="Main" className="mt-3 flex-1 overflow-y-auto px-3 pb-2">
          {GROUPS.map((g, i) => (
            <div key={g.label} className={cn(i > 0 && "mt-4")}>
              <div className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-4">
                {g.label}
              </div>
              <div className="nx-stagger space-y-0.5">
                {g.items.map((d) => {
                  const active = isActive(pathname, d.href);
                  return (
                    <Link
                      key={d.href}
                      href={d.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-[14.5px] transition-colors duration-150",
                        active ? "rail-item-active" : "text-ink-2 active:bg-hover",
                      )}
                    >
                      <d.icon size={19} className="shrink-0 text-ink" />
                      {d.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-3 py-3">
          {user ? (
            <div className="mb-2 flex items-center gap-3 rounded-[10px] px-2 py-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet/25 text-[14px] font-semibold text-ink">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-ink">
                  {user.name}
                </span>
                <span className="block truncate text-[12px] text-ink-4">{user.email}</span>
              </span>
              <form action={logOut}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="press grid h-9 w-9 place-items-center rounded-[9px] text-ink-4 transition-colors active:bg-hover"
                >
                  <Ico icon={TbLogout} motion="exit" size={17} />
                </button>
              </form>
            </div>
          ) : null}

          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
            <Link
              href="/settings"
              aria-label="Settings"
              className="press grid h-9 w-9 place-items-center rounded-[9px] text-ink-3 transition-colors active:bg-hover"
            >
              <Ico icon={TbSettings} motion="spin" size={19} />
            </Link>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
