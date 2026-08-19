"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "thinking" | "working" | "done" | "error";

/**
 * The Trove mark: a ringed planet with a moon.
 *
 * The ring passes behind the planet at the top and in front at the bottom,
 * which is what makes it read as orbiting rather than as a circle drawn over a
 * disc. That is done with two arcs sharing one ellipse geometry — the back
 * half painted first, the planet over it, then the front half — rather than a
 * mask, so it stays crisp at any size and survives Satori for the favicon.
 *
 * The same shape carries every state, changing only rotation and colour, so
 * the logo, the thinking indicator and an agent's status light are one object
 * behaving differently:
 *   idle     still
 *   thinking slow orbit
 *   working  faster orbit
 *   done     ring completes, moon settles green
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
  const ringId = `orb-ring-${uid}`;
  const planetId = `orb-planet-${uid}`;
  const moonId = `orb-moon-${uid}`;

  const spin =
    state === "working" ? "6s" : state === "thinking" ? "13s" : undefined;

  const ringStroke =
    state === "error"
      ? "var(--color-critical)"
      : state === "done"
        ? "var(--color-positive)"
        : `url(#${ringId})`;

  const label = {
    idle: "Trove",
    thinking: "Trove is thinking",
    working: "Trove is working",
    done: "Complete",
    error: "Failed",
  }[state];

  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 48 48" width={size} height={size} fill="none">
        <defs>
          {/* Cyan into violet, running along the ring. */}
          <linearGradient id={ringId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#5eead4" />
            <stop offset="0.45" stopColor="#7dd3fc" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
          {/* The planet is lit from the upper left. */}
          <linearGradient id={planetId} x1="0.2" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#8b7cff" />
            <stop offset="0.55" stopColor="#6c5ce7" />
            <stop offset="1" stopColor="#2e2a5c" />
          </linearGradient>
          <linearGradient id={moonId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a5f3ec" />
            <stop offset="1" stopColor="#5eead4" />
          </linearGradient>
        </defs>

        {/* The ring, tilted. One group so both halves rotate together. */}
        <g
          style={{
            transformOrigin: "24px 25px",
            animation: spin ? `nx-orbit ${spin} linear infinite` : undefined,
          }}
        >
          <g transform="rotate(-22 24 25)">
            {/* back half — drawn before the planet so the planet covers it */}
            <path
              d="M4.5 25 A19.5 7.4 0 0 1 43.5 25"
              stroke={ringStroke}
              strokeWidth="2"
              strokeLinecap="round"
              opacity={state === "idle" ? 0.75 : 0.95}
            />

            {/* the planet sits between the two halves */}
            <circle cx="24" cy="25" r="11.4" fill={`url(#${planetId})`} />
            {/* a soft terminator, so the sphere is not a flat disc */}
            <circle
              cx="24"
              cy="25"
              r="11.4"
              fill="none"
              stroke="rgb(255 255 255 / 0.16)"
              strokeWidth="0.9"
            />

            {/* front half — over the planet, completing the orbit */}
            <path
              d="M43.5 25 A19.5 7.4 0 0 1 4.5 25"
              stroke={ringStroke}
              strokeWidth="2.4"
              strokeLinecap="round"
              opacity={state === "idle" ? 0.9 : 1}
            />
          </g>
        </g>

        {/* The moon, above the planet. Breathes while thinking. */}
        {state !== "error" ? (
          <circle
            cx="24"
            cy="6.4"
            r="3.1"
            fill={state === "done" ? "var(--color-positive)" : `url(#${moonId})`}
            style={{
              transformOrigin: "24px 6.4px",
              animation:
                state === "thinking" ? "nx-core 2.8s ease-in-out infinite" : undefined,
            }}
          />
        ) : null}

        {state === "done" ? (
          <path
            d="M19.6 25.2l3 3 5.8-6.2"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {state === "error" ? (
          <path
            d="M24 19.4v6M24 29.2v0.1"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        ) : null}
      </svg>
    </span>
  );
}
