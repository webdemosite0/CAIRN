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
          <svg width="72" height="72" viewBox="0 0 40 40" fill="none">
            <path
              d="M20 3.5 A16.5 16.5 0 1 1 3.5 20"
              stroke="#7dcfff"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M20 9.5 A10.5 10.5 0 0 1 30.5 20"
              stroke="#bb9af7"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="20" cy="20" r="4.6" fill="#7aa2f7" />
          </svg>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#ededed",
            }}
          >
            CAIRN
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
