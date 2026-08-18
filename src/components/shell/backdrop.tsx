/**
 * The page ground: round pools of blue light, a fine grid, and a floor.
 *
 * These used to be viewport-wide washes at very low alpha, which is the worst
 * of both — spread so thin they read as a faint grey haze rather than colour.
 * Concentrated circles are visibly blue while touching less of the page, so
 * the same amount of ink buys far more presence.
 *
 * Every colour is a token, so the whole thing inverts with the theme. Cheap by
 * construction: static layers, no blur filter, nothing animated. A large
 * `filter: blur()` re-rasterises every frame and measured expensive here.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="nx-no-print pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* the orbs — circle, not ellipse, so the falloff reads as round */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle 40rem at 50% -8rem, var(--orb-a), transparent 70%)," +
            "radial-gradient(circle 28rem at 12% 12%, var(--orb-b), transparent 70%)," +
            "radial-gradient(circle 26rem at 88% 4%, var(--orb-c), transparent 70%)," +
            "linear-gradient(180deg, var(--grad-sky) 0%, transparent 42%)",
        }}
      />

      {/* fine grid, faded out toward the edges */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--grid-line) 1px, transparent 1px)," +
            "linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 75% 60% at 50% 30%, #000 15%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 60% at 50% 30%, #000 15%, transparent 78%)",
        }}
      />

      {/* a floor, so the page sits on something instead of floating */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, transparent 50%, var(--floor) 100%)",
        }}
      />
    </div>
  );
}
