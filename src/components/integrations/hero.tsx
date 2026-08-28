import { TbDeviceDesktop } from "react-icons/tb";
import type { IconType } from "react-icons";
import {
  SiGmail,
  SiNotion,
  SiGoogledrive,
  SiGooglecalendar,
  SiGithub,
  SiFigma,
} from "react-icons/si";

/**
 * The header of the integrations page: a hub with services orbiting it.
 *
 * Drawn rather than illustrated — inline SVG for the wires and positioned
 * nodes for the logos, so it costs nothing and inherits the theme. The wires
 * sit behind the nodes in a single absolutely-positioned SVG, which keeps the
 * geometry in one place instead of six rotated divs.
 *
 * Monochrome marks use --color-ink rather than white, or they vanish on the
 * light card. The six shown are decoration for the page, not a claim about
 * what is connected — the list below is the source of truth for that.
 *
 * (The six are the ones with real brand marks in the icon set. They are
 * chosen for recognisability.)
 */

interface Node {
  icon: IconType;
  label: string;
  tone: string;
  /** Percentage position within the diagram box. */
  x: number;
  y: number;
}

const NODES: Node[] = [
  { icon: SiGmail, label: "Gmail", tone: "#ea4335", x: 8, y: 50 },
  { icon: SiFigma, label: "Figma", tone: "#f24e1e", x: 30, y: 14 },
  { icon: SiGoogledrive, label: "Drive", tone: "#4285f4", x: 70, y: 14 },
  { icon: SiGooglecalendar, label: "Calendar", tone: "#4285f4", x: 92, y: 50 },
  { icon: SiNotion, label: "Notion", tone: "var(--color-ink)", x: 30, y: 86 },
  { icon: SiGithub, label: "GitHub", tone: "var(--color-ink)", x: 70, y: 86 },
];

export function IntegrationsHero({
  total,
  connected,
}: {
  total: number;
  connected: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-[var(--r-card)] border border-line bg-raised">
      {/* A single soft light from the left, so the panel has a direction. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle 26rem at 8% 30%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 62%)",
        }}
      />

      <div className="relative grid items-center gap-8 p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:p-10">
        <div>
          <h1 className="text-[clamp(2rem,1.5rem+1.6vw,2.75rem)] font-semibold tracking-tight text-ink">
            Integrations
          </h1>
          <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-ink-3">
            Connect the apps you already use, so Trove can read your data, take
            actions, and work across your tools.
          </p>
          <p className="mt-4 text-[13px] text-ink-4">
            {total} services · {connected} connected
          </p>
        </div>

        {/* ---- the hub ---- */}
        <div aria-hidden className="relative mx-auto aspect-[4/3] w-full max-w-[420px]">
          {/* wires, behind everything */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {NODES.map((n) => (
              <line
                key={n.label}
                x1="50"
                y1="50"
                x2={n.x}
                y2={n.y}
                stroke="var(--color-line-strong)"
                strokeWidth="0.4"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* the hub itself */}
          <span
            className="absolute grid h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[var(--r-card)] border bg-canvas sm:h-[74px] sm:w-[74px]"
            style={{
              left: "50%",
              top: "50%",
              borderColor: "color-mix(in srgb, var(--color-accent) 60%, transparent)",
              boxShadow: "0 0 0 6px color-mix(in srgb, var(--color-accent) 8%, transparent)",
            }}
          >
            <TbDeviceDesktop size={30} className="text-accent" />
          </span>

          {/* the services */}
          {NODES.map((n, i) => (
            <span
              key={n.label}
              className="nx-float absolute grid h-[44px] w-[44px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-canvas sm:h-[54px] sm:w-[54px]"
              style={{
                left: `${n.x}%`,
                top: `${n.y}%`,
                animationDelay: `${i * -1.3}s`,
              }}
            >
              <n.icon size={22} style={{ color: n.tone }} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
