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
 * Uses the same Satori pipeline the favicon and OG image already go through,
 * so the output is the same shape rather than a screenshot of it. Colours are
 * literal because Satori has no CSS custom properties.
 *
 * The wordmark comes out in Satori's bundled Geist Regular, not the serif the
 * app uses — @vercel/og ships one face and next/font's Playfair is woff2,
 * which Satori will not reliably load. Supply a serif TTF here if the lockup
 * needs to match exactly; the planet itself is accurate.
 */

const OUT = process.env.OUT_DIR ?? "brand";
mkdirSync(OUT, { recursive: true });

const RING_A = "#5eead4";
const RING_B = "#7dd3fc";
const RING_C = "#a78bfa";
const PLANET_A = "#8b7cff";
const PLANET_B = "#6c5ce7";
const PLANET_C = "#2e2a5c";

/**
 * The planet, at whatever size, on a transparent ground.
 *
 * The ring is two arcs sharing one ellipse — the back half, then the planet,
 * then the front half — so it reads as orbiting rather than as a circle laid
 * over a disc. Ids are suffixed per instance or several marks on one canvas
 * would all resolve to the first gradient.
 */
function Planet({ size, id, moon = true }) {
  const s = size;
  const ring = `ring-${id}`;
  const planet = `planet-${id}`;
  const k = s / 48; // stroke widths scale with the mark

  return {
    type: "div",
    props: {
      style: { width: s, height: s, display: "flex" },
      children: {
        type: "svg",
        props: {
          width: s,
          height: s,
          viewBox: "0 0 48 48",
          fill: "none",
          children: [
            {
              type: "defs",
              props: {
                children: [
                  {
                    type: "linearGradient",
                    props: {
                      id: ring, x1: "0", y1: "1", x2: "1", y2: "0",
                      children: [
                        { type: "stop", props: { offset: "0", stopColor: RING_A } },
                        { type: "stop", props: { offset: "0.45", stopColor: RING_B } },
                        { type: "stop", props: { offset: "1", stopColor: RING_C } },
                      ],
                    },
                  },
                  {
                    type: "linearGradient",
                    props: {
                      id: planet, x1: "0.2", y1: "0", x2: "0.9", y2: "1",
                      children: [
                        { type: "stop", props: { offset: "0", stopColor: PLANET_A } },
                        { type: "stop", props: { offset: "0.55", stopColor: PLANET_B } },
                        { type: "stop", props: { offset: "1", stopColor: PLANET_C } },
                      ],
                    },
                  },
                ],
              },
            },
            {
              type: "g",
              props: {
                transform: "rotate(-22 24 25)",
                children: [
                  {
                    type: "path",
                    props: {
                      d: "M4.5 25 A19.5 7.4 0 0 1 43.5 25",
                      stroke: `url(#${ring})`,
                      strokeWidth: 2 / k > 0 ? 2 : 2,
                      strokeLinecap: "round",
                    },
                  },
                  { type: "circle", props: { cx: 24, cy: 25, r: 11.4, fill: `url(#${planet})` } },
                  {
                    type: "path",
                    props: {
                      d: "M43.5 25 A19.5 7.4 0 0 1 4.5 25",
                      stroke: `url(#${ring})`,
                      strokeWidth: 2.4,
                      strokeLinecap: "round",
                    },
                  },
                ],
              },
            },
            moon
              ? { type: "circle", props: { cx: 24, cy: 6.4, r: 3.1, fill: RING_A } }
              : null,
          ].filter(Boolean),
        },
      },
    },
  };
}

/** Planet plus wordmark, laid out horizontally. */
function Lockup({ width, ink, bg, id }) {
  const mark = Math.round(width * 0.24);
  return {
    type: "div",
    props: {
      style: {
        width,
        height: Math.round(width * 0.3),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.round(width * 0.04),
        background: bg ?? "transparent",
      },
      children: [
        Planet({ size: mark, id }),
        {
          type: "div",
          props: {
            style: {
              fontSize: Math.round(width * 0.145),
              letterSpacing: Math.round(width * 0.018),
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
function Tile({ size, id }) {
  return {
    type: "div",
    props: {
      style: {
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0c",
        borderRadius: Math.round(size * 0.22),
      },
      children: Planet({ size: Math.round(size * 0.66), id }),
    },
  };
}

const jobs = [
  { name: "trove-mark-1024.png", el: Planet({ size: 1024, id: "a" }), w: 1024, h: 1024 },
  { name: "trove-mark-512.png", el: Planet({ size: 512, id: "b" }), w: 512, h: 512 },
  { name: "trove-mark-256.png", el: Planet({ size: 256, id: "c" }), w: 256, h: 256 },
  { name: "trove-icon-tile-512.png", el: Tile({ size: 512, id: "d" }), w: 512, h: 512 },
  {
    name: "trove-lockup-dark-text-1024.png",
    el: Lockup({ width: 1024, ink: "#0d0d12", id: "e" }),
    w: 1024, h: 307,
  },
  {
    name: "trove-lockup-light-text-1024.png",
    el: Lockup({ width: 1024, ink: "#ffffff", id: "f" }),
    w: 1024, h: 307,
  },
  {
    name: "trove-lockup-on-dark-1024.png",
    el: Lockup({ width: 1024, ink: "#ffffff", bg: "#0a0a0c", id: "g" }),
    w: 1024, h: 307,
  },
];

for (const j of jobs) {
  const res = new ImageResponse(j.el, { width: j.w, height: j.h });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(join(OUT, j.name), buf);
  console.log(`${j.name.padEnd(34)} ${j.w}x${j.h}  ${(buf.length / 1024).toFixed(1)} KB`);
}
console.log("\nwrote", jobs.length, "files to", OUT);
