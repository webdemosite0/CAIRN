import type { Metadata } from "next";
import Link from "next/link";
import { FiCheck, FiArrowRight } from "react-icons/fi";

import { PLANS } from "@/lib/credits";
import { FEATURES } from "@/lib/features";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Trove starts free with 200 credits a month and every tool included. Pro is $24 a month for 5,000 credits, Team is $96 for 20,000. No card to start.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: "/pricing",
    title: `Pricing · ${site.name}`,
    description:
      "Free to start with 200 credits a month and every tool included. Pro and Team add capacity, not features.",
  },
};

/**
 * The public pricing page.
 *
 * Reads PLANS, the same array the billing code charges against, so the page
 * cannot quote a price the checkout does not use. /plans is the signed-in
 * version with a live credit balance on it; this one is readable by anyone,
 * which is the point — pricing behind a login wall is a page nobody can cite
 * and Google cannot index.
 */
export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1040px] px-5 pb-24 pt-16 lg:px-8 lg:pt-24">
      <header className="max-w-[640px]">
        <h1 className="text-[clamp(2rem,1.2rem+2.4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink">
          Pay for capacity, not for features.
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
          Every plan has every tool. The difference is how much you can run in a
          month, so the free plan is the whole product rather than a demo of it.
        </p>
      </header>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          // Pro gets the emphasis as the middle tier, and gets no badge.
          // The first draft said "most capacity per pound", which was wrong
          // twice: the prices are in dollars, and the claim is false anyway —
          // Pro and Team are both exactly 208 credits per dollar. A pricing
          // page is the last place to be caught rounding in your own favour.
          const featured = plan.id === "pro";
          return (
            <section
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-[var(--r-hero)] border p-6",
                featured
                  ? "border-accent/45 bg-rail shadow-[var(--sh-2)]"
                  : "border-line bg-rail",
              )}
            >
              <h2 className="text-[15px] font-semibold text-ink">{plan.name}</h2>

              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink">
                  ${plan.price}
                </span>
                <span className="text-[13.5px] text-ink-4">
                  {plan.price === 0 ? "forever" : "per month"}
                </span>
              </p>

              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-3">
                {plan.blurb}
              </p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-ink-2">
                    <FiCheck size={14} className="mt-0.5 shrink-0 text-positive" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={cn(
                  "mt-6 inline-flex items-center justify-center gap-2 rounded-[var(--r-control)] px-4 py-2.5 text-[14px] font-medium transition-colors",
                  featured
                    ? "btn-grad"
                    : "border border-line-strong text-ink-2 hover:bg-hover hover:text-ink",
                )}
              >
                {plan.price === 0 ? "Start free" : `Choose ${plan.name}`}
                <FiArrowRight size={15} />
              </Link>
            </section>
          );
        })}
      </div>

      {/* The question every credit-based product gets asked first. */}
      <section className="mt-16 max-w-[720px]">
        <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-ink">
          What is a credit?
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          One credit is roughly a thousand tokens of model work — the text going
          in and the text coming back. A short question costs one. A full
          website, a long research thread or a twelve-slide deck costs more,
          because it is more work.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Nothing is metered except model work. Editing a spreadsheet, exporting
          a document, renaming a saved thread and opening old work are all free,
          because none of them ask a model anything. Your balance and a
          per-feature breakdown of where the month went are in the workspace.
        </p>
        {/* Worth saying plainly rather than letting someone work it out and
            wonder what else is being shaded. */}
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Pro and Team cost exactly the same per credit — about 208 credits per
          dollar on both. Team is not better value, it is more capacity, plus
          agents shared across the workspace rather than held by one account.
        </p>
      </section>

      <section className="mt-14 max-w-[720px]">
        <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-ink">
          What you get on every plan
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.slug}
                href={`/features/${f.slug}`}
                className="group flex items-start gap-3 rounded-[var(--r-card)] border border-line bg-rail p-4 transition-[transform,border-color] duration-[var(--t-hover)] hover:-translate-y-0.5 hover:border-line-strong"
              >
                <Icon size={18} className="mt-0.5 shrink-0" style={{ color: f.tone }} />
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-ink">
                    {f.label}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-4">
                    {f.title}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-16 rounded-[var(--r-hero)] border border-line bg-rail p-7">
        <h2 className="text-[19px] font-semibold text-ink">
          Start on the free plan
        </h2>
        <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-3">
          200 credits a month, every tool, no card. Upgrade only when you run
          out — and the balance resets on the first of each month either way.
        </p>
        <Link
          href="/signup"
          className="btn-grad mt-6 inline-flex items-center gap-2 rounded-[var(--r-control)] px-5 py-2.5 text-[14px] font-medium"
        >
          Create an account
          <FiArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
