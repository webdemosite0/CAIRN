"use client";

import { cn } from "@/lib/utils";

/**
 * The wordmark.
 *
 * Set in a high-contrast serif rather than the interface sans. That contrast
 * is the point: the mark reads as a name rather than as another label in the
 * UI, and it is the only serif anywhere in the product.
 *
 * The symbol lives in components/brand/orb.tsx.
 *
 * A light sweep travels across the letters on a slow loop — the only
 * decorative motion on an otherwise still screen. Set `sweep={false}` wherever
 * the mark sits next to something already moving, which is most places.
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
      style={{
        fontFamily: "var(--font-display)",
        fontSize: size,
        fontWeight: 500,
        // Serifs need far less tracking than the old bold sans did; 0.08em
        // pulled the letters apart into separate objects.
        letterSpacing: "0.14em",
        // The trailing letter-space pushes the word off-centre otherwise.
        textIndent: "0.14em",
      }}
    >
      TROVE
    </span>
  );
}
