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
import { FiArrowRight, FiCheck } from "react-icons/fi";
import type { IconType } from "react-icons";
import { TroveOrb } from "@/components/brand/orb";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

/** A section heading, so the rhythm is identical the whole way down. */
export function SectionHead({
  eyebrow,
  title,
  lede,
  center = true,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: string;
  center?: boolean;
}) {
  return (
    <div className={cn("max-w-[54ch]", center && "mx-auto text-center")}>
      {eyebrow ? (
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-4">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-[clamp(1.75rem,1.2rem+1.8vw,2.5rem)] font-semibold leading-[1.1] tracking-tight text-ink">
        {title}
      </h2>
      {lede ? (
        <p className="mt-3.5 text-[16px] leading-relaxed text-ink-3">{lede}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Proof bar                                                           */
/* ------------------------------------------------------------------ */

const CAPABILITIES: { icon: IconType; label: string }[] = [
  { icon: TbWorld, label: "Website creation" },
  { icon: TbRobot, label: "AI agents" },
  { icon: TbCode, label: "Code" },
  { icon: TbFileText, label: "Documents" },
  { icon: TbTable, label: "Spreadsheets" },
  { icon: TbSearch, label: "Research" },
  { icon: TbRefreshDot, label: "Automation" },
];

export function ProofBar() {
  return (
    <section aria-label="What Trove does" className="border-y border-line bg-rail/40">
      <div className="mx-auto max-w-[1140px] px-5 py-6 lg:px-8">
        <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-ink-4">
          Built for real work
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          {CAPABILITIES.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-[13.5px] text-ink-3">
              <c.icon size={16} className="shrink-0 text-ink-4" />
              {c.label}
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

const OUTCOMES: {
  icon: IconType;
  name: string;
  copy: string;
  tone: string;
  href: string;
  preview: React.ReactNode;
}[] = [
  {
    icon: TbWorld,
    name: "Website",
    copy: "Launch a complete website from a description.",
    tone: "#38bdf8",
    href: "/websites",
    preview: (
      <div className="space-y-1.5">
        <span className="block h-1.5 w-10 rounded-full bg-accent" />
        <span className="block h-2 w-[70%] rounded-[3px] bg-ink/25" />
        <div className="flex gap-1.5 pt-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-6 flex-1 rounded-[4px] bg-ink-4/15" />
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: TbRobot,
    name: "AI Agent",
    copy: "Create agents that work through repetitive tasks.",
    tone: "#a78bfa",
    href: "/agents",
    preview: (
      <div className="space-y-1.5">
        {["Plan the work", "Draft the reply", "Check it over"].map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full",
                i < 2 ? "bg-positive/70" : "bg-accent/70",
              )}
            />
            <span className="h-1.5 flex-1 rounded-[3px] bg-ink-4/20" />
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: TbCode,
    name: "Code",
    copy: "Build and modify production-ready code.",
    tone: "#34d399",
    href: "/code",
    preview: (
      <div className="space-y-1 font-mono text-[9px] leading-[1.6] text-ink-4">
        <div><span className="text-accent">export</span> function build() {"{"}</div>
        <div className="pl-3">return files.map(write)</div>
        <div>{"}"}</div>
      </div>
    ),
  },
  {
    icon: TbFileText,
    name: "Documents",
    copy: "Generate polished documents you can open in Word.",
    tone: "#60a5fa",
    href: "/documents",
    preview: (
      <div className="space-y-1.5">
        <span className="block h-2 w-[60%] rounded-[3px] bg-ink/25" />
        {[100, 92, 78].map((w, i) => (
          <span key={i} className="block h-1.5 rounded-[3px] bg-ink-4/20" style={{ width: `${w}%` }} />
        ))}
      </div>
    ),
  },
  {
    icon: TbTable,
    name: "Spreadsheets",
    copy: "Turn raw data into a structured, sortable workbook.",
    tone: "#4ade80",
    href: "/spreadsheets",
    preview: (
      <div className="space-y-1">
        {[0, 1, 2].map((r) => (
          <div key={r} className="flex gap-1">
            {[0, 1, 2].map((c) => (
              <span
                key={c}
                className={cn(
                  "h-2.5 flex-1 rounded-[2px]",
                  r === 0 ? "bg-ink-4/30" : c === 2 ? "bg-positive/25" : "bg-ink-4/15",
                )}
              />
            ))}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: TbSearch,
    name: "Research",
    copy: "Explore a topic and keep what you find organised.",
    tone: "#22d3ee",
    href: "/research",
    preview: (
      <div className="space-y-1.5">
        <span className="block h-1.5 w-[35%] rounded-[3px] bg-accent/50" />
        {[88, 96, 64].map((w, i) => (
          <span key={i} className="block h-1.5 rounded-[3px] bg-ink-4/20" style={{ width: `${w}%` }} />
        ))}
      </div>
    ),
  },
];

export function Outcomes() {
  return (
    <section className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-28">
      <SectionHead
        title="One prompt. Many outcomes."
        lede="Tell Trove what you need. It works out which tools the job wants and turns the idea into finished work."
      />

      <div className="nx-stagger mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OUTCOMES.map((o) => (
          <Link
            key={o.name}
            href={o.href}
            className={cn(
              "group flex flex-col rounded-[12px] border border-line bg-canvas p-4",
              "transition-[transform,border-color,box-shadow] duration-200",
              "hover:-translate-y-[3px] hover:border-line-strong hover:shadow-[var(--sh-2)]",
            )}
          >
            {/* A small picture of the output, rather than another icon in a
                rounded square. */}
            <div className="mb-4 rounded-[8px] border border-line bg-sunk p-3">
              <div className="min-h-[54px]">{o.preview}</div>
            </div>

            <span className="flex items-center gap-2">
              <o.icon size={16} style={{ color: o.tone }} />
              <span className="text-[14.5px] font-medium text-ink">{o.name}</span>
              <FiArrowRight
                size={14}
                className="ml-auto text-ink-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </span>
            <span className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">{o.copy}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Agents                                                              */
/* ------------------------------------------------------------------ */

const FLOW = [
  { label: "Your request", tone: "var(--color-ink-3)" },
  { label: "Trove Intelligence", tone: "var(--color-accent)" },
  { label: "Research agent", tone: "#22d3ee" },
  { label: "Build agent", tone: "#a78bfa" },
  { label: "Review agent", tone: "#f472b6" },
  { label: "Finished work", tone: "var(--color-positive)" },
];

export function AgentFlow() {
  return (
    <section className="border-y border-line bg-rail/40">
      <div className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-28">
        <SectionHead
          eyebrow="Agents"
          title="Don't just ask AI. Put it to work."
          lede="Create agents that plan, execute and finish multi-step work, then hand you the result."
        />

        <ol className="nx-stagger mx-auto mt-12 flex max-w-[900px] flex-col items-stretch gap-2 md:flex-row md:items-center md:gap-0">
          {FLOW.map((f, i) => (
            <li key={f.label} className="flex flex-1 items-center gap-2 md:flex-col md:gap-3">
              <div
                className={cn(
                  "flex w-full items-center gap-2 rounded-[8px] border border-line bg-canvas px-3 py-2.5",
                  "shadow-[var(--sh-1)] transition-transform duration-200 hover:-translate-y-[2px]",
                  "md:justify-center",
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: f.tone }}
                />
                <span className="whitespace-nowrap text-[12.5px] font-medium text-ink-2">
                  {f.label}
                </span>
              </div>

              {/* The connector. A gradient that travels, so the chain reads as
                  a flow rather than six boxes in a row. */}
              {i < FLOW.length - 1 ? (
                <span
                  aria-hidden
                  className="nx-wire hidden h-px w-full shrink-0 md:block"
                  style={{ animationDelay: `${i * 0.35}s` }}
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */

const FILES = [
  { ext: "DOCX", label: "Word", tone: "#60a5fa" },
  { ext: "XLSX", label: "Excel", tone: "#4ade80" },
  { ext: "PPTX", label: "PowerPoint", tone: "#fb923c" },
  { ext: "ZIP", label: "Website", tone: "#38bdf8" },
  { ext: "MD", label: "Markdown", tone: "#a78bfa" },
];

export function Files() {
  return (
    <section className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHead
            center={false}
            eyebrow="Your work"
            title="Your work doesn't disappear into a chat."
            lede="Every document, spreadsheet, deck, website and project stays where you left it — and leaves as a real file you can open anywhere."
          />
          <Link
            href="/chat"
            className="group mt-7 inline-flex items-center gap-2 text-[14.5px] font-medium text-accent"
          >
            Start building
            <FiArrowRight
              size={15}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
          {FILES.map((f, i) => (
            <li
              key={f.ext}
              className={cn(
                "nx-float rounded-[10px] border border-line bg-canvas p-3.5 shadow-[var(--sh-1)]",
                "transition-[transform,box-shadow] duration-200 hover:shadow-[var(--sh-2)]",
                i === 4 && "col-span-2 sm:col-span-1",
              )}
              style={{ animationDelay: `${i * -2.4}s` }}
            >
              <span
                className="grid h-8 w-8 place-items-center rounded-[6px] text-[10px] font-semibold tracking-tight"
                /* The label is darkened on light, where a bright tone on a
                   16% tint of itself measured as low as 1.58:1. Mixed in
                   srgb so the result matches what was measured, and
                   --tint-darken is 0% on dark, where the tone reads fine. */
                style={{
                  background: `color-mix(in srgb, ${f.tone} 16%, transparent)`,
                  color: `color-mix(in srgb, ${f.tone}, #000 var(--tint-darken))`,
                }}
              >
                {f.ext}
              </span>
              <p className="mt-2.5 text-[13px] font-medium text-ink">{f.label}</p>
              <p className="text-[11.5px] text-ink-4">Opens anywhere</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

const STEPS = [
  { n: "01", title: "Describe", copy: "Tell Trove what you want, in a sentence." },
  { n: "02", title: "Trove works", copy: "It plans the job, picks the tools and builds it." },
  { n: "03", title: "Get it done", copy: "Finished work you can download and actually use." },
];

export function HowItWorks() {
  return (
    <section className="border-y border-line bg-rail/40">
      <div className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-28">
        <SectionHead title="How it works" />
        <ol className="nx-stagger mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="block text-[40px] font-semibold leading-none tracking-tight text-accent/25">
                {s.n}
              </span>
              <h3 className="mt-3 text-[17px] font-medium text-ink">{s.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-3">{s.copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Use cases                                                           */
/* ------------------------------------------------------------------ */

const USES = [
  { label: "Build a website", href: "/websites" },
  { label: "Research a market", href: "/research" },
  { label: "Create an AI agent", href: "/agents" },
  { label: "Analyse data", href: "/spreadsheets" },
  { label: "Write a proposal", href: "/documents" },
  { label: "Build a prototype", href: "/code" },
  { label: "Put a team on it", href: "/team" },
  { label: "Make a deck", href: "/slides" },
];

export function UseCases() {
  return (
    <section className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-28">
      <SectionHead title="Built for the work you actually do." />
      <ul className="nx-stagger mt-10 flex flex-wrap justify-center gap-2.5">
        {USES.map((u) => (
          <li key={u.label}>
            <Link
              href={u.href}
              className={cn(
                "group flex items-center gap-2 rounded-[8px] border border-line bg-canvas px-4 py-2.5",
                "text-[14px] text-ink-2 transition-[transform,border-color,box-shadow] duration-200",
                "hover:-translate-y-[2px] hover:border-line-strong hover:text-ink hover:shadow-[var(--sh-2)]",
              )}
            >
              {u.label}
              <FiArrowRight
                size={13}
                className="text-ink-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

export function PricingPreview({
  plans,
}: {
  plans: { id: string; name: string; price: number; monthly: number; blurb: string }[];
}) {
  const shown = plans.slice(0, 2);

  return (
    <section className="border-y border-line bg-rail/40">
      <div className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-28">
        <SectionHead
          title="Start free. Grow when it earns it."
          lede="Credits are metered on real token usage, so a short answer costs less than a long one."
        />

        <div className="mx-auto mt-12 grid max-w-[720px] gap-4 sm:grid-cols-2">
          {shown.map((p, i) => (
            <div
              key={p.id}
              className={cn(
                "relative rounded-[12px] border bg-canvas p-6",
                i === 1 ? "border-accent/40 shadow-[var(--sh-2)]" : "border-line",
              )}
            >
              <p className="text-[13px] font-medium text-ink-3">{p.name}</p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-[36px] font-semibold tracking-tight text-ink">
                  ${p.price}
                </span>
                <span className="text-[13px] text-ink-4">/month</span>
              </p>
              <p className="mt-1 text-[13.5px] text-ink-3">
                {p.monthly.toLocaleString()} credits a month
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-4">{p.blurb}</p>

              <Link
                href={p.price === 0 ? "/chat" : "/plans"}
                className={cn(
                  "mt-6 flex h-11 items-center justify-center rounded-[8px] text-[14px] font-medium",
                  i === 1
                    ? "btn-grad"
                    : "border border-line-strong text-ink transition-colors hover:bg-hover",
                )}
              >
                {p.price === 0 ? "Start free" : "See plans"}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-4">
          <Link href="/plans" className="text-accent hover:underline">
            Compare every plan
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA                                                           */
/* ------------------------------------------------------------------ */

export function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 40rem 20rem at 50% 110%, color-mix(in oklab, var(--color-accent) 18%, transparent), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-[1140px] px-5 py-24 text-center lg:px-8 lg:py-32">
        <span aria-hidden className="mx-auto mb-6 block w-fit opacity-70">
          <TroveOrb size={44} state="thinking" />
        </span>

        <h2 className="mx-auto max-w-[18ch] text-[clamp(1.875rem,1.2rem+2.4vw,3rem)] font-semibold leading-[1.08] tracking-tight text-ink">
          Describe the idea. We&rsquo;ll handle the rest.
        </h2>
        <p className="mx-auto mt-4 max-w-[46ch] text-[16px] leading-relaxed text-ink-3">
          Start building with Trove today. No card, no setup.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/chat"
            className="btn-grad group flex h-[52px] items-center gap-2 rounded-[10px] px-7 text-[15px] font-medium"
          >
            Start for free
            <FiArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/plans"
            className="flex h-[52px] items-center rounded-[10px] border border-line-strong px-7 text-[15px] font-medium text-ink transition-colors hover:bg-hover"
          >
            Explore Trove
          </Link>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[13px] text-ink-4">
          <FiCheck size={13} className="text-positive" />
          200 credits included every month on the free plan
        </p>
      </div>
    </section>
  );
}
