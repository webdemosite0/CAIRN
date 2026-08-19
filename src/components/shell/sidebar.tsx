"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import {
  FiPlus,
  FiSidebar,
  FiX,
  FiUser,
  FiLogOut,
  FiChevronRight,
  FiSettings,
  FiCreditCard,
  FiActivity,
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
  TbMessageCircle,
  TbPlugConnected,
  TbRefreshDot,
} from "react-icons/tb";
import { TroveOrb } from "@/components/brand/orb";
import { Wordmark } from "@/components/brand/logo";
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

/**
 * Navigation, grouped by what the user is trying to do rather than by feature.
 *
 * Every entry points at a route that exists. Sections for Projects, Activity
 * and Workflows would read well here and land on a 404, so they are left out
 * until there is something behind them — a nav item is a promise.
 */
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Home", icon: TbLayoutDashboard, motion: "pop" },
      // Route stays /chat — only the label changes, so nothing breaks.
      { href: "/chat", label: "AI Workspace", icon: TbMessageCircle, motion: "lift" },
      { href: "/team", label: "AI Team", icon: TbUsers, motion: "tilt" },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/websites", label: "Websites", icon: TbWorld, motion: "spin" },
      { href: "/agents", label: "Agents", icon: TbRobot, motion: "tilt" },
      { href: "/code", label: "Code", icon: TbCode, motion: "type" },
      { href: "/documents", label: "Documents", icon: TbFileText, motion: "lift" },
      { href: "/spreadsheets", label: "Spreadsheets", icon: TbTable, motion: "pop" },
      { href: "/slides", label: "Slides", icon: TbPresentation, motion: "grow" },
      { href: "/design", label: "Design", icon: TbPalette, motion: "hue" },
    ],
  },
  {
    label: "Automate",
    items: [
      { href: "/research", label: "Research", icon: TbSearch, motion: "scan" },
      { href: "/workflows", label: "Workflows", icon: TbRefreshDot, motion: "spin" },
      { href: "/reminders", label: "Reminders", icon: TbBell, motion: "ring" },
      { href: "/integrations", label: "Integrations", icon: TbPlugConnected, motion: "open" },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

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
      <Ico
        icon={item.icon}
        motion={item.motion}
        active={active}
        size={18}
        className={cn(
          "shrink-0 transition-colors duration-150",
          active ? "text-accent" : "text-ink-4 group-hover:text-ink-2",
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** Account actions, as a popover rather than a row of loose icons. */
function UserMenu({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links = [
    { href: "/settings", label: "Settings", icon: FiSettings },
    { href: "/plans", label: "Plan and usage", icon: FiCreditCard },
    { href: "/dashboard", label: "Activity", icon: FiActivity },
  ];

  return (
    <div ref={wrap} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="group flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 transition-colors hover:bg-hover"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-raised text-[11.5px] font-semibold text-ink-2">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[13px] text-ink">{user.name}</span>
          <span className="block truncate text-[11px] capitalize text-ink-4">
            {user.plan} plan
          </span>
        </span>
        <FiChevronRight
          size={14}
          className={cn(
            "shrink-0 text-ink-4 transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="nx-in absolute bottom-full left-0 z-50 mb-1.5 w-full overflow-hidden rounded-[8px] border border-line bg-raised shadow-[var(--sh-3)]"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
            >
              <l.icon size={14} className="shrink-0 text-ink-4" />
              {l.label}
            </Link>
          ))}
          <form action={logOut} className="border-t border-line">
            <button
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
            >
              <FiLogOut size={14} className="shrink-0 text-ink-4" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
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
        <Link
          href="/chat"
          onClick={onNavigate}
          aria-label="Trove home"
          className="group inline-flex items-center gap-2"
        >
          <TroveOrb size={24} state="idle" />
          <Wordmark size={15} sweep={false} className="text-ink" />
        </Link>
        {onCollapse ? (
          <button
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            title="Toggle sidebar  ⌘B"
            className="group grid h-8 w-8 place-items-center rounded-[6px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            <Ico icon={FiSidebar} motion="nudge" size={17} />
          </button>
        ) : null}
      </div>

      <div className="px-3 pt-3.5">
        <Link
          href="/chat"
          onClick={onNavigate}
          className="btn-grad group flex h-[52px] items-center justify-center gap-2 rounded-[10px] px-4 text-[14.5px] font-medium"
        >
          <Ico icon={FiPlus} motion="open" size={16} />
          New
        </Link>
      </div>

      <nav
        aria-label="Workspace"
        className="mt-4 flex-1 overflow-y-auto px-3 pb-3 scrollbar-none"
      >
        {GROUPS.map((g, i) => (
          <div key={g.label} className={cn(i > 0 && "mt-5")}>
            <div className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-4">
              {g.label}
            </div>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <NavRow key={it.href} item={it} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-line p-2.5">
        <CreditMeter balance={balance} />

        {user ? (
          <UserMenu user={user} onNavigate={onNavigate} />
        ) : (
          <Link
            href="/login"
            onClick={onNavigate}
            className="group flex items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-[13.5px] text-ink transition-colors hover:bg-hover"
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
  // Collapse lives in the shared nav context so a page can ask for the room —
  // the builder collapses the rail once a build starts.
  const { open, setOpen, collapsed, setCollapsed } = useNav();
  const pathname = usePathname();

  // Cmd/Ctrl+B toggles the rail, the shortcut every editor already uses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed(!collapsed);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed, setCollapsed]);

  return (
    <>
      <aside
        className={cn(
          "nx-no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-rail transition-[width] duration-200 lg:flex",
          collapsed ? "w-[68px]" : "w-[324px]",
        )}
      >
        {collapsed ? (
          <div className="flex h-full flex-col items-center gap-1.5 py-3.5">
            <Link href="/chat" aria-label="Trove home">
              <TroveOrb size={28} state="idle" />
            </Link>
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              title="Toggle sidebar  ⌘B"
              className="group mb-2 mt-1 grid h-8 w-8 place-items-center rounded-[6px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
            >
              <Ico icon={FiSidebar} motion="nudge" size={17} />
            </button>

            <Link
              href="/chat"
              title="New"
              aria-label="New"
              className="btn-grad grid h-9 w-9 place-items-center rounded-[8px]"
            >
              <FiPlus size={16} />
            </Link>

            <div className="mt-1 flex flex-col items-center gap-1 overflow-y-auto scrollbar-none">
              {ALL.map((i) => {
                const active = isActive(pathname, i.href);
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    title={i.label}
                    aria-label={i.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group grid h-9 w-9 shrink-0 place-items-center rounded-[6px] transition-colors",
                      active
                        ? "bg-accent-soft text-accent"
                        : "text-ink-4 hover:bg-hover hover:text-ink-2",
                    )}
                  >
                    <Ico icon={i.icon} motion={i.motion} active={active} size={18} />
                  </Link>
                );
              })}
            </div>

            <div className="mt-auto">
              <CreditMeter balance={balance} collapsed />
            </div>
          </div>
        ) : (
          <RailBody user={user} balance={balance} onCollapse={() => setCollapsed(true)} />
        )}
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          <div className="nx-in absolute inset-y-0 left-0 flex w-[276px] flex-col border-r border-line bg-rail">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-[6px] text-ink-3 hover:bg-hover hover:text-ink"
            >
              <FiX size={17} />
            </button>
            <RailBody user={user} balance={balance} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      {/* Reserves the width the fixed rail occupies. It carries the print guard
          too, or printing leaves an empty gutter where the rail was. */}
      <div
        className={cn(
          "nx-no-print hidden shrink-0 transition-[width] duration-200 lg:block",
          collapsed ? "w-[68px]" : "w-[324px]",
        )}
      />
    </>
  );
}
