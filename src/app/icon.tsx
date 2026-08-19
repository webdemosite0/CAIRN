import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Favicon — the Trove planet, flattened for 32px.
 *
 * The same shape as TroveOrb, kept in sync by hand because this renders
 * through Satori, which has no access to the component or to CSS custom
 * properties. Colours are the literal values behind the ring and planet
 * gradients.
 *
 * Detail is dropped rather than scaled: the moon and the terminator stroke
 * turn to mud below about 20px, so the icon is the planet and its ring only,
 * and the ring is thickened to survive the size.
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
          background: "#0a0a0c",
          borderRadius: 7,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="r" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#5eead4" />
              <stop offset="1" stopColor="#a78bfa" />
            </linearGradient>
            <linearGradient id="p" x1="0.2" y1="0" x2="0.9" y2="1">
              <stop offset="0" stopColor="#8b7cff" />
              <stop offset="1" stopColor="#3b2f7a" />
            </linearGradient>
          </defs>
          <g transform="rotate(-22 24 25)">
            <path d="M4.5 25 A19.5 7.4 0 0 1 43.5 25" stroke="url(#r)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="24" cy="25" r="12.4" fill="url(#p)" />
            <path d="M43.5 25 A19.5 7.4 0 0 1 4.5 25" stroke="url(#r)" strokeWidth="3.4" strokeLinecap="round" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
