import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Favicon — the Trove planet, drawn for the size it is actually seen at.
 *
 * The same shape as TroveOrb, kept in sync by hand because this renders
 * through Satori, which has no access to the component or to CSS custom
 * properties. Colours are the literal values behind the gradients.
 *
 * This is drawn for 16px, not for 32. A search result, a tab strip and a
 * bookmark bar all render it at sixteen, and the previous version — a 52%
 * planet with a 2.6px ring — resolved to an indistinct purple smudge there:
 * every stroke landed under one device pixel. So the body fills far more of
 * the tile, the ring is thick enough to survive, and the gap between the ring
 * and the body is wide enough to still read as a gap when it is one pixel.
 *
 * Detail is dropped rather than scaled. The moon, the gloss and the rim light
 * turn to mud well before this size and are simply not here.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08090d",
          borderRadius: 7,
        }}
      >
        <svg width="30" height="30" viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="r" x1="0.05" y1="0.95" x2="0.95" y2="0.05">
              <stop offset="0" stopColor="#f5b8ff" />
              <stop offset="0.5" stopColor="#8b7cff" />
              <stop offset="1" stopColor="#4cc7ff" />
            </linearGradient>
            <radialGradient id="b" cx="0.34" cy="0.28" r="0.9">
              <stop offset="0" stopColor="#3b2680" />
              <stop offset="0.55" stopColor="#1b1140" />
              <stop offset="1" stopColor="#070414" />
            </radialGradient>
          </defs>
          <g transform="rotate(-20 24 24)">
            {/* Ring behind, then the body, then the ring in front: the planet
                sits inside its ring rather than on top of a line. */}
            <path
              d="M3.2 24 A20.8 7.6 0 0 1 44.8 24"
              stroke="url(#r)"
              strokeWidth="3.6"
              strokeLinecap="round"
            />
            <circle cx="24" cy="24" r="14.6" fill="url(#b)" />
            <circle
              cx="24"
              cy="24"
              r="14.6"
              fill="none"
              stroke="url(#r)"
              strokeWidth="2.8"
            />
            <path
              d="M44.8 24 A20.8 7.6 0 0 1 3.2 24"
              stroke="url(#r)"
              strokeWidth="4.4"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
