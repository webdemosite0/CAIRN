"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "thinking" | "working" | "done" | "error";

/**
 * The Trove mark, and the app's one indicator of machine activity.
 *
 * A core with particles in orbit: discovery circling a centre. The same shape
 * carries every state, so a spinner never appears anywhere — what the user
 * sees is always Trove doing something rather than a generic wait.
 *
 * States differ by orbit speed and colour, not by swapping symbol, so the
 * transitions read as one object changing behaviour:
 *   idle     still
 *   thinking slow orbit
 *   working  fast orbit, tighter
 *   done     orbit settles, ring completes
 *   error    orbit stops, ring turns critical
 *
 * Everything animated is a transform on a group, which the compositor handles
 * without touching layout. Motion is disabled wholesale under
 * prefers-reduced-motion by the rules in globals.css.
 */
export function TroveOrb({
  size = 28,
  state = "idle",
  className,
}: {
  size?: number;
  state?: OrbState;
  className?: string;
}) {
  // Rendered many times per screen (rail, composer, each agent row), and a
  // fixed gradient id would make every instance resolve to whichever <defs>
  // landed in the DOM first.
  const uid = useId().replace(/:/g, "");
  const core = `orb-core-${uid}`;
  const ring = `orb-ring-${uid}`;

  const spin =
    state === "working" ? "3.2s" : state === "thinking" ? "7s" : undefined;
  const counter =
    state === "working" ? "4.6s" : state === "thinking" ? "10s" : undefined;

  const tone =
    state === "error"
      ? "var(--color-critical)"
      : state === "done"
        ? "var(--color-positive)"
        : `url(#${ring})`;

  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        { idle: "Trove", thinking: "Trove is thinking", working: "Trove is working", done: "Complete", error: "Failed" }[state]
      }
    >
      <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
        <defs>
          <linearGradient id={core} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-accent)" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id={ring} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-accent)" />
            <stop offset="1" stopColor="#5eead4" />
          </linearGradient>
        </defs>

        {/* Outer orbit: an open arc, so rotation is legible. */}
        <g style={{ transformOrigin: "20px 20px", animation: spin ? `nx-orbit ${spin} linear infinite` : undefined }}>
          <circle
            cx="20"
            cy="20"
            r="15.5"
            stroke={tone}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={state === "done" ? "97 0" : "58 39"}
            opacity={state === "idle" ? 0.55 : 0.9}
            style={{ transition: "stroke-dasharray 0.45s var(--ease-out), opacity 0.3s" }}
          />
          {/* The particle riding the outer path. */}
          <circle cx="20" cy="4.5" r="2.1" fill={`url(#${core})`} opacity={state === "idle" || state === "error" ? 0 : 1}
            style={{ transition: "opacity 0.3s" }} />
        </g>

        {/* Inner orbit, counter-rotating so the two never lock visually. */}
        <g style={{ transformOrigin: "20px 20px", animation: counter ? `nx-orbit-rev ${counter} linear infinite` : undefined }}>
          <circle cx="20" cy="9.6" r="1.5" fill={`url(#${ring})`} opacity={state === "idle" || state === "error" ? 0 : 0.85}
            style={{ transition: "opacity 0.3s" }} />
        </g>

        {/* The core. Breathes only while thinking. */}
        <circle
          cx="20"
          cy="20"
          r={state === "working" ? 5.4 : 4.8}
          fill={`url(#${core})`}
          style={{
            transformOrigin: "20px 20px",
            transition: "r 0.3s var(--ease-out)",
            animation: state === "thinking" ? "nx-core 2.8s ease-in-out infinite" : undefined,
          }}
        />

        {/* Completion reads on the core rather than as a separate badge. */}
        {state === "done" ? (
          <path
            d="M16.6 20.2l2.3 2.3 4.5-4.8"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {state === "error" ? (
          <path d="M20 16.4v4.2M20 23.4v0.1" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        ) : null}
      </svg>
    </span>
  );
}
