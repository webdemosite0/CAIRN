import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Favicon — the Trove planet, flattened for 32px.
 *
 * The same shape as TroveOrb, kept in sync by hand because this renders
 * through Satori, which has no access to the component or to CSS custom
 * properties. Colours are the literal values behind the gradients.
 *
 * Detail is dropped rather than scaled. The moon, the gloss, the rim light and
 * the outer orbit all turn to mud below about 20px, so the icon is the body,
 * its rim and one ring — and the ring is thickened to survive the size.
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
        <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="r" x1="0.05" y1="0.95" x2="0.95" y2="0.05">
              <stop offset="0" stopColor="#f0abfc" />
              <stop offset="0.5" stopColor="#7c6cff" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
            <radialGradient id="b" cx="0.36" cy="0.3" r="0.85">
              <stop offset="0" stopColor="#2a1b5e" />
              <stop offset="0.5" stopColor="#140c33" />
              <stop offset="1" stopColor="#05030f" />
            </radialGradient>
          </defs>
          <g transform="rotate(-22 24 25)">
            <path
              d="M4.5 25 A19.5 7.4 0 0 1 43.5 25"
              stroke="url(#r)"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <circle cx="24" cy="25" r="12.4" fill="url(#b)" />
            <circle
              cx="24"
              cy="25"
              r="12.4"
              fill="none"
              stroke="url(#r)"
              strokeWidth="1.9"
            />
            <path
              d="M43.5 25 A19.5 7.4 0 0 1 4.5 25"
              stroke="url(#r)"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
