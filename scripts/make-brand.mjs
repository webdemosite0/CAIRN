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

const RING = ["#f0abfc", "#c084fc", "#7c6cff", "#38bdf8", "#5eead4"];
const RIM = ["#f0abfc", "#8b5cf6", "#38bdf8"];
const BODY = ["#2a1b5e", "#140c33", "#05030f"];
const MOON = ["#c4b5fd", "#3b2a6b", "#08050f"];
const OUTER = ["#a99cff", "#7c6cff"];

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
  const outer = `outer-${id}`;
  const body = `body-${id}`;
  const rim = `rim-${id}`;
  const moonG = `moon-${id}`;

  const lin = (id_, coords, stops) => ({
    type: "linearGradient",
    props: {
      id: id_,
      x1: coords[0], y1: coords[1], x2: coords[2], y2: coords[3],
      children: stops.map(([offset, stopColor]) => ({
        type: "stop",
        props: { offset, stopColor },
      })),
    },
  });

  const rad = (id_, cx, cy, r, stops) => ({
    type: "radialGradient",
    props: {
      id: id_, cx, cy, r,
      children: stops.map(([offset, stopColor]) => ({
        type: "stop",
        props: { offset, stopColor },
      })),
    },
  });

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
                  lin(ring, ["0.05", "0.95", "0.95", "0.05"], [
                    ["0", RING[0]], ["0.28", RING[1]], ["0.58", RING[2]],
                    ["0.82", RING[3]], ["1", RING[4]],
                  ]),
                  lin(outer, ["0", "1", "1", "0"], [["0", OUTER[0]], ["1", OUTER[1]]]),
                  lin(rim, ["0.15", "0.1", "0.85", "0.95"], [
                    ["0", RIM[0]], ["0.4", RIM[1]], ["1", RIM[2]],
                  ]),
                  lin(moonG, ["0.2", "0", "0.85", "1"], [
                    ["0", MOON[0]], ["0.5", MOON[1]], ["1", MOON[2]],
                  ]),
                  rad(body, "0.36", "0.3", "0.85", [
                    ["0", BODY[0]], ["0.45", BODY[1]], ["1", BODY[2]],
                  ]),
                ],
              },
            },

            // the moon's orbit, behind everything
            {
              type: "g",
              props: { transform: "rotate(14 24 24)", children: {
                type: "ellipse",
                props: {
                  cx: 24, cy: 24, rx: 21, ry: 8.2,
                  stroke: `url(#${outer})`, strokeWidth: 1.1, opacity: 0.55,
                },
              } },
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
                      strokeWidth: 1.8, strokeLinecap: "round", opacity: 0.65,
                    },
                  },
                  { type: "circle", props: { cx: 24, cy: 25, r: 11.4, fill: `url(#${body})` } },
                  {
                    type: "circle",
                    props: {
                      cx: 24, cy: 25, r: 11.4,
                      fill: "none", stroke: `url(#${rim})`, strokeWidth: 1.3,
                    },
                  },
                  {
                    type: "path",
                    props: {
                      d: "M43.5 25 A19.5 7.4 0 0 1 4.5 25",
                      stroke: `url(#${ring})`,
                      strokeWidth: 2.6, strokeLinecap: "round",
                    },
                  },
                ],
              },
            },

            moon
              ? { type: "circle", props: { cx: 24, cy: 6.2, r: 3.4, fill: `url(#${moonG})` } }
              : null,
            moon
              ? {
                  type: "circle",
                  props: {
                    cx: 24, cy: 6.2, r: 3.4,
                    fill: "none", stroke: MOON[0], strokeWidth: 0.6, opacity: 0.7,
                  },
                }
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
        background: "#08090d",
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
    el: Lockup({ width: 1024, ink: "#ffffff", bg: "#08090d", id: "g" }),
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
