"use client";

import { cn } from "@/lib/utils";

/**
 * The wordmark.
 *
 * Heavy geometric sans, near-circular bowls, set tight — matching the supplied
 * artwork. It was a high-contrast serif before; the reference settles that.
 *
 * The letters are filled with a gradient rather than a flat colour: white at
 * the top left falling to violet at the bottom right, which is what makes the
 * word read as the same material as the planet instead of a caption next to
 * it. Done with background-clip, so it stays live text — selectable, and
 * legible to a screen reader — rather than becoming an image.
 *
 * On a light background the same gradient would vanish, so there the fill
 * collapses to ink and only the final letters keep the accent. The mark still
 * reads as the mark; it just stops pretending there is a light source.
 *
 * The symbol lives in components/brand/orb.tsx.
 */
export function Wordmark({
  className,
  size = 64,
  sweep = true,
}: {
  className?: string;
  size?: number;
  /** A slow light sweep across the letters. Off wherever something else moves. */
  sweep?: boolean;
}) {
  return (
    <span
      className={cn("wordmark-gradient block leading-none", sweep && "nx-sweep-text", className)}
      style={{
        fontFamily: "var(--font-display)",
        fontSize: size,
        fontWeight: 800,
        // Geometric caps need almost no tracking — the circular O already
        // opens the word up, and the reference sets them nearly touching.
        letterSpacing: "0.005em",
      }}
    >
      TROVE
    </span>
  );
}
