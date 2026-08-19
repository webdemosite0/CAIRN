import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const alt = `${site.name} — ${site.shortDescription}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "#0f0f0f",
          position: "relative",
        }}
      >
        {/* gradient fields, matching the app backdrop */}
        <div
          style={{
            position: "absolute",
            top: -220,
            left: -140,
            width: 900,
            height: 700,
            background:
              "radial-gradient(circle at 40% 45%, rgba(59,130,246,0.34), transparent 62%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -200,
            width: 850,
            height: 700,
            background:
              "radial-gradient(circle at 55% 45%, rgba(167,139,250,0.30), transparent 62%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -260,
            left: 260,
            width: 800,
            height: 600,
            background:
              "radial-gradient(circle at 50% 50%, rgba(45,212,191,0.20), transparent 62%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {/* The Trove planet. Matches TroveOrb and the favicon; drawn
              literally rather than imported because Satori renders this
              without CSS custom properties or access to the component. At
              84px there is room for the moon, unlike the 32px favicon. */}
          <svg width="84" height="84" viewBox="0 0 48 48" fill="none">
            <defs>
              <linearGradient id="ogRing" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#5eead4" />
                <stop offset="0.45" stopColor="#7dd3fc" />
                <stop offset="1" stopColor="#a78bfa" />
              </linearGradient>
              <linearGradient id="ogPlanet" x1="0.2" y1="0" x2="0.9" y2="1">
                <stop offset="0" stopColor="#8b7cff" />
                <stop offset="0.55" stopColor="#6c5ce7" />
                <stop offset="1" stopColor="#2e2a5c" />
              </linearGradient>
            </defs>
            <g transform="rotate(-22 24 25)">
              <path
                d="M4.5 25 A19.5 7.4 0 0 1 43.5 25"
                stroke="url(#ogRing)"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="24" cy="25" r="11.4" fill="url(#ogPlanet)" />
              <path
                d="M43.5 25 A19.5 7.4 0 0 1 4.5 25"
                stroke="url(#ogRing)"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </g>
            <circle cx="24" cy="6.4" r="3.1" fill="#5eead4" />
          </svg>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#ededed",
            }}
          >
            TROVE
          </div>
        </div>

        <div
          style={{
            marginTop: 34,
            fontSize: 52,
            fontWeight: 600,
            lineHeight: 1.15,
            color: "#ededed",
            maxWidth: 900,
          }}
        >
          Describe what you want. It gets built.
        </div>

        <div
          style={{
            marginTop: 26,
            fontSize: 27,
            lineHeight: 1.4,
            color: "#8a8a8a",
            maxWidth: 880,
          }}
        >
          Websites, AI agents, documents and spreadsheets — generated, editable,
          and yours to download.
        </div>

        <div
          style={{
            marginTop: 44,
            display: "flex",
            gap: 14,
          }}
        >
          {["Website builder", "AI agents", ".docx", ".xlsx"].map((chip) => (
            <div
              key={chip}
              style={{
                border: "1px solid #333",
                borderRadius: 999,
                padding: "10px 22px",
                fontSize: 22,
                color: "#b4b4b4",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
