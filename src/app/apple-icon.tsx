import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The icon iOS uses for a home-screen bookmark.
 *
 * There was none, and a request for /apple-touch-icon.png answered with the
 * app's HTML at status 200 — so Safari fetched a page, failed to decode it as
 * an image, and fell back to a screenshot of the site. Anyone who saved Trove
 * to their home screen got a thumbnail of a web page rather than a mark.
 *
 * 180x180 is the size iOS asks for, and at that size the detail the favicon
 * has to drop is worth drawing: the moon and the gloss are back. iOS applies
 * its own rounded mask, so this fills the square and lets the system clip it —
 * rounding it here as well would show a dark corner inside the mask.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #14132b 0%, #08090d 60%)",
        }}
      >
        <svg width="150" height="150" viewBox="0 0 48 48" fill="none">
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
            <radialGradient id="g" cx="0.32" cy="0.26" r="0.5">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g transform="rotate(-20 24 24)">
            <path
              d="M4.6 24 A19.4 7.1 0 0 1 43.4 24"
              stroke="url(#r)"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <circle cx="24" cy="24" r="13.4" fill="url(#b)" />
            <circle cx="24" cy="24" r="13.4" fill="url(#g)" />
            <circle
              cx="24"
              cy="24"
              r="13.4"
              fill="none"
              stroke="url(#r)"
              strokeWidth="1.15"
            />
            <path
              d="M43.4 24 A19.4 7.1 0 0 1 4.6 24"
              stroke="url(#r)"
              strokeWidth="2.3"
              strokeLinecap="round"
            />
            {/* The moon, which only earns its place above about 64px. */}
            <circle cx="40.5" cy="14.5" r="2.5" fill="#f5b8ff" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
