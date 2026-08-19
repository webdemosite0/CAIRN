import { createRequire } from "module";
const require_ = createRequire(import.meta.url);
// next/og is a CJS subpath; ESM cannot resolve it directly.
const { ImageResponse } = require_("next/og");
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * Renders the Trove brand assets to PNG.
 *
 * Run with:  node scripts/make-brand.mjs
 *
 * The wordmark comes out in Satori's bundled Geist Regular, not the 700
 * weight the app uses — @vercel/og ships one face and next/font's Inter is
 * woff2, which Satori will not reliably load. Supply a bold TTF here if the
 * lockup needs to match exactly; the orb itself is pixel-accurate.
 *
 * Uses the same Satori pipeline the favicon and OG image already go through,
 * so the output is the same shape rather than a screenshot of it. Colours are
 * literal here because Satori has no CSS custom properties — the values are
 * the ones behind --color-accent (dark) and its violet partner.
 */

const OUT = process.env.OUT_DIR ?? "brand";
mkdirSync(OUT, { recursive: true });

const ACCENT = "#7c6fff";
const VIOLET = "#a78bfa";
const MINT = "#5eead4";

/** The orb, at whatever size, on a transparent ground. */
function Orb({ size }) {
  const s = size;
  return {
    type: "div",
    props: {
      style: {
        width: s,
        height: s,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      children: {
        type: "svg",
        props: {
          width: s,
          height: s,
          viewBox: "0 0 40 40",
          fill: "none",
          children: [
            // open orbit — the gap is what reads as motion
            {
              type: "circle",
              props: {
                cx: 20, cy: 20, r: 15.5,
                stroke: ACCENT,
                strokeWidth: 1.6,
                strokeLinecap: "round",
                strokeDasharray: "58 39",
                // Circumference is about 97.4, and the dash starts at 3
                // o'clock, which put the gap across the top — exactly where
                // the particles sit, so they read as loose dots above a
                // broken circle. Half a turn of offset moves the gap to the
                // bottom so the particles sit on solid stroke.
                strokeDashoffset: 48.7,
              },
            },
            // particle on the outer path
            { type: "circle", props: { cx: 20, cy: 4.5, r: 2.2, fill: VIOLET } },
            // inner counter-orbit particle
            { type: "circle", props: { cx: 20, cy: 9.6, r: 1.6, fill: MINT } },
            // core
            { type: "circle", props: { cx: 20, cy: 20, r: 4.9, fill: ACCENT } },
          ],
        },
      },
    },
  };
}

/** Orb plus wordmark, laid out horizontally. */
function Lockup({ width, ink, bg }) {
  const orb = Math.round(width * 0.22);
  return {
    type: "div",
    props: {
      style: {
        width,
        height: Math.round(width * 0.28),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.round(width * 0.045),
        background: bg ?? "transparent",
      },
      children: [
        Orb({ size: orb }),
        {
          type: "div",
          props: {
            style: {
              fontSize: Math.round(width * 0.155),
              fontWeight: 700,
              letterSpacing: Math.round(width * 0.0124),
              color: ink,
              display: "flex",
            },
            children: "TROVE",
          },
        },
      ],
    },
  };
}

/** A rounded app-icon tile, the shape a launcher expects. */
function Tile({ size }) {
  return {
    type: "div",
    props: {
      style: {
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#08090d",
        borderRadius: Math.round(size * 0.22),
      },
      children: Orb({ size: Math.round(size * 0.62) }),
    },
  };
}

const jobs = [
  { name: "trove-orb-1024.png", el: Orb({ size: 1024 }), w: 1024, h: 1024 },
  { name: "trove-orb-512.png", el: Orb({ size: 512 }), w: 512, h: 512 },
  { name: "trove-orb-256.png", el: Orb({ size: 256 }), w: 256, h: 256 },
  { name: "trove-icon-tile-512.png", el: Tile({ size: 512 }), w: 512, h: 512 },
  {
    name: "trove-lockup-dark-text-1024.png",
    el: Lockup({ width: 1024, ink: "#171a2b" }),
    w: 1024,
    h: 287,
  },
  {
    name: "trove-lockup-light-text-1024.png",
    el: Lockup({ width: 1024, ink: "#f5f7fa" }),
    w: 1024,
    h: 287,
  },
  {
    name: "trove-lockup-on-dark-1024.png",
    el: Lockup({ width: 1024, ink: "#f5f7fa", bg: "#08090d" }),
    w: 1024,
    h: 287,
  },
];

for (const j of jobs) {
  const res = new ImageResponse(j.el, { width: j.w, height: j.h });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(join(OUT, j.name), buf);
  console.log(`${j.name.padEnd(34)} ${j.w}x${j.h}  ${(buf.length / 1024).toFixed(1)} KB`);
}
console.log("\nwrote", jobs.length, "files to", OUT);
