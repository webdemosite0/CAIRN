import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Favicon — the Trove orb, flattened for 32px.
 *
 * The same shape as TroveOrb: a core, an open orbit ring, and the particle
 * riding it. Kept in sync by hand because this renders through Satori, which
 * has no access to the component or to CSS custom properties. The colours are
 * the literal values behind --color-accent (dark) and its violet partner.
 *
 * Detail is dropped rather than scaled: the inner orbit and the second
 * particle turn to mud below about 20px, so only the outer ring survives.
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
        <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
          {/* Open orbit — the gap is what makes it read as motion. */}
          <circle
            cx="20"
            cy="20"
            r="15"
            stroke="#7c6fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray="56 38"
          />
          {/* The particle on the path. */}
          <circle cx="20" cy="5" r="3.1" fill="#a78bfa" />
          {/* Core. */}
          <circle cx="20" cy="20" r="5.6" fill="#7c6fff" />
        </svg>
      </div>
    ),
    size,
  );
}
