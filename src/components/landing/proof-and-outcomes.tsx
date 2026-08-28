import Link from "next/link";
import {
  TbWorld,
  TbRobot,
  TbCode,
  TbFileText,
  TbTable,
  TbSearch,
  TbRefreshDot,
} from "react-icons/tb";
import { FiArrowRight } from "react-icons/fi";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Capability strip                                                    */
/* ------------------------------------------------------------------ */

const CAPS: { icon: IconType; label: string; sub: string; href: string }[] = [
  { icon: TbWorld, label: "Websites", sub: "Launch complete sites", href: "/websites" },
  { icon: TbRobot, label: "AI Agents", sub: "Automate any task", href: "/agents" },
  { icon: TbFileText, label: "Documents", sub: "Professionally written", href: "/documents" },
  { icon: TbTable, label: "Spreadsheets", sub: "Analyse and visualise", href: "/spreadsheets" },
  { icon: TbCode, label: "Code", sub: "Production ready", href: "/code" },
  { icon: TbSearch, label: "Research", sub: "Find and summarise", href: "/research" },
  { icon: TbRefreshDot, label: "AI Team", sub: "Four specialists, one task", href: "/team" },
];

export function CapabilityStrip() {
  return (
    <section aria-label="What Trove does" className="mx-auto max-w-[1140px] px-5 lg:px-8">
      <div className="grid items-stretch gap-0 overflow-hidden rounded-[var(--r-panel)] border border-line bg-canvas shadow-[var(--sh-1)] md:grid-cols-[140px_minmax(0,1fr)]">
        <div className="flex items-center border-b border-line px-5 py-4 md:border-b-0 md:border-r">
          <p className="text-[11px] font-semibold uppercase leading-[1.5] tracking-[0.1em] text-ink-3">
            Built for
            <br />
            real work
          </p>
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
          {CAPS.map((c, i) => (
            <li key={c.label} className={cn(i > 0 && "border-l border-line")}>
              <Link
                href={c.href}
                className="group flex h-full flex-col items-center gap-1.5 px-2 py-4 text-center transition-colors hover:bg-hover"
              >
                <c.icon
                  size={19}
                  className="text-ink-4 transition-colors group-hover:text-accent"
                />
                <span className="text-[12.5px] font-medium text-ink">{c.label}</span>
                <span className="text-[10.5px] leading-snug text-ink-4">{c.sub}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* One prompt, many outcomes                                           */
/* ------------------------------------------------------------------ */

/** A dark preview plate, standing in for the artefact each tool produces. */
function Plate({ kind }: { kind: string }) {
  const base = "absolute inset-0 p-2.5";

  if (kind === "website") {
    return (
      <>
        <span className={base}>
          <span className="mb-1 block h-1 w-6 rounded-full bg-white/60" />
          <span className="mb-1.5 block h-2 w-[62%] rounded-[var(--r-tight)] bg-white/35" />
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-5 flex-1 rounded-[var(--r-tight)] bg-white/12" />
            ))}
          </span>
        </span>
      </>
    );
  }
  if (kind === "agent") {
    return (
      <span className={base}>
        {[70, 90, 55].map((w, i) => (
          <span key={i} className="mb-1.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />
            <span className="block h-1.5 rounded-[var(--r-tight)] bg-white/25" style={{ width: `${w}%` }} />
          </span>
        ))}
      </span>
    );
  }
  if (kind === "sheet") {
    return (
      <span className={`${base} flex items-end gap-1`}>
        {[40, 65, 30, 80, 55, 70].map((h, i) => (
          <span key={i} className="flex-1 rounded-[var(--r-tight)] bg-white/45" style={{ height: `${h}%` }} />
        ))}
      </span>
    );
  }
  if (kind === "doc") {
    return (
      <span className={base}>
        <span className="mb-1.5 block h-2 w-[50%] rounded-[var(--r-tight)] bg-white/45" />
        {[100, 92, 78, 96].map((w, i) => (
          <span
            key={i}
            className="mb-1 block h-1 rounded-[var(--r-tight)] bg-white/20"
            style={{ width: `${w}%` }}
          />
        ))}
      </span>
    );
  }
  return (
    // A picture of code, not code. At 7px and 55% alpha it is texture — it
    // measures 1.04 against its backdrop and no one is meant to read it. Hidden
    // from assistive tech because it was otherwise announced, inside a link, as
    // four lines of meaningless source.
    <span
      aria-hidden
      className={`${base} font-mono text-[7px] leading-[1.7] text-white/55`}
    >
      <span className="block text-white/80">export function build() {"{"}</span>
      <span className="block pl-2">const files = plan()</span>
      <span className="block pl-2">return write(files)</span>
      <span className="block">{"}"}</span>
    </span>
  );
}

const OUTCOMES = [
  { kind: "website", name: "Website", copy: "A complete, responsive website in seconds.", href: "/websites", tone: "#7c3aed" },
  { kind: "agent", name: "AI Agent", copy: "An agent that thinks, acts and gets things done.", href: "/agents", tone: "#6d28d9" },
  { kind: "sheet", name: "Spreadsheet", copy: "Clean, structured data ready to analyse.", href: "/spreadsheets", tone: "#15803d" },
  { kind: "doc", name: "Document", copy: "Polished documents ready to share.", href: "/documents", tone: "#334155" },
  { kind: "code", name: "Code", copy: "Clean, production-ready code.", href: "/code", tone: "#0f172a" },
];

export function Outcomes() {
  return (
    <section className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
        <div className="lg:pt-2">
          <h2 className="text-[clamp(1.6rem,1.2rem+1.2vw,2rem)] font-semibold leading-[1.15] tracking-tight text-ink">
            One prompt.
            <br />
            Many outcomes.
          </h2>
          <p className="mt-3.5 max-w-[34ch] text-[14.5px] leading-relaxed text-ink-3">
            Trove works out which tools the job needs, then turns your idea into
            the right kind of output.
          </p>
          <Link
            href="/chat"
            className="group mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-accent"
          >
            Explore all capabilities
            <FiArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <div className="nx-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {OUTCOMES.map((o) => (
            <Link
              key={o.name}
              href={o.href}
              className={cn(
                "group flex flex-col overflow-hidden rounded-[var(--r-panel)] border border-line bg-canvas",
                "transition-[transform,border-color,box-shadow] duration-200",
                "hover:-translate-y-[3px] hover:border-line-strong hover:shadow-[var(--sh-2)]",
              )}
            >
              <span
                className="relative block h-[74px] overflow-hidden"
                style={{
                  background: `linear-gradient(140deg, ${o.tone}, color-mix(in srgb, ${o.tone} 35%, #0b0d13))`,
                }}
              >
                <Plate kind={o.kind} />
              </span>

              <span className="flex flex-1 flex-col p-3">
                <span className="text-[13.5px] font-medium text-ink">{o.name}</span>
                <span className="mt-1 flex-1 text-[12px] leading-relaxed text-ink-4">
                  {o.copy}
                </span>
                <FiArrowRight
                  size={13}
                  className="mt-2 self-end text-ink-4 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
