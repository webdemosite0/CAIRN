"use client";

import { FiCheck, FiAlertCircle } from "react-icons/fi";
import type { PlanStep, Task } from "@/lib/builder";
import { skillLabel } from "@/lib/skills";
import { cn } from "@/lib/utils";

export type StepState = "todo" | "run" | "ok" | "fail";

/**
 * The plan and its progress, in one box.
 *
 * Previously each step spawned its own collapsible feed, so a seven-step build
 * produced seven boxes and the conversation was mostly chrome. Here the plan is
 * the single fixed thing on screen and the running step carries its own live
 * line, which is the only part that changes.
 */
export function StepsBox({
  steps,
  states,
  current,
  activity,
}: {
  steps: PlanStep[];
  states: Record<string, StepState>;
  /** Index of the step being executed, or -1 when idle. */
  current: number;
  /** The task running right now, shown under the active step. */
  activity: Task | null;
}) {
  const done = steps.filter((s) => states[s.id] === "ok").length;
  const running = current >= 0 && current < steps.length;

  return (
    <div className="bezel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line bg-rail/60 px-3.5 py-2.5">
        {running ? (
          <span className="block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
        ) : done === steps.length && steps.length ? (
          <FiCheck size={14} className="shrink-0 text-positive" />
        ) : null}

        <span className="flex-1 truncate text-[13px] font-medium text-ink-2">
          {running
            ? `Step ${current + 1} of ${steps.length} — ${steps[current].title}`
            : done === steps.length && steps.length
              ? "All steps completed"
              : "Execute Plan"}
        </span>

        <span className="shrink-0 text-[12px] tabular-nums text-ink-4">
          {done}/{steps.length}
        </span>
      </div>

      {/* Progress bar — the one place a long build shows shape at a glance. */}
      <div
        className={cn("relative h-[2px] w-full overflow-hidden bg-sunk", running && "nx-sweep")}
      >
        <div
          className="h-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${steps.length ? (done / steps.length) * 100 : 0}%` }}
        />
      </div>

      <ul className="max-h-[38vh] overflow-auto p-2">
        {steps.map((s, i) => {
          const st = states[s.id] ?? "todo";
          const isCurrent = st === "run";
          return (
            <li
              key={s.id}
              className={cn(
                "rounded-[8px] px-2 py-1.5 transition-colors",
                isCurrent && "nx-step-active bg-accent/[0.07]",
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="grid h-4 w-4 shrink-0 place-items-center">
                  {st === "run" ? (
                    <span className="block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
                  ) : st === "ok" ? (
                    <FiCheck size={13} className="text-positive" />
                  ) : st === "fail" ? (
                    <FiAlertCircle size={13} className="text-critical" />
                  ) : (
                    <span className="block h-3 w-3 rounded-full border border-line-strong" />
                  )}
                </span>

                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[13px]",
                    st === "run"
                      ? "font-medium text-ink"
                      : st === "ok"
                        ? "text-ink-3"
                        : st === "fail"
                          ? "text-critical"
                          : "text-ink-4",
                  )}
                >
                  {i + 1}. {s.title}
                </span>

                {s.skills.slice(0, 3).map((k) => (
                  <span
                    key={k}
                    className="shrink-0 rounded-[5px] bg-sunk px-1.5 py-0.5 text-[10.5px] text-ink-4"
                  >
                    {skillLabel(k)}
                  </span>
                ))}
              </div>

              {/* What it is doing, right now, under the step doing it. */}
              {isCurrent && activity ? (
                <p className="nx-in mt-1 pl-[26px] text-[12px] text-accent">
                  <span className="nx-dots">{activity.label}</span>
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
