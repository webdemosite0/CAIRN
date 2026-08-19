import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { FiArrowRight, FiCheck } from "react-icons/fi";
import { Backdrop } from "@/components/shell/backdrop";
import { LandingNav } from "@/components/landing/nav";
import { WorkspaceVisual } from "@/components/landing/workspace-visual";
import {
  ProofBar,
  Outcomes,
  AgentFlow,
  Files,
  HowItWorks,
  UseCases,
  PricingPreview,
  FinalCta,
} from "@/components/landing/sections";
import { Testimonials } from "@/components/landing/testimonials";
import { Faq } from "@/components/landing/faq";
import { PLANS } from "@/lib/credits";

/**
 * The landing page, for people who have not signed in.
 *
 * Deliberately outside the (shell) group so it carries no sidebar — this is a
 * page about the product, not a page of it. Anyone with a session is sent
 * straight to /chat instead; they have already read this.
 *
 * Every section is a component under components/landing, so this file stays a
 * running order rather than two thousand lines of markup.
 */
export default async function Landing() {
  // The middleware hands everyone a guest id, so a session cookie — not the
  // presence of an identity — is what distinguishes a returning user.
  const jar = await cookies();
  if (jar.has("nx_session")) redirect("/chat");

  const free = PLANS[0];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Backdrop />
      <LandingNav />

      <main>
        {/* ---------------- hero ---------------- */}
        <section className="relative mx-auto max-w-[1140px] px-5 pb-16 pt-12 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="spotlight" />

          <div className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div className="nx-rise-big">
              <span className="meta inline-flex items-center gap-2 rounded-full border border-line bg-rail px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                Free to try · no card required
              </span>

              <h1 className="mt-5 text-[clamp(2.75rem,1.6rem+3.4vw,4.5rem)] font-semibold leading-[1.0] tracking-tight text-ink">
                Describe it once.
                <br />
                {/* Only the second line carries the gradient, so the emphasis
                    lands on the promise rather than on the whole headline. */}
                <span className="nx-grad-text">Keep the file.</span>
              </h1>

              <p className="mt-6 max-w-[38ch] text-[17px] leading-relaxed text-ink-2">
                Trove is an AI workspace that turns ideas into finished work.
                Create websites, documents, spreadsheets, code and AI-powered
                workflows — all from one place.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/chat"
                  className="btn-grad group flex h-[54px] items-center gap-2 rounded-[10px] px-7 text-[15.5px] font-medium"
                >
                  Start building for free
                  <FiArrowRight
                    size={16}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
                <Link
                  href="/signup"
                  className="flex h-[54px] items-center rounded-[10px] border border-line-strong px-7 text-[15.5px] font-medium text-ink transition-colors hover:bg-hover"
                >
                  Create an account
                </Link>
              </div>

              <p className="mt-4 flex items-center gap-1.5 text-[13.5px] text-ink-4">
                <FiCheck size={13} className="shrink-0 text-positive" />
                {free.monthly} credits included every month on the free plan.
              </p>
            </div>

            <div
              className="nx-rise-big"
              style={{ animationDelay: "140ms", animationFillMode: "backwards" }}
            >
              <WorkspaceVisual />
            </div>
          </div>
        </section>

        <ProofBar />

        <div id="capabilities">
          <Outcomes />
        </div>

        <div id="agents">
          <AgentFlow />
        </div>

        <Files />
        <HowItWorks />
        <UseCases />

        {/* No real customers yet, so this renders nothing rather than showing
            invented quotes. See components/landing/testimonials.tsx. */}
        <Testimonials />

        <div id="pricing">
          <PricingPreview plans={PLANS} />
        </div>

        <div id="faq">
          <Faq />
        </div>

        <FinalCta />
      </main>

      <footer className="relative border-t border-line">
        <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-3 px-5 py-7 text-[13px] text-ink-4 lg:px-8">
          <span>Trove — everything you make, kept in one place.</span>
          <nav aria-label="Footer" className="flex gap-4">
            <Link href="/plans" className="transition-colors hover:text-ink-2">
              Pricing
            </Link>
            <Link href="/login" className="transition-colors hover:text-ink-2">
              Sign in
            </Link>
            <Link href="/chat" className="transition-colors hover:text-ink-2">
              Start building
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
