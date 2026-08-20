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
          background: "#08090d",
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
          <svg width="88" height="88" viewBox="0 0 48 48" fill="none">
            <defs>
              <linearGradient id="ogRing" x1="0.05" y1="0.95" x2="0.95" y2="0.05">
                <stop offset="0" stopColor="#f0abfc" />
                <stop offset="0.28" stopColor="#c084fc" />
                <stop offset="0.58" stopColor="#7c6cff" />
                <stop offset="0.82" stopColor="#38bdf8" />
                <stop offset="1" stopColor="#5eead4" />
              </linearGradient>
              <linearGradient id="ogOuter" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#a99cff" />
                <stop offset="1" stopColor="#7c6cff" />
              </linearGradient>
              <radialGradient id="ogBody" cx="0.36" cy="0.3" r="0.85">
                <stop offset="0" stopColor="#2a1b5e" />
                <stop offset="0.45" stopColor="#140c33" />
                <stop offset="1" stopColor="#05030f" />
              </radialGradient>
              <linearGradient id="ogRim" x1="0.15" y1="0.1" x2="0.85" y2="0.95">
                <stop offset="0" stopColor="#f0abfc" />
                <stop offset="0.4" stopColor="#8b5cf6" />
                <stop offset="1" stopColor="#38bdf8" />
              </linearGradient>
              <linearGradient id="ogMoon" x1="0.2" y1="0" x2="0.85" y2="1">
                <stop offset="0" stopColor="#c4b5fd" />
                <stop offset="0.5" stopColor="#3b2a6b" />
                <stop offset="1" stopColor="#08050f" />
              </linearGradient>
            </defs>

            <g transform="rotate(14 24 24)">
              <ellipse cx="24" cy="24" rx="21" ry="8.2" stroke="url(#ogOuter)" strokeWidth="1.1" opacity="0.55" />
            </g>

            <g transform="rotate(-22 24 25)">
              <path d="M4.5 25 A19.5 7.4 0 0 1 43.5 25" stroke="url(#ogRing)" strokeWidth="1.8" strokeLinecap="round" opacity="0.65" />
              <circle cx="24" cy="25" r="11.4" fill="url(#ogBody)" />
              <circle cx="24" cy="25" r="11.4" fill="none" stroke="url(#ogRim)" strokeWidth="1.3" />
              <path d="M43.5 25 A19.5 7.4 0 0 1 4.5 25" stroke="url(#ogRing)" strokeWidth="2.6" strokeLinecap="round" />
            </g>

            <circle cx="24" cy="6.2" r="3.4" fill="url(#ogMoon)" />
            <circle cx="24" cy="6.2" r="3.4" fill="none" stroke="#c4b5fd" strokeWidth="0.6" opacity="0.7" />
          </svg>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              letterSpacing: "0.005em",
              color: "#f5f5f7",
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
            color: "#f5f5f7",
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
            color: "#a5a8b8",
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
                border: "1px solid #2a3042",
                borderRadius: 999,
                padding: "10px 22px",
                fontSize: 22,
                color: "#a5a8b8",
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
