"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The Trove mark: rings nested around a core, each cut on one side so the
 * shape reads as an aperture rather than a target — something opening onto
 * what it holds. The outer ring counter-rotates against the inner one, and
 * the core breathes.
 */
export function LogoMark({
  size = 34,
  className,
  animated = true,
}: {
  size?: number;
  className?: string;
  /** Static rendering for dense lists. */
  animated?: boolean;
}) {
  // The mark renders many times per page (rail, auth card, once per chat
  // message). Fixed gradient ids would collide, and every instance would
  // resolve to whichever <defs> happened to be first in the DOM.
  const uid = useId().replace(/:/g, "");
  const a = `nx-mark-a-${uid}`;
  const b = `nx-mark-b-${uid}`;

  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
        <defs>
          <linearGradient id={a} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#60a5fa" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id={b} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        {/* outer aperture — open arc, rotates one way */}
        <g style={{ transformOrigin: "20px 20px" }}>
          <g
            style={{
              transformOrigin: "20px 20px",
              animation: animated ? "nx-orbit 9s linear infinite" : undefined,
            }}
          >
            <path
              d="M20 3.5 A16.5 16.5 0 1 1 3.5 20"
              stroke={`url(#${a})`}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* inner arc — counter-rotates */}
        <g style={{ transformOrigin: "20px 20px" }}>
          <g
            style={{
              transformOrigin: "20px 20px",
              animation: animated ? "nx-orbit-rev 6s linear infinite" : undefined,
            }}
          >
            <path
              d="M20 9.5 A10.5 10.5 0 0 1 30.5 20"
              stroke={`url(#${b})`}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* core */}
        <circle
          cx="20"
          cy="20"
          r="4.6"
          fill={`url(#${a})`}
          style={{
            transformOrigin: "20px 20px",
            animation: animated ? "nx-core 2.8s ease-in-out infinite" : undefined,
          }}
        />
      </svg>
    </span>
  );
}

/**
 * The wordmark. A light sweep travels across the letters on a slow loop —
 * the only decorative motion on an otherwise still screen.
 */
export function Wordmark({
  className,
  size = 64,
  sweep = true,
}: {
  className?: string;
  size?: number;
  sweep?: boolean;
}) {
  return (
    <span
      className={cn("block leading-none", sweep ? "nx-sweep-text" : "wordmark", className)}
      style={{ fontSize: size, fontWeight: 700, letterSpacing: "0.08em" }}
    >
      TROVE
    </span>
  );
}

/** Wordmark with the mark locked to its left — used in the rail and auth. */
export function Lockup({
  size = 26,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <Wordmark size={size * 0.62} sweep={false} className="text-ink" />
    </span>
  );
}
