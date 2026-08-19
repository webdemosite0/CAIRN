"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import {
  FiPlus,
  FiSidebar,
  FiX,
  FiUser,
  FiLogOut,
} from "react-icons/fi";
import {
  TbBell,
  TbUsers,
  TbRobot,
  TbWorld,
  TbLayoutDashboard,
  TbFileText,
  TbTable,
  TbPresentation,
  TbPalette,
  TbCode,
  TbSearch,
} from "react-icons/tb";
import { LogoMark, Lockup } from "@/components/brand/logo";
import { logOut } from "@/app/actions/auth";
import { useNav } from "@/components/shell/nav-state";
import { ThemeToggle } from "@/components/shell/theme";
import { Ico, type Motion } from "@/components/ui/ico";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/auth";
import type { Balance } from "@/lib/credits";
import { CreditMeter } from "@/components/shell/credit-meter";

interface Item {
  href: string;
  label: string;
  icon: IconType;
  motion: Motion;
}

/** Five things you work *in*. */
const primary: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: TbLayoutDashboard, motion: "pop" },
  { href: "/websites", label: "Website Builder", icon: TbWorld, motion: "spin" },
  { href: "/agents", label: "AI Agents", icon: TbRobot, motion: "tilt" },
  { href: "/team", label: "AI Team", icon: TbUsers, motion: "tilt" },
  { href: "/reminders", label: "Reminders", icon: TbBell, motion: "ring" },
];

/** Six things that make one artefact each. */
const create: Item[] = [
  { href: "/code", label: "Code", icon: TbCode, motion: "type" },
  { href: "/documents", label: "Documents", icon: TbFileText, motion: "lift" },
  { href: "/spreadsheets", label: "Spreadsheets", icon: TbTable, motion: "pop" },
  { href: "/slides", label: "Slides", icon: TbPresentation, motion: "grow" },
  { href: "/design", label: "Design", icon: TbPalette, motion: "hue" },
  { href: "/research", label: "Research", icon: TbSearch, motion: "scan" },
];

const main: Item[] = [...primary, ...create];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavRow({
  item,
  pathname,
  onNavigate,
}: {
  item: Item;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn("rail-item group", active && "rail-item-active")}
    >
      {/* Monochrome, inheriting the row's colour — so the only colour in the
          rail is the one active item, which turns brand purple. Eleven
          different tints made the nav read as a toybox. */}
      <Ico
        icon={item.icon}
        motion={item.motion}
        active={active}
        className={cn(
          "shrink-0 transition-colors duration-150",
          active ? "text-accent" : "text-ink-4 group-hover:text-ink-2",
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function RailBody({
  user,
  balance,
  onNavigate,
  onCollapse,
}: {
  user: User | null;
  balance: Balance | null;
  onNavigate?: () => void;
  onCollapse?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center justify-between px-3.5 pt-3.5">
        <Link href="/chat" onClick={onNavigate} aria-label="Trove home">
          <Lockup size={26} />
        </Link>
        {onCollapse ? (
          <button
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            className="group grid h-8 w-8 place-items-center rounded-[8px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            <Ico icon={FiSidebar} motion="nudge" size={17} />
          </button>
        ) : null}
      </div>

      <div className="px-3 pt-4">
        <Link
          href="/chat"
          onClick={onNavigate}
          className="group flex items-center justify-center gap-2 rounded-[8px] bg-accent px-3 py-2.5 text-[13.5px] font-medium text-white shadow-[var(--elev)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.99]"
        >
          <Ico icon={FiPlus} motion="open" size={16} />
          New chat
        </Link>
      </div>

      <nav
        aria-label="Workspace"
        className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3 scrollbar-none"
      >
        {primary.map((i) => (
          <NavRow key={i.href} item={i} pathname={pathname} onNavigate={onNavigate} />
        ))}

        <div className="px-3 pb-1 pt-5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-4">
          Create
        </div>
        {create.map((i) => (
          <NavRow key={i.href} item={i} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="space-y-1 border-t border-line p-2.5">
        <CreditMeter balance={balance} />

        {user ? (
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              onClick={onNavigate}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[8px] px-2 py-1.5 transition-colors hover:bg-hover"
            >
              {/* Neutral, not violet. The rail has exactly one accent colour —
                  the active nav row — and a second hue here fought it. */}
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-raised text-[11.5px] font-semibold text-ink-2">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-ink">
                  {user.name}
                </span>
                <span className="block truncate text-[11px] capitalize text-ink-4">
                  {user.plan} plan
                </span>
              </span>
            </Link>
            <form action={logOut}>
              <button
                aria-label="Log out"
                className="group grid h-7 w-7 place-items-center rounded-[7px] text-ink-4 transition-colors hover:bg-hover hover:text-ink"
              >
                <Ico icon={FiLogOut} motion="launch" size={15} />
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            onClick={onNavigate}
            className="group flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[13.5px] text-ink transition-colors hover:bg-hover"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-raised text-ink-3">
              <Ico icon={FiUser} motion="tilt" size={14} />
            </span>
            Log in
          </Link>
        )}

        <ThemeToggle className="px-1 pt-0.5" />
      </div>
    </>
  );
}

export function Sidebar({
  user,
  balance,
}: {
  user: User | null;
  balance: Balance | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { open, setOpen } = useNav();
  const pathname = usePathname();

  return (
    <>
      <aside
        className={cn(
          "nx-no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-rail transition-[width] duration-200 lg:flex",
          collapsed ? "w-[64px]" : "w-[250px]",
        )}
      >
        {collapsed ? (
          <div className="flex h-full flex-col items-center gap-1.5 py-3.5">
            <LogoMark size={34} />
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="group mb-2 mt-1 grid h-8 w-8 place-items-center rounded-[8px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
            >
              <Ico icon={FiSidebar} motion="nudge" size={17} />
            </button>
            {[{ href: "/chat", label: "New chat", icon: FiPlus, motion: "open" as Motion }, ...main].map((i) => {
              const active =
                i.href === "/" ? pathname === "/" : isActive(pathname, i.href);
              return (
                <Link
                  key={i.label}
                  href={i.href}
                  title={i.label}
                  aria-label={i.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-[8px] transition-colors",
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-ink-4 hover:bg-hover hover:text-ink-2",
                  )}
                >
                  <Ico icon={i.icon} motion={i.motion} size={17} active={active} />
                </Link>
              );
            })}
          </div>
        ) : (
          <RailBody user={user} balance={balance} onCollapse={() => setCollapsed(true)} />
        )}
      </aside>


      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="nx-in absolute inset-y-0 left-0 flex w-[268px] flex-col border-r border-line bg-rail">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="group absolute right-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-[8px] text-ink-3 hover:bg-hover"
            >
              <Ico icon={FiX} motion="shake" size={17} />
            </button>
            <RailBody user={user} balance={balance} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      {/* Reserves the width the fixed rail occupies. It must carry the print
          guard too, or printing leaves an empty gutter where the rail was. */}
      <div
        className={cn(
          "nx-no-print hidden shrink-0 transition-[width] duration-200 lg:block",
          collapsed ? "w-[64px]" : "w-[250px]",
        )}
      />
    </>
  );
}
