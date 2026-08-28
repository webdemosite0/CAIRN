"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FiAlertTriangle,
  FiChevronDown,
  FiCpu,
  FiLock,
  FiRefreshCw,
  FiWifiOff,
  FiZap,
} from "react-icons/fi";
import { Ico, type Motion } from "@/components/ui/ico";
import { classify, providerAttempts, type FailureKind } from "@/lib/failure";
import { cn } from "@/lib/utils";

/**
 * The one place a failed request is shown to a person.
 *
 * Replaces a red box containing a raw exception. The three things it adds are
 * the three things that box was missing: what actually went wrong in plain
 * words, whether it cost anything, and the one button that helps — Upgrade for
 * a spent allowance, Try again for a busy provider, and neither when neither
 * would do anything.
 *
 * The raw message is still reachable behind a disclosure. Hiding it entirely
 * makes real bugs unreportable.
 */

const FACE: Record<
  FailureKind,
  { icon: typeof FiZap; motion: Motion; tone: string; tint: string; ring: string }
> = {
  credits: {
    icon: FiZap,
    motion: "sparkle",
    tone: "text-caution",
    tint: "bg-caution/12",
    ring: "border-caution/30",
  },
  capacity: {
    icon: FiCpu,
    motion: "scan",
    tone: "text-accent",
    tint: "bg-accent/12",
    ring: "border-accent/30",
  },
  auth: {
    icon: FiLock,
    motion: "lock",
    tone: "text-caution",
    tint: "bg-caution/12",
    ring: "border-caution/30",
  },
  network: {
    icon: FiWifiOff,
    motion: "shake",
    tone: "text-critical",
    tint: "bg-critical/12",
    ring: "border-critical/30",
  },
  unknown: {
    icon: FiAlertTriangle,
    motion: "alert",
    tone: "text-critical",
    tint: "bg-critical/12",
    ring: "border-critical/30",
  },
};

export function FailureNote({
  error,
  onRetry,
  className,
  compact = false,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const f = classify(error);
  const face = FACE[f.kind];
  const attempts = providerAttempts(f.raw);

  return (
    <div
      role="alert"
      className={cn(
        "nx-in group rounded-[var(--r-panel)] border bg-rail/60 p-4 backdrop-blur-sm",
        face.ring,
        compact ? "p-3.5" : "p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-[var(--r-control)]",
            face.tint,
            compact ? "size-8" : "size-9",
          )}
        >
          <Ico
            icon={face.icon}
            motion={face.motion}
            size={compact ? 15 : 17}
            className={face.tone}
            live={f.kind === "capacity"}
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold text-ink", compact ? "text-[13.5px]" : "text-[14.5px]")}>
            {f.title}
          </p>
          <p
            className={cn(
              "mt-1 leading-relaxed text-ink-2",
              compact ? "text-[12.5px]" : "text-[13.5px]",
            )}
          >
            {f.detail}
          </p>

          {/* Which provider failed and why. Only a chain failure has this, and
              when it does it is the most useful thing on the screen. */}
          {attempts.length ? (
            <ul className="mt-3 space-y-1.5 rounded-[var(--r-control)] border border-line bg-sunk/70 px-3 py-2.5">
              {attempts.map((a) => (
                <li key={a.label} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-[12.5px] font-medium text-ink-2">{a.label}</span>
                  <span className="text-[12px] text-ink-4">{a.reason}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {f.kind === "credits" ? (
              <Link
                href="/plans"
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-chip)] btn-grad px-3 text-[12.5px] font-semibold"
              >
                <Ico icon={FiZap} motion="sparkle" size={13} />
                Get more credits
              </Link>
            ) : null}

            {f.kind === "auth" ? (
              <Link
                href="/login"
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-chip)] btn-grad px-3 text-[12.5px] font-semibold"
              >
                <Ico icon={FiLock} motion="lock" size={13} />
                Log in again
              </Link>
            ) : null}

            {onRetry && f.retryable ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-chip)] border border-line-strong bg-raised px-3 text-[12.5px] font-medium text-ink transition-colors hover:bg-hover"
              >
                <Ico icon={FiRefreshCw} motion="spin" size={13} />
                Try again
              </button>
            ) : null}

            {f.raw && f.raw !== f.detail ? (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex h-8 items-center gap-1 rounded-[var(--r-chip)] px-2 text-[12.5px] text-ink-3 transition-colors hover:text-ink"
              >
                Details
                <Ico
                  icon={FiChevronDown}
                  motion="down"
                  size={13}
                  className={cn("transition-transform", open && "rotate-180")}
                />
              </button>
            ) : null}
          </div>

          {open ? (
            <p className="mt-2.5 break-words rounded-[var(--r-control)] border border-line bg-sunk px-3 py-2 font-mono text-[11.5px] leading-relaxed text-ink-3">
              {f.raw}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
