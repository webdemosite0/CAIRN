"use client";

import { cn } from "@/lib/utils";

/**
 * The wordmark.
 *
 * The symbol lives in components/brand/orb.tsx. There used to be a second mark
 * here — three nested arcs — which meant the brand differed between the rail
 * and a chat message depending on which component happened to be imported.
 * TroveOrb replaced it everywhere: it carries state, which the old mark never
 * did, so the same shape can be the logo, the thinking indicator and an agent's
 * status light.
 *
 * A light sweep travels across the letters on a slow loop — the only
 * decorative motion on an otherwise still screen. Set `sweep={false}` wherever
 * the mark sits next to something already moving.
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
