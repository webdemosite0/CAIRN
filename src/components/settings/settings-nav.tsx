"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import {
  FiUser,
  FiShield,
  FiCreditCard,
  FiActivity,
  FiUsers,
  FiGrid,
  FiSun,
} from "react-icons/fi";

import { cn } from "@/lib/utils";

interface Section {
  href: string;
  label: string;
  icon: IconType;
  /** Leaves settings for a page that already exists elsewhere. */
  away?: boolean;
}

/**
 * The sections of settings.
 *
 * Only things that exist. A settings screen is a list of promises — a
 * "Language" select on an app with one language, or an "Auto-save" switch
 * wired to nothing, is a control that lies every time someone flips it. Plan,
 * Team and Integrations are full pages of their own and are linked rather than
 * duplicated here.
 */
const SECTIONS: Section[] = [
  { href: "/settings", label: "Profile", icon: FiUser },
  { href: "/settings/account", label: "Account", icon: FiShield },
  { href: "/settings/appearance", label: "Appearance", icon: FiSun },
  { href: "/settings/usage", label: "Usage & credits", icon: FiActivity },
  { href: "/plans", label: "Plan & billing", icon: FiCreditCard, away: true },
  { href: "/team", label: "Team", icon: FiUsers, away: true },
  { href: "/integrations", label: "Integrations", icon: FiGrid, away: true },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings sections" className="lg:w-[212px] lg:shrink-0">
      {/* Scrolls sideways on a phone rather than stacking seven rows above the
          content someone came to read. */}
      <ul className="flex gap-1 overflow-x-auto scrollbar-none lg:flex-col lg:overflow-visible">
        {SECTIONS.map((s) => {
          // Exact match only: /settings is the profile screen, so a prefix
          // test would light it up on every section below it.
          const active = pathname === s.href;
          return (
            <li key={s.href} className="shrink-0 lg:shrink">
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-2.5 rounded-[var(--r-control)] px-2.5 py-2 text-[13.5px] transition-colors",
                  active
                    ? "bg-hover font-medium text-ink"
                    : "text-ink-3 hover:bg-hover hover:text-ink",
                )}
              >
                <s.icon
                  size={15}
                  className={cn("shrink-0", active ? "text-accent" : "text-ink-4")}
                />
                <span className="truncate">{s.label}</span>
                {s.away ? (
                  <span
                    aria-hidden
                    className="ml-auto hidden text-[11px] text-ink-4 lg:inline"
                  >
                    ↗
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
