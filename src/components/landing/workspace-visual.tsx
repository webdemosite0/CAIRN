import { TbWorld, TbRobot, TbCode, TbTable } from "react-icons/tb";
import { FiCheck } from "react-icons/fi";
import { TroveOrb } from "@/components/brand/orb";

/**
 * The hero visual: one request becoming several finished things.
 *
 * A composed picture rather than a screenshot, because a screenshot of this
 * app would date the moment the UI moved. Everything is CSS and inline SVG —
 * no images, no canvas, no library — so it costs nothing to load and scales
 * cleanly on any display.
 *
 * The floating cards drift on `transform` only, and the whole thing stops
 * under prefers-reduced-motion via the rules in globals.css.
 */

const STEPS = [
  { label: "Understanding the request", done: true },
  { label: "Choosing the right tools", done: true },
  { label: "Generating files", done: false },
];

const OUTPUTS = [
  { icon: TbWorld, label: "Website", tone: "#38bdf8", pos: "-left-4 top-[18%]", delay: "0s" },
  { icon: TbRobot, label: "Agent", tone: "#a78bfa", pos: "-right-3 top-[8%]", delay: "-3s" },
  { icon: TbCode, label: "Code", tone: "#34d399", pos: "-left-2 bottom-[14%]", delay: "-6s" },
  { icon: TbTable, label: "Spreadsheet", tone: "#f472b6", pos: "-right-5 bottom-[22%]", delay: "-9s" },
];

export function WorkspaceVisual() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[460px] py-6">
      {/* Ambient light behind the stack, so the panel reads as lifted off the
          page rather than pasted onto it. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 blur-2xl"
        style={{
          background:
            "radial-gradient(circle 16rem at 50% 40%, color-mix(in oklab, var(--color-accent) 22%, transparent), transparent 70%)",
        }}
      />

      {/* The main panel */}
      <div className="bezel relative overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-line bg-rail/70 px-4 py-2.5">
          <TroveOrb size={18} state="working" />
          <span className="text-[12.5px] font-medium text-ink-2">Trove Intelligence</span>
          <span className="flex-1" />
          <span className="flex gap-1">
            {["#f87171", "#fbbf24", "#34d399"].map((c) => (
              <span key={c} className="h-2 w-2 rounded-full" style={{ background: c, opacity: 0.5 }} />
            ))}
          </span>
        </div>

        <div className="p-4">
          <p className="text-[12px] text-ink-4">Building your project…</p>

          <ul className="mt-3 space-y-2">
            {STEPS.map((s) => (
              <li key={s.label} className="flex items-center gap-2.5 text-[13px]">
                <span
                  className="grid h-4 w-4 shrink-0 place-items-center rounded-full"
                  style={{
                    background: s.done
                      ? "color-mix(in oklab, var(--color-positive) 18%, transparent)"
                      : "color-mix(in oklab, var(--color-accent) 18%, transparent)",
                  }}
                >
                  {s.done ? (
                    <FiCheck size={10} className="text-positive" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                </span>
                <span className={s.done ? "text-ink-3" : "text-ink"}>{s.label}</span>
              </li>
            ))}
          </ul>

          {/* A page taking shape, drawn as bars rather than faked text. */}
          <div className="mt-4 rounded-[8px] border border-line bg-sunk p-3">
            <span className="mb-2 block h-2 w-[46%] rounded-[3px] bg-ink/25" />
            <div className="space-y-1.5">
              {[100, 88, 94, 62].map((w, i) => (
                <span
                  key={i}
                  className="block h-1.5 rounded-[3px] bg-ink-4/25"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* The outputs, orbiting the panel */}
      {OUTPUTS.map((o) => (
        <div
          key={o.label}
          className={`nx-float absolute ${o.pos} flex items-center gap-1.5 rounded-[8px] border border-line bg-canvas px-2.5 py-1.5 shadow-[var(--sh-2)]`}
          style={{ animationDelay: o.delay }}
        >
          <o.icon size={13} style={{ color: o.tone }} />
          <span className="text-[11.5px] font-medium text-ink-2">{o.label}</span>
        </div>
      ))}
    </div>
  );
}
