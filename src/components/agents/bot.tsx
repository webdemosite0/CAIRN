"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export type BotState = "idle" | "working" | "done" | "failed";

/**
 * A small 2D robot, drawn in SVG. It bobs while idle, blinks on a loop,
 * spins its antenna and gets a scanning visor while working, and shows a
 * check or a flat mouth when it finishes.
 */
export function Bot({
  size = 56,
  accent = "#3b82f6",
  state = "idle",
  className,
}: {
  size?: number;
  accent?: string;
  state?: BotState;
  className?: string;
}) {
  // Callers pass neon pastels tuned to glow on black (#7dcfff, #9ece6a, ...).
  // On a white page those drop to ~2:1 contrast, so the bot goes invisible.
  // --tint-darken is 0% on dark and mixes in black on light, which keeps all
  // ~10 call sites working untouched.
  const ink = `color-mix(in oklab, ${accent}, #000 var(--tint-darken))`;

  // Two bots sharing an accent previously generated the same clipPath id.
  const visor = `visor-${useId().replace(/:/g, "")}`;

  const working = state === "working";
  const done = state === "done";
  const failed = state === "failed";

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={working ? "" : "nx-bob"}
        style={working ? undefined : { animationDelay: `${(size % 7) * 0.2}s` }}
      >
        {/* antenna */}
        <g style={{ transformOrigin: "32px 16px" }}>
          <g
            style={{
              transformOrigin: "32px 16px",
              animation: working ? "nx-antenna 0.7s ease-in-out infinite" : undefined,
            }}
          >
            <line x1="32" y1="16" x2="32" y2="8" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="6" r="3.2" fill={ink}>
              {working ? (
                <animate
                  attributeName="opacity"
                  values="1;0.3;1"
                  dur="0.9s"
                  repeatCount="indefinite"
                />
              ) : null}
            </circle>
          </g>
        </g>

        {/* head */}
        <rect
          x="12"
          y="15"
          width="40"
          height="32"
          rx="11"
          fill="var(--color-raised)"
          stroke={working ? ink : "var(--color-line-strong)"}
          strokeWidth="2"
        />

        {/* visor sweep while working */}
        {working ? (
          <>
            <clipPath id={visor}>
              <rect x="12" y="15" width="40" height="32" rx="11" />
            </clipPath>
            <g clipPath={`url(#${visor})`}>
              <rect x="0" y="15" width="14" height="32" fill={ink} opacity="0.22">
                <animate
                  attributeName="x"
                  values="4;50;4"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </rect>
            </g>
          </>
        ) : null}

        {/* eyes */}
        {failed ? (
          <>
            <line x1="21" y1="26" x2="28" y2="33" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
            <line x1="28" y1="26" x2="21" y2="33" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
            <line x1="36" y1="26" x2="43" y2="33" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
            <line x1="43" y1="26" x2="36" y2="33" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse
              cx="24.5"
              cy="29.5"
              rx="3.6"
              ry="4.2"
              fill={ink}
              style={{
                transformOrigin: "24.5px 29.5px",
                animation: "nx-eye 3.6s ease-in-out infinite",
              }}
            />
            <ellipse
              cx="39.5"
              cy="29.5"
              rx="3.6"
              ry="4.2"
              fill={ink}
              style={{
                transformOrigin: "39.5px 29.5px",
                animation: "nx-eye 3.6s ease-in-out infinite",
              }}
            />
          </>
        )}

        {/* mouth */}
        {done ? (
          <path
            d="M25 39 l4.5 4.5 L40 33"
            fill="none"
            stroke="var(--color-positive)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : working ? (
          <g>
            {[27, 32, 37].map((x, i) => (
              <circle key={x} cx={x} cy="39.5" r="1.7" fill="var(--color-ink-3)">
                <animate
                  attributeName="opacity"
                  values="0.25;1;0.25"
                  dur="1.2s"
                  begin={`${i * 0.18}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </g>
        ) : (
          <line
            x1="27"
            y1="39.5"
            x2="37"
            y2="39.5"
            stroke="var(--color-ink-4)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        )}

        {/* body */}
        <rect x="20" y="49" width="24" height="8" rx="4" fill="var(--color-sunk)" stroke="var(--color-line-strong)" strokeWidth="1.6" />
        <circle cx="32" cy="53" r="1.8" fill={working ? ink : "var(--color-line-strong)"}>
          {working ? (
            <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
          ) : null}
        </circle>
      </svg>
    </span>
  );
}

/** Ring of orbiting dots — used behind a bot while a swarm is running. */
export function OrbitRing({
  size = 96,
  accent = "#3b82f6",
}: {
  size?: number;
  accent?: string;
}) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{
        width: size,
        height: size,
        animation: "nx-orbit 6s linear infinite",
      }}
    >
      {[0, 120, 240].map((deg) => (
        <span
          key={deg}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{
            background: `color-mix(in oklab, ${accent}, #000 var(--tint-darken))`,
            top: "50%",
            left: "50%",
            transform: `rotate(${deg}deg) translateX(${size / 2}px)`,
            transformOrigin: "0 0",
            opacity: 0.55,
          }}
        />
      ))}
    </span>
  );
}
