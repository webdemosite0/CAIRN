"use client";

import { useEffect, useRef } from "react";
import { FiTrash2 } from "react-icons/fi";
import type { LogLine } from "@/lib/builder";
import { cn } from "@/lib/utils";

/**
 * The build console.
 *
 * Every line here is something that genuinely happened during generation — a
 * skill loaded, a file read with its real byte count, a file written, a check
 * that found something. It is deliberately not a shell: there is no sandbox
 * behind this app, so printing invented commands like `npm install` would be
 * theatre. What it shows instead is the true log of the build.
 */
export function BuildConsole({
  lines,
  onClear,
  className,
}: {
  lines: LogLine[];
  onClear?: () => void;
  className?: string;
}) {
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
        <span className="meta">Console</span>
        <span className="text-[11px] tabular-nums text-ink-4">{lines.length}</span>
        <span className="flex-1" />
        {onClear && lines.length ? (
          <button
            onClick={onClear}
            className="grid h-6 w-6 place-items-center rounded-[var(--r-chip)] text-ink-4 transition-colors hover:bg-hover hover:text-ink-2"
            aria-label="Clear console"
          >
            <FiTrash2 size={12} />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[11.5px] leading-[1.7]">
        {lines.length === 0 ? (
          <p className="text-ink-4">Waiting for the build to start.</p>
        ) : (
          lines.map((l) => (
            <div key={l.id} className="nx-line-in flex gap-2.5">
              <span className="shrink-0 text-ink-4 tabular-nums">{l.at}</span>
              <span
                className={cn(
                  "min-w-0 flex-1 whitespace-pre-wrap break-words",
                  l.level === "warn"
                    ? "text-caution"
                    : l.level === "ok"
                      ? "text-positive"
                      : "text-ink-3",
                )}
              >
                {l.text}
              </span>
            </div>
          ))
        )}
        <div ref={end} />
      </div>
    </div>
  );
}
