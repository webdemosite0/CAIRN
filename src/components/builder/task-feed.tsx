"use client";

import { useEffect, useRef, useState } from "react";
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
 * Everything the build has done, in one box.
 *
 * One box for the whole run rather than one per step: a seven-step build used
 * to stack seven collapsible panels down the conversation, which buried the
 * plan and the composer under its own bookkeeping. Collapsed by default once
 * the run finishes, since by then the artefact matters more than the log.
 */
export function ActivityBox({
  tasks,
  running,
}: {
  tasks: Task[];
  running: boolean;
}) {
  // Null until the user expresses a preference, at which point theirs wins.
  // Derived rather than synced through an effect: an effect would fire a
  // second render on every transition just to reach the same conclusion.
  const [choice, setChoice] = useState<boolean | null>(null);
  const open = choice ?? running;
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && running) end.current?.scrollIntoView({ block: "end" });
  }, [tasks, open, running]);

  if (!tasks.length) return null;

  const done = tasks.filter((t) => t.state !== "run").length;

  return (
    <div className="rounded-[10px] border border-line bg-rail/60 px-3 py-2">
      <button
        onClick={() => setChoice(!open)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        {running ? (
          <span className="block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
        ) : (
          <FiCheck size={13} className="shrink-0 text-positive" />
        )}
        <span className="flex-1 truncate text-[13px] font-medium text-ink-2">
          {running
            ? `Working — ${done} of ${tasks.length} done`
            : `${done} task${done === 1 ? "" : "s"} completed`}
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
        <ul className="mt-1.5 max-h-[34vh] overflow-auto border-t border-line pt-1.5">
          {tasks.map((t) => (
            <Row key={t.id} task={t} />
          ))}
          <div ref={end} />
        </ul>
      ) : null}
    </div>
  );
}
