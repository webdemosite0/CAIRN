/**
 * The page ground: a deep blue field that falls away toward the bottom, a fine
 * grid, and a slow band of light across the top.
 *
 * Every colour is a token, so the whole thing inverts with the theme — on dark
 * it is midnight blue lit from above, on light it is a pale sky settling into
 * white. Painting one fixed gradient would leave the light theme looking like a
 * dark screenshot someone had brightened.
 *
 * Cheap by construction: three static layers, no blur, nothing animated. A
 * large filter: blur() re-rasterises every frame and was measurably costly here.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* the blue field itself */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -20%, var(--grad-top), transparent 60%)," +
            "radial-gradient(90% 60% at 12% 8%, var(--grad-left), transparent 55%)," +
            "radial-gradient(90% 65% at 88% 4%, var(--grad-right), transparent 55%)," +
            "linear-gradient(180deg, var(--grad-sky) 0%, transparent 45%)",
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
