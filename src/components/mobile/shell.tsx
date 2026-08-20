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
  TbCreditCard,
  TbDots,
  TbLogout,
} from "react-icons/tb";
import { logOut } from "@/app/actions/auth";
import { TroveOrb } from "@/components/brand/orb";
import { ThemeToggle } from "@/components/shell/theme";
import { Sheet } from "@/components/mobile/sheet";
import type { Balance } from "@/lib/credits";
import { cn } from "@/lib/utils";

/**
 * The mobile chrome: a thin top bar, and a tab bar in the thumb zone.
 *
 * Not a narrow version of the sidebar. The desktop rail lists nineteen
 * destinations, which is fine in a column you scan with your eyes and useless
 * on a bar you reach with one thumb — so the bar carries four, and everything
 * else lives behind two sheets that open from the bottom edge.
 *
 * The centre button is deliberately the odd one out. Making something is the
 * reason to open this app on a phone, and burying it in a menu makes the whole
 * UI read as a viewer for work done elsewhere.
 */

interface Dest {
  href: string;
  label: string;
  icon: IconType;
}

/** Four, because a fifth makes every target too narrow to hit at 360px. */
const TABS: Dest[] = [
  { href: "/dashboard", label: "Home", icon: TbLayoutDashboard },
  { href: "/chat", label: "Chat", icon: TbMessageCircle },
  { href: "/agents", label: "Agents", icon: TbRobot },
];

/** What the centre button offers. Ordered by what people actually ask for. */
const CREATE: (Dest & { blurb: string })[] = [
  { href: "/websites", label: "Website", icon: TbWorld, blurb: "A real site you can download" },
  { href: "/documents", label: "Document", icon: TbFileText, blurb: "Exports as .docx" },
  { href: "/spreadsheets", label: "Spreadsheet", icon: TbTable, blurb: "Exports as .xlsx" },
  { href: "/slides", label: "Slides", icon: TbPresentation, blurb: "Exports as .pptx" },
  { href: "/agents", label: "Agent", icon: TbRobot, blurb: "A specialist you can brief" },
  { href: "/code", label: "Code", icon: TbCode, blurb: "Node, React or Python" },
  { href: "/design", label: "Design", icon: TbPalette, blurb: "Layouts and artwork" },
];

/** Everything the tab bar has no room for. */
const MORE: Dest[] = [
  { href: "/team", label: "AI Team", icon: TbUsers },
  { href: "/research", label: "Research", icon: TbSearch },
  { href: "/reminders", label: "Reminders", icon: TbBell },
  { href: "/integrations", label: "Integrations", icon: TbPlugConnected },
  { href: "/plans", label: "Credits and plans", icon: TbCreditCard },
  { href: "/settings", label: "Settings", icon: TbSettings },
];

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
  const [sheet, setSheet] = React.useState<"create" | "more" | null>(null);

  // Close whatever is open on navigation. Derived from the path rather than
  // reset in an effect, for the same reason as everywhere else here.
  const [sheetPath, setSheetPath] = React.useState(pathname);
  if (pathname !== sheetPath) {
    setSheetPath(pathname);
    if (sheet) setSheet(null);
  }

  const title =
    [...TABS, ...MORE, ...CREATE].find((d) => isActive(pathname, d.href))?.label ?? "Trove";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas">
      {/* ---------------- top bar ---------------- */}
      <header className="nx-no-print sticky top-0 z-30 border-b border-line bg-canvas/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex h-13 items-center gap-2.5 px-4">
          <TroveOrb size={26} state="idle" />
          <span className="min-w-0 flex-1 truncate text-[15.5px] font-semibold text-ink">
            {title}
          </span>
          {balance ? (
            <Link
              href="/plans"
              className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-medium tabular-nums text-accent"
            >
              {balance.remaining > 999
                ? `${Math.round(balance.remaining / 1000)}k`
                : balance.remaining}
            </Link>
          ) : null}
        </div>
      </header>

      {/* Bottom padding clears the tab bar, which is fixed and would otherwise
          sit on top of the last thing on the page. */}
      <main className="min-w-0 flex-1 pb-[calc(env(safe-area-inset-bottom)+76px)]">
        {children}
      </main>

      {/* ---------------- tab bar ---------------- */}
      <nav
        aria-label="Main"
        className="nx-no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      >
        <div className="flex h-[60px] items-stretch justify-around px-1">
          {TABS.slice(0, 2).map((t) => (
            <Tab key={t.href} dest={t} active={isActive(pathname, t.href)} />
          ))}

          <button
            type="button"
            onClick={() => setSheet("create")}
            aria-label="Create something"
            aria-haspopup="dialog"
            className="relative -mt-4 grid h-[52px] w-[52px] shrink-0 place-items-center self-start rounded-full btn-grad shadow-[0_8px_20px_-6px_rgba(108,92,231,0.7)] active:scale-95"
          >
            <FiPlus size={24} />
          </button>

          {TABS.slice(2).map((t) => (
            <Tab key={t.href} dest={t} active={isActive(pathname, t.href)} />
          ))}

          <button
            type="button"
            onClick={() => setSheet("more")}
            aria-haspopup="dialog"
            className={cn(
              "flex min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-[10px] text-[10.5px] font-medium",
              MORE.some((d) => isActive(pathname, d.href)) ? "text-accent" : "text-ink-4",
            )}
          >
            <TbDots size={21} />
            More
          </button>
        </div>
      </nav>

      {/* ---------------- sheets ---------------- */}
      <Sheet
        open={sheet === "create"}
        onClose={() => setSheet(null)}
        title="What do you want to make?"
      >
        <ul className="space-y-0.5 pb-1">
          {CREATE.map((c) => (
            <li key={c.label}>
              <Link
                href={c.href}
                className="flex items-center gap-3.5 rounded-[12px] px-3 py-3 active:bg-hover"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sunk text-ink">
                  <c.icon size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium text-ink">{c.label}</span>
                  <span className="block truncate text-[12.5px] text-ink-4">{c.blurb}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={sheet === "more"} onClose={() => setSheet(null)}>
        {user ? (
          <div className="mb-2 flex items-center gap-3 px-3 pb-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet/25 text-[17px] font-semibold text-ink">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-medium text-ink">{user.name}</span>
              <span className="block truncate text-[12.5px] text-ink-4">{user.email}</span>
            </span>
          </div>
        ) : null}

        <ul className="space-y-0.5 border-t border-line pt-2">
          {MORE.map((d) => (
            <li key={d.href}>
              <Link
                href={d.href}
                className="flex items-center gap-3.5 rounded-[12px] px-3 py-3 text-[15px] text-ink active:bg-hover"
              >
                <d.icon size={20} className="shrink-0 text-ink" />
                {d.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-2 flex items-center justify-between border-t border-line px-3 pt-3">
          <ThemeToggle />
          <form action={logOut}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[14px] font-medium text-ink-3 active:bg-hover"
            >
              <TbLogout size={17} />
              Sign out
            </button>
          </form>
        </div>
      </Sheet>
    </div>
  );
}

function Tab({ dest, active }: { dest: Dest; active: boolean }) {
  return (
    <Link
      href={dest.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-[10px] text-[10.5px] font-medium",
        active ? "text-accent" : "text-ink-4",
      )}
    >
      <dest.icon size={21} />
      {dest.label}
    </Link>
  );
}
