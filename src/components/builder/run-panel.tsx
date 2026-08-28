"use client";

import { useState } from "react";
import { FiCopy, FiCheck, FiDownload, FiTerminal } from "react-icons/fi";
import type { Target } from "@/lib/targets";
import { cn } from "@/lib/utils";

/**
 * How to run what was built, for the stacks this app cannot execute.
 *
 * There is no sandbox here — nothing can npm install, start a dev server or
 * run Python — so this shows the real commands rather than a fake terminal
 * reporting a server that was never started. The project itself is genuine and
 * runs as soon as it is downloaded.
 */
export function RunPanel({
  target,
  fileCount,
  onDownload,
}: {
  target: Target;
  fileCount: number;
  onDownload: () => void;
}) {
  const [copied, setCopied] = useState<number | null>(null);

  const copy = (text: string, i: number) => {
    navigator.clipboard?.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied((c) => (c === i ? null : c)), 1500);
  };

  const all = target.commands.join("\n");

  return (
    <div className="h-full overflow-auto p-5">
      <div className="bezel mx-auto max-w-[560px] p-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[var(--r-control)] bg-accent/12 text-accent">
            <FiTerminal size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-[14.5px] font-medium text-ink">{target.label}</p>
            <p className="text-[12.5px] text-ink-4">
              {fileCount} file{fileCount === 1 ? "" : "s"} · entry {target.entry}
            </p>
          </div>
        </div>

        <p className="mt-4 text-[13.5px] leading-relaxed text-ink-3">
          This one runs on your machine, not in the browser — so there is no live
          preview here. Download it and run these, in order:
        </p>

        <ol className="mt-4 space-y-1.5">
          {target.commands.map((c, i) => (
            <li key={c} className="flex items-stretch gap-2">
              <span className="grid w-5 shrink-0 place-items-center pt-1 text-[11px] tabular-nums text-ink-4">
                {i + 1}
              </span>
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-[var(--r-chip)] border border-line bg-sunk px-3 py-2 font-mono text-[12px] text-ink-2">
                {c}
              </code>
              <button
                onClick={() => copy(c, i)}
                aria-label={`Copy: ${c}`}
                className="grid w-8 shrink-0 place-items-center rounded-[var(--r-chip)] text-ink-4 transition-colors hover:bg-hover hover:text-ink-2"
              >
                {copied === i ? (
                  <FiCheck size={13} className="text-positive" />
                ) : (
                  <FiCopy size={13} />
                )}
              </button>
            </li>
          ))}
        </ol>

        {target.serves ? (
          <p className="mt-3 text-[12.5px] text-ink-4">
            Then open <span className="font-mono text-ink-3">{target.serves}</span>
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={onDownload}
            disabled={!fileCount}
            className={cn(
              "btn-grad flex items-center gap-2 rounded-[var(--r-control)] px-4 py-2",
              "text-[13.5px] font-medium disabled:opacity-40",
            )}
          >
            <FiDownload size={14} /> Download project
          </button>
          <button
            onClick={() => copy(all, -1)}
            className="flex items-center gap-2 rounded-[var(--r-control)] border border-line-strong px-4 py-2 text-[13.5px] text-ink transition-colors hover:bg-hover"
          >
            {copied === -1 ? <FiCheck size={14} className="text-positive" /> : <FiCopy size={14} />}
            Copy all commands
          </button>
        </div>
      </div>
    </div>
  );
}
