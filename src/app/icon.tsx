import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon — the same aperture mark, flattened for 32px. */
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
          background: "#0f0f0f",
          borderRadius: 7,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
          <path
            d="M20 3.5 A16.5 16.5 0 1 1 3.5 20"
            stroke="#7dcfff"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="20" cy="20" r="5.4" fill="#7aa2f7" />
        </svg>
      </div>
    ),
    size,
  );
}
