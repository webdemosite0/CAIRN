"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "thinking" | "working" | "done" | "error";

/**
 * The Trove mark: a ringed planet with a moon.
 *
 * The planet is dark, not purple. That is the whole trick of the reference
 * artwork — the body is nearly black and all the colour lives in the rim light
 * and the ring, which is what makes it read as a lit sphere in space rather
 * than a coloured disc. A mid-purple fill flattens it instantly.
 *
 * The ring passes behind the planet at the top and in front at the bottom,
 * which is what makes it orbit rather than sit on top. Two arcs share one
 * ellipse — back half, planet, front half — rather than a mask, so it stays
 * crisp at any size and survives Satori for the favicon.
 *
 * Detail is spent where it survives: rim light and the ring gradient read at
 * 24px, the specular highlight and starfield do not, so they are drawn faintly
 * and simply disappear rather than turning to mud.
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
  const outerId = `orb-outer-${uid}`;
  const bodyId = `orb-body-${uid}`;
  const rimId = `orb-rim-${uid}`;
  const glossId = `orb-gloss-${uid}`;
  const moonId = `orb-moon-${uid}`;

  const spin =
    state === "working" ? "6s" : state === "thinking" ? "13s" : undefined;

  const tinted = state === "error" || state === "done";
  const flat =
    state === "error" ? "var(--color-critical)" : "var(--color-positive)";

  const ringStroke = tinted ? flat : `url(#${ringId})`;
  const outerStroke = tinted ? flat : `url(#${outerId})`;

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
          {/* The ring: magenta through violet and blue into cyan, the way the
              light wraps in the reference. */}
          <linearGradient id={ringId} x1="0.05" y1="0.95" x2="0.95" y2="0.05">
            <stop offset="0" stopColor="#f0abfc" />
            <stop offset="0.28" stopColor="#c084fc" />
            <stop offset="0.58" stopColor="#7c6cff" />
            <stop offset="0.82" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#5eead4" />
          </linearGradient>

          {/* The moon's orbit, dimmer so it reads as further away. */}
          <linearGradient id={outerId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#a99cff" />
            <stop offset="1" stopColor="#7c6cff" />
          </linearGradient>

          {/* Nearly black, lifting toward deep indigo at the edge. */}
          <radialGradient id={bodyId} cx="0.36" cy="0.3" r="0.85">
            <stop offset="0" stopColor="#2a1b5e" />
            <stop offset="0.45" stopColor="#140c33" />
            <stop offset="1" stopColor="#05030f" />
          </radialGradient>

          {/* Rim light. Magenta at the top-left, cyan round the bottom-right. */}
          <linearGradient id={rimId} x1="0.15" y1="0.1" x2="0.85" y2="0.95">
            <stop offset="0" stopColor="#f0abfc" />
            <stop offset="0.4" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>

          {/* The gloss: a soft blown highlight, upper left. */}
          <radialGradient id={glossId} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={moonId} x1="0.2" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor="#c4b5fd" />
            <stop offset="0.5" stopColor="#3b2a6b" />
            <stop offset="1" stopColor="#08050f" />
          </linearGradient>
        </defs>

        {/* ---- the moon's orbit, behind everything ---- */}
        <g
          style={{
            transformOrigin: "24px 24px",
            animation: spin ? `nx-orbit ${spin} linear infinite` : undefined,
          }}
        >
          <g transform="rotate(14 24 24)">
            <ellipse
              cx="24"
              cy="24"
              rx="21"
              ry="8.2"
              stroke={outerStroke}
              strokeWidth="1.1"
              opacity={state === "idle" ? 0.5 : 0.7}
            />
          </g>
        </g>

        {/* ---- the planet and its ring ---- */}
        <g
          style={{
            transformOrigin: "24px 25px",
            animation: spin ? `nx-orbit ${spin} linear infinite` : undefined,
          }}
        >
          <g transform="rotate(-22 24 25)">
            {/* back half, dimmer — it is behind the planet and further away */}
            <path
              d="M4.5 25 A19.5 7.4 0 0 1 43.5 25"
              stroke={ringStroke}
              strokeWidth="1.7"
              strokeLinecap="round"
              opacity={state === "idle" ? 0.6 : 0.8}
            />

            {/* the body */}
            <circle cx="24" cy="25" r="11.4" fill={`url(#${bodyId})`} />

            {/* rim light, brightest where the ring light would catch it */}
            <circle
              cx="24"
              cy="25"
              r="11.4"
              fill="none"
              stroke={`url(#${rimId})`}
              strokeWidth="1.3"
              opacity="0.95"
            />

            {/* gloss — clipped to the body by being smaller than it */}
            <ellipse
              cx="20.2"
              cy="20.4"
              rx="5.6"
              ry="4.1"
              fill={`url(#${glossId})`}
              transform="rotate(-28 20.2 20.4)"
            />

            {/* front half, thicker and brighter — nearest the viewer */}
            <path
              d="M43.5 25 A19.5 7.4 0 0 1 4.5 25"
              stroke={ringStroke}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* ---- the moon, riding the outer orbit ---- */}
        {state !== "error" ? (
          <g
            style={{
              transformOrigin: "24px 6.2px",
              animation:
                state === "thinking" ? "nx-core 2.8s ease-in-out infinite" : undefined,
            }}
          >
            <circle
              cx="24"
              cy="6.2"
              r="3.4"
              fill={state === "done" ? "var(--color-positive)" : `url(#${moonId})`}
            />
            {state !== "done" ? (
              <circle
                cx="24"
                cy="6.2"
                r="3.4"
                fill="none"
                stroke="#c4b5fd"
                strokeWidth="0.6"
                opacity="0.7"
              />
            ) : null}
          </g>
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
