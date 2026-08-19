"use client";

import { useState } from "react";
import {
  FiFolder,
  FiFileText,
  FiCheck,
  FiChevronDown,
  FiAlertCircle,
  FiCalendar,
} from "react-icons/fi";
import { TbPuzzle, TbTerminal2 } from "react-icons/tb";
import type { IconType } from "react-icons";
import type { Task, TaskKind } from "@/lib/builder";
import { cn } from "@/lib/utils";

const ICON: Record<TaskKind, IconType> = {
  plan: FiCalendar,
  skill: TbPuzzle,
  read: FiFolder,
  write: FiFileText,
  check: FiAlertCircle,
  think: TbTerminal2,
};

/** The verb shown before the label, so a row reads like a sentence. */
const VERB: Record<TaskKind, string> = {
  plan: "Plan",
  skill: "Skill",
  read: "Read",
  write: "Write",
  check: "Check",
  think: "Run",
};

function Row({ task }: { task: Task }) {
  const Icon = ICON[task.kind];
  const running = task.state === "run";
  const failed = task.state === "fail";

  return (
    <li className="nx-in flex items-center gap-2.5 py-[3px] text-[13px]">
      <span
        className={cn(
          "grid h-4 w-4 shrink-0 place-items-center",
          failed ? "text-critical" : running ? "text-accent" : "text-ink-4",
        )}
      >
        {running ? (
          <span className="block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
        ) : (
          <Icon size={14} />
        )}
      </span>

      <span className={cn("shrink-0 text-[12px]", running ? "text-accent" : "text-ink-4")}>
        {VERB[task.kind]}
      </span>

      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          running ? "text-ink" : failed ? "text-critical" : "text-ink-3",
        )}
        title={task.label}
      >
        {task.label}
      </span>

      {task.state === "ok" ? (
        <FiCheck size={12} className="shrink-0 text-positive" />
      ) : null}
    </li>
  );
}

/**
 * The live record of what the build is doing.
 *
 * Collapses to a single "N tasks completed" line once a group finishes, so a
 * long build does not bury the conversation above it — the detail is one click
 * away rather than always on screen.
 */
export function TaskFeed({
  title,
  tasks,
  running,
  defaultOpen,
}: {
  title: string;
  tasks: Task[];
  running: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  if (!tasks.length) return null;

  const done = tasks.filter((t) => t.state !== "run").length;

  return (
    <div className="rounded-[10px] border border-line bg-rail/60 px-3 py-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        {running ? (
          <span className="block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
        ) : (
          <FiCheck size={13} className="shrink-0 text-positive" />
        )}
        <span className="flex-1 truncate text-[13px] font-medium text-ink-2">
          {running ? title : `${done} task${done === 1 ? "" : "s"} completed`}
        </span>
        <FiChevronDown
          size={14}
          className={cn(
            "shrink-0 text-ink-4 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <ul className="mt-1.5 border-t border-line pt-1.5">
          {tasks.map((t) => (
            <Row key={t.id} task={t} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
