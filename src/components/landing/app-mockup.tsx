import {
  TbWorld,
  TbRobot,
  TbCode,
  TbFileText,
  TbTable,
  TbLayoutDashboard,
  TbSearch,
  TbBell,
  TbFolder,
  TbActivity,
  TbPlus,
} from "react-icons/tb";
import { FiArrowUp, FiPaperclip, FiMic } from "react-icons/fi";
import { TroveOrb } from "@/components/brand/orb";

/**
 * A drawing of the Trove workspace, for the hero.
 *
 * Composed from the same tokens as the real UI rather than screenshotted: a
 * screenshot is stale the moment the app moves, and it embeds whatever
 * happened to be in the database that day. This stays correct as long as the
 * palette does, weighs nothing, and stays sharp at any density.
 *
 * The floating file chips are the point of the whole image — they say the
 * output leaves as files, before anyone reads a word of copy.
 */

const RAIL_MAIN = [
  { icon: TbLayoutDashboard, label: "Home", active: true },
  { icon: TbFolder, label: "Projects" },
  { icon: TbActivity, label: "Activity" },
];

const RAIL_BUILD = [
  { icon: TbWorld, label: "Websites" },
  { icon: TbRobot, label: "Agents" },
  { icon: TbFileText, label: "Documents" },
  { icon: TbCode, label: "Code" },
  { icon: TbTable, label: "Spreadsheets" },
];

const SUGGESTIONS = [
  "Build a landing page",
  "Create a sales deck",
  "Analyse data",
  "Write a report",
  "Create an agent",
];

const CREATIONS = [
  { title: "SaaS Landing Page", meta: "Website", tone: "#8b5cf6" },
  { title: "Q2 Financial Model", meta: "Spreadsheet", tone: "#22c55e" },
  { title: "Investor Pitch Deck", meta: "Presentation", tone: "#f97316" },
  { title: "Support Agent", meta: "AI Agent", tone: "#a78bfa" },
  { title: "Analytics API", meta: "Code", tone: "#64748b" },
];

/** Floating file chips, positioned to break the frame on all four corners. */
const CHIPS = [
  { ext: ".docx", tone: "#2b7fff", at: "-top-4 left-[22%]", delay: "0s" },
  { ext: ".xlsx", tone: "#22c55e", at: "-top-2 right-[6%]", delay: "-2.4s" },
  { ext: ".pptx", tone: "#f97316", at: "-bottom-4 left-[16%]", delay: "-4.8s" },
  { ext: ".html", tone: "#8b5cf6", at: "-bottom-5 left-[46%]", delay: "-1.2s" },
  { ext: ".js", tone: "#eab308", at: "-bottom-2 right-[4%]", delay: "-3.6s", dark: true },
];

