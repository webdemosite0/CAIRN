import Link from "next/link";
import { FiArrowRight, FiCheck } from "react-icons/fi";
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
                  "flex w-full items-center gap-2 rounded-[var(--r-control)] border border-line bg-canvas px-3 py-2.5",
                  "shadow-[var(--sh-1)] transition-transform duration-[var(--t-hover)] hover:-translate-y-[2px]",
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
              className="transition-transform duration-[var(--t-hover)] group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
          {FILES.map((f, i) => (
            <li
              key={f.ext}
              className={cn(
                "nx-float rounded-[var(--r-panel)] border border-line bg-canvas p-3.5 shadow-[var(--sh-1)]",
                "transition-[transform,box-shadow] duration-[var(--t-hover)] hover:shadow-[var(--sh-2)]",
                i === 4 && "col-span-2 sm:col-span-1",
              )}
              style={{ animationDelay: `${i * -2.4}s` }}
            >
              <span
                className="grid h-8 w-8 place-items-center rounded-[var(--r-chip)] text-[10px] font-semibold tracking-tight"
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
                "group flex items-center gap-2 rounded-[var(--r-control)] border border-line bg-canvas px-4 py-2.5",
                "text-[14px] text-ink-2 transition-[transform,border-color,box-shadow] duration-[var(--t-hover)]",
                "hover:-translate-y-[2px] hover:border-line-strong hover:text-ink hover:shadow-[var(--sh-2)]",
              )}
            >
              {u.label}
              <FiArrowRight
                size={13}
                className="text-ink-4 transition-transform duration-[var(--t-hover)] group-hover:translate-x-0.5"
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
                "relative rounded-[var(--r-panel)] border bg-canvas p-6",
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
                  "mt-6 flex h-11 items-center justify-center rounded-[var(--r-control)] text-[14px] font-medium",
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
            className="btn-grad group flex h-[52px] items-center gap-2 rounded-[var(--r-panel)] px-7 text-[15px] font-medium"
          >
            Start for free
            <FiArrowRight
              size={16}
              className="transition-transform duration-[var(--t-hover)] group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/plans"
            className="flex h-[52px] items-center rounded-[var(--r-panel)] border border-line-strong px-7 text-[15px] font-medium text-ink transition-colors hover:bg-hover"
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
