"use client";

import Link from "next/link";
import { TbRobot, TbWorld, TbUsers, TbCode, TbFileText, TbTable } from "react-icons/tb";
import { Ico, type Motion } from "@/components/ui/ico";

const ITEMS: {
  href: string;
  label: string;
  icon: typeof TbWorld;
  motion: Motion;
}[] = [
  { href: "/websites", label: "Website", icon: TbWorld, motion: "spin" },
  { href: "/agents", label: "Agents", icon: TbRobot, motion: "tilt" },
  { href: "/team", label: "AI Team", icon: TbUsers, motion: "tilt" },
  { href: "/code", label: "Code", icon: TbCode, motion: "type" },
  { href: "/documents", label: "Document", icon: TbFileText, motion: "lift" },
  { href: "/spreadsheets", label: "Spreadsheet", icon: TbTable, motion: "pop" },
];

/** A single row under the composer. Nothing overlaps anything. */
export function Shortcuts() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {ITEMS.map((i, n) => (
        <Link
          key={i.href}
          href={i.href}
          className="chip nx-in group !py-1.5"
          style={{ animationDelay: `${120 + n * 45}ms`, animationFillMode: "backwards" }}
        >
          {/* Quiet by default, brand purple on hover — one accent, not six. */}
          <Ico
            icon={i.icon}
            motion={i.motion}
            size={14}
            className="text-ink-4 transition-colors group-hover:text-accent"
          />
          {i.label}
        </Link>
      ))}
    </div>
  );
}