export function AppMockup() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[620px]">
      {/* Ambient light, so the window reads as lifted rather than pasted on. */}
      <div
        className="pointer-events-none absolute -inset-8 -z-10 blur-3xl"
        style={{
          background:
            "radial-gradient(circle 18rem at 60% 30%, color-mix(in oklab, var(--color-accent) 20%, transparent), transparent 70%)",
        }}
      />

      {/* ---- the window ---- */}
      <div className="overflow-hidden rounded-[12px] border border-line bg-canvas shadow-[var(--sh-3)]">
        <div className="flex">
          {/* rail */}
          <div className="hidden w-[128px] shrink-0 flex-col border-r border-line bg-rail p-2.5 sm:flex">
            <div className="mb-3 flex items-center gap-1.5 px-1">
              <TroveOrb size={13} state="idle" />
              <span className="text-[9px] font-bold tracking-[0.1em] text-ink">TROVE</span>
            </div>

            <div className="btn-grad mb-3 flex items-center justify-center gap-1 rounded-[5px] py-1.5 text-[9px] font-medium">
              <TbPlus size={9} /> New
            </div>

            {RAIL_MAIN.map((i) => (
              <div
                key={i.label}
                className={`mb-0.5 flex items-center gap-1.5 rounded-[4px] px-1.5 py-1 text-[9px] ${
                  i.active ? "bg-accent/10 font-medium text-ink" : "text-ink-4"
                }`}
              >
                <i.icon size={10} className={i.active ? "text-accent" : ""} />
                {i.label}
              </div>
            ))}

            <p className="mb-1 mt-2.5 px-1.5 text-[7px] font-semibold tracking-[0.12em] text-ink-4">
              BUILD
            </p>
            {RAIL_BUILD.map((i) => (
              <div
                key={i.label}
                className="mb-0.5 flex items-center gap-1.5 rounded-[4px] px-1.5 py-1 text-[9px] text-ink-4"
              >
                <i.icon size={10} />
                {i.label}
              </div>
            ))}

            <div className="mt-auto rounded-[5px] px-1.5 pt-2">
              <p className="text-[8px] text-ink-3">200 / 500 credits</p>
              <span className="mt-1 block h-[3px] overflow-hidden rounded-full bg-raised">
                <span className="block h-full w-[40%] rounded-full bg-accent" />
              </span>
            </div>
          </div>

          {/* main */}
          <div className="min-w-0 flex-1">
            {/* top bar */}
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <div className="flex h-6 flex-1 items-center gap-1.5 rounded-[5px] border border-line bg-sunk px-2">
                <TbSearch size={9} className="text-ink-4" />
                <span className="text-[8.5px] text-ink-4">Search anything…</span>
                <span className="ml-auto text-[7.5px] text-ink-4">⌘K</span>
              </div>
              <TbBell size={11} className="text-ink-4" />
              <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-soft text-[8px] font-semibold text-accent">
                Y
              </span>
            </div>

            <div className="p-4">
              <p className="text-center text-[9px] text-ink-4">Good afternoon, You</p>
              <p className="mt-0.5 text-center text-[15px] font-semibold tracking-tight text-ink">
                What will you build today?
              </p>

              {/* composer */}
              <div className="mt-3 rounded-[8px] border border-line bg-rail p-2.5">
                <p className="text-[9px] text-ink-4">Describe anything you want Trove to build…</p>
                <div className="mt-4 flex items-center gap-1.5">
                  {[
                    { icon: FiPaperclip, label: "Attach" },
                    { icon: FiMic, label: "Voice" },
                  ].map((b) => (
                    <span
                      key={b.label}
                      className="flex items-center gap-1 rounded-[4px] border border-line px-1.5 py-0.5 text-[8px] text-ink-3"
                    >
                      <b.icon size={7} />
                      {b.label}
                    </span>
                  ))}
                  <span className="flex items-center gap-1 rounded-[4px] border border-line px-1.5 py-0.5 text-[8px] text-ink-3">
                    <TroveOrb size={7} state="idle" />
                    Trove Intelligence
                  </span>
                  <span className="btn-grad ml-auto grid h-5 w-5 place-items-center rounded-full">
                    <FiArrowUp size={9} />
                  </span>
                </div>
              </div>

              {/* suggestions */}
              <div className="mt-2.5 flex flex-wrap gap-1">
                {SUGGESTIONS.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-line px-1.5 py-0.5 text-[7.5px] text-ink-4"
                  >
                    {s}
                  </span>
                ))}
              </div>

              {/* recent creations */}
              <div className="mt-3.5 flex items-center justify-between">
                <p className="text-[8.5px] font-medium text-ink-3">Recent creations</p>
                <p className="text-[8px] text-accent">View all</p>
              </div>

              <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                {CREATIONS.map((c) => (
                  <div key={c.title} className="overflow-hidden rounded-[5px] border border-line">
                    <span
                      className="block h-8"
                      style={{
                        background: `linear-gradient(135deg, color-mix(in srgb, ${c.tone} 55%, #0b0d13), #0b0d13)`,
                      }}
                    />
                    <span className="block bg-canvas px-1 py-1">
                      <span className="block truncate text-[7.5px] font-medium text-ink">
                        {c.title}
                      </span>
                      <span className="block text-[6.5px] text-ink-4">{c.meta}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- floating file chips ---- */}
      {CHIPS.map((c) => (
        <div
          key={c.ext}
          className={`nx-float absolute ${c.at} flex items-center gap-1.5 rounded-[7px] border px-2.5 py-1.5 shadow-[var(--sh-2)] ${
            c.dark ? "border-transparent bg-[#11141b]" : "border-line bg-canvas"
          }`}
          style={{ animationDelay: c.delay }}
        >
          <span
            className="grid h-4 w-4 place-items-center rounded-[3px]"
            style={{ background: `color-mix(in srgb, ${c.tone} 20%, transparent)` }}
          >
            <span className="h-1.5 w-1.5 rounded-[1px]" style={{ background: c.tone }} />
          </span>
          <span
            className={`text-[11px] font-medium ${c.dark ? "text-white" : "text-ink-2"}`}
          >
            {c.ext}
          </span>
        </div>
      ))}
    </div>
  );
}
