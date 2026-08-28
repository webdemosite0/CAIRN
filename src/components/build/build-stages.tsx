"use client";

import { useEffect, useState } from "react";
import { FiCheck } from "react-icons/fi";
import { Bot } from "@/components/agents/bot";
import { cn } from "@/lib/utils";

export interface Stage {
  label: string;
  detail: string;
  accent: string;
}

/**
 * The build theatre. Stages advance on a timer while the real request is in
 * flight, then all complete the moment it resolves — the final state always
 * reflects the actual result, never the timer.
 */
export function BuildStages({
  stages,
  running,
  done,
  stepMs = 2600,
}: {
  stages: Stage[];
  running: boolean;
  done: boolean;
  stepMs?: number;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setActive((a) => Math.min(a + 1, stages.length - 1));
    }, stepMs);
    return () => {
      clearInterval(t);
      // Reset on the way out so the next run starts from the first stage.
      setActive(0);
    };
  }, [running, stages.length, stepMs]);

  return (
    <ul className="space-y-2.5">
      {stages.map((s, i) => {
        const complete = done || i < active;
        const working = running && !done && i === active;

        return (
          <li
            key={s.label}
            className={cn(
              "nx-in relative flex items-center gap-3.5 overflow-hidden rounded-[var(--r-panel)] border px-4 py-3 transition-colors duration-300",
              working
                ? "border-line-strong bg-raised"
                : complete
                  ? "border-line bg-rail"
                  : "border-line bg-rail opacity-45",
            )}
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
          >
            {working ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-1/3"
                style={{
                  background: `linear-gradient(90deg, transparent, ${s.accent}14, transparent)`,
                  animation: "nx-band 1.9s linear infinite",
                }}
              />
            ) : null}

            <Bot
              size={38}
              accent={s.accent}
              state={complete ? "done" : working ? "working" : "idle"}
            />

            <div className="relative min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-ink">{s.label}</span>
                {complete ? (
                  <FiCheck size={14} className="text-positive" />
                ) : null}
              </div>
              <p
                className={cn(
                  "truncate text-[12.5px] text-ink-3",
                  working && "nx-dots",
                )}
              >
                {complete ? "Done" : s.detail}
              </p>
            </div>

            {working ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className="nx-pulse absolute h-2 w-2 rounded-full"
                  style={{ background: s.accent }}
                />
                <span
                  className="relative h-2 w-2 rounded-full"
                  style={{ background: s.accent }}
                />
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
