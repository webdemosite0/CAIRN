import Link from "next/link";
import { FiArrowRight, FiCheck, FiMessageSquare } from "react-icons/fi";
import { TbSettings2, TbCircleCheck, TbLock, TbDownload, TbCurrencyDollarOff } from "react-icons/tb";
import { TroveOrb } from "@/components/brand/orb";

/* ------------------------------------------------------------------ */
/* Connected workspace                                                 */
/* ------------------------------------------------------------------ */

const THREADS = [
  { title: "SaaS landing page", sub: "Build a modern landing page for an AI startup…", when: "2m ago", active: true },
  { title: "Market research report", sub: "Research the AI agent market and key trends…", when: "1h ago" },
  { title: "Customer support agent", sub: "Create an agent that handles customer enquiries…", when: "3h ago" },
  { title: "Financial model Q2", sub: "Build a financial model with revenue projections…", when: "1d ago" },
];

const BUILD_STEPS = [
  { label: "Understanding your request", state: "done" },
  { label: "Planning the structure", state: "done" },
  { label: "Designing the pages", state: "run" },
  { label: "Writing the code", state: "todo" },
  { label: "Optimising for mobile", state: "todo" },
  { label: "Finalising and testing", state: "todo" },
];

export function ConnectedWorkspace() {
  return (
    <section className="border-y border-line bg-rail/50">
      <div className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
          <div className="lg:pt-2">
            <h2 className="text-[clamp(1.6rem,1.2rem+1.2vw,2rem)] font-semibold leading-[1.15] tracking-tight text-ink">
              Your AI workspace.
              <br />
              Everything connected.
            </h2>
            <p className="mt-3.5 max-w-[34ch] text-[14.5px] leading-relaxed text-ink-3">
              Files, agents, conversations and projects live together in one
              place — and stay there.
            </p>
            <Link
              href="/chat"
              className="group mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-accent"
            >
              See the workspace in action
              <FiArrowRight
                size={14}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          {/* A picture of the workspace, drawn from the same tokens as the app */}
          <div
            aria-hidden
            className="overflow-hidden rounded-[12px] border border-line bg-canvas shadow-[var(--sh-2)]"
          >
            <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              {/* threads */}
              <div className="border-b border-line p-3 sm:border-b-0 sm:border-r">
                <p className="mb-2 text-[10px] font-medium text-ink-3">Threads</p>
                {THREADS.map((t) => (
                  <div
                    key={t.title}
                    className={`mb-1 rounded-[6px] px-2 py-1.5 ${t.active ? "bg-accent/[0.07]" : ""}`}
                  >
                    <div className="flex items-baseline gap-2">
                      <FiMessageSquare
                        size={9}
                        className={`shrink-0 ${t.active ? "text-accent" : "text-ink-4"}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-ink">
                        {t.title}
                      </span>
                      <span className="shrink-0 text-[8.5px] text-ink-4">{t.when}</span>
                    </div>
                    <p className="truncate pl-[17px] text-[9px] text-ink-4">{t.sub}</p>
                  </div>
                ))}
              </div>

              {/* the running build */}
              <div className="relative p-3">
                <p className="mb-2 text-[10px] font-medium text-ink-3">Thread</p>

                <div className="mb-2 flex items-center gap-1.5 rounded-[6px] bg-accent/[0.07] px-2 py-1.5">
                  <TroveOrb size={11} state="working" />
                  <span className="text-[10px] text-ink-2">Trove is building your website</span>
                </div>

                {BUILD_STEPS.map((s) => (
                  <div key={s.label} className="mb-1.5 flex items-center gap-1.5 pl-1">
                    {s.state === "done" ? (
                      <FiCheck size={9} className="shrink-0 text-positive" />
                    ) : s.state === "run" ? (
                      <span className="h-2 w-2 shrink-0 rounded-full border-[1.5px] border-accent" />
                    ) : (
                      <span className="h-2 w-2 shrink-0 rounded-full border border-line-strong" />
                    )}
                    <span
                      className={`text-[9.5px] ${
                        s.state === "todo" ? "text-ink-4" : "text-ink-2"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}

                <span className="pointer-events-none absolute bottom-3 right-3 opacity-60">
                  <TroveOrb size={34} state="thinking" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    n: "01",
    title: "Describe",
    copy: "Tell Trove what you want, in plain language.",
    icon: FiMessageSquare,
    tone: "#5b50f5",
  },
  {
    n: "02",
    title: "Trove works",
    copy: "It plans the job, picks the tools and executes.",
    icon: TbSettings2,
    tone: "#7c6fff",
  },
  {
    n: "03",
    title: "Get it done",
    copy: "Finished files you can download and use right away.",
    icon: TbCircleCheck,
    tone: "#0b6553",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
        <div>
          <h2 className="text-[clamp(1.6rem,1.2rem+1.2vw,2rem)] font-semibold leading-[1.15] tracking-tight text-ink">
            How it works.
            <br />
            Three simple steps.
          </h2>
        </div>

        <ol className="nx-stagger grid gap-8 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative">
              <span
                className="grid h-11 w-11 place-items-center rounded-[10px]"
                style={{ background: `color-mix(in srgb, ${s.tone} 12%, transparent)` }}
              >
                <s.icon size={19} style={{ color: s.tone }} />
              </span>
              <p className="mt-3.5 text-[12px] font-medium tabular-nums text-ink-4">{s.n}</p>
              <h3 className="mt-0.5 text-[16px] font-medium text-ink">{s.title}</h3>
              <p className="mt-1.5 max-w-[26ch] text-[13.5px] leading-relaxed text-ink-3">
                {s.copy}
              </p>

              {/* connector, on the two gaps only */}
              {i < STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className="nx-wire absolute -right-4 top-5 hidden h-px w-8 sm:block"
                  style={{ animationDelay: `${i * 0.4}s` }}
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
/* Why trust it                                                        */
/* ------------------------------------------------------------------ */

const REASONS = [
  {
    icon: TbDownload,
    title: "Real files, not a copy button",
    copy: "Genuine .docx, .xlsx and .pptx, generated in your browser and downloaded straight to your machine.",
  },
  {
    icon: TbLock,
    title: "Your work stays put",
    copy: "Trove saves the exchange, not the prompt. Reopen a thread and it is the reply you left, not a new one.",
  },
  {
    icon: TbCurrencyDollarOff,
    title: "Free means free",
    copy: "200 credits every month with no card. Credits are metered on real token usage, so a short answer costs less.",
  },
];

/**
 * What stands behind the product.
 *
 * The reference design put customer logos here — Stripe, Vercel, Notion,
 * Google, Microsoft — and a testimonial from a named founder. None of those
 * companies use Trove and that person does not exist, so showing them would be
 * a false endorsement rather than a design flourish. What replaces them is
 * three claims that are true today and can be checked in a minute.
 *
 * When there are real customers, swap this for components/landing/testimonials.
 */
export function WhyTrust() {
  return (
    <section className="border-y border-line bg-rail/50">
      <div className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              Why Trove
            </p>
            <h2 className="mt-2.5 text-[clamp(1.6rem,1.2rem+1.2vw,2rem)] font-semibold leading-[1.15] tracking-tight text-ink">
              Built to finish the job.
            </h2>
            <p className="mt-3.5 max-w-[32ch] text-[14.5px] leading-relaxed text-ink-3">
              Every claim here is one you can check in about a minute.
            </p>
          </div>

          <ul className="nx-stagger grid gap-4 sm:grid-cols-3">
            {REASONS.map((r) => (
              <li
                key={r.title}
                className="rounded-[10px] border border-line bg-canvas p-5 shadow-[var(--sh-1)]"
              >
                <r.icon size={20} className="text-accent" />
                <h3 className="mt-3 text-[14.5px] font-medium leading-snug text-ink">
                  {r.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{r.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
