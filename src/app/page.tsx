import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Backdrop } from "@/components/shell/backdrop";
import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import {
  AgentFlow,
  Files,
  UseCases,
  PricingPreview,
  FinalCta,
} from "@/components/landing/sections";
import { CapabilityStrip, Outcomes } from "@/components/landing/proof-and-outcomes";
import {
  ConnectedWorkspace,
  HowItWorks,
  WhyTrust,
} from "@/components/landing/workspace-and-steps";
import { Testimonials } from "@/components/landing/testimonials";
import { Faq } from "@/components/landing/faq";
import { PLANS } from "@/lib/credits";
import { site } from "@/lib/site";

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
/** The landing page is the site's canonical URL; nothing else claims it. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

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
        <Hero freeCredits={free.monthly} />

        <CapabilityStrip />

        <div id="capabilities">
          <Outcomes />
        </div>

        <ConnectedWorkspace />

        <div id="agents">
          <AgentFlow />
        </div>

        <div id="files">
          <Files />
        </div>

        <HowItWorks />
        <UseCases />
        <WhyTrust />

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
          <nav aria-label="Footer" className="flex flex-wrap gap-4">
            <Link href="/plans" className="transition-colors hover:text-ink-2">
              Pricing
            </Link>
            <Link href="/login" className="transition-colors hover:text-ink-2">
              Sign in
            </Link>
            <Link href="/chat" className="transition-colors hover:text-ink-2">
              Start building
            </Link>
            {/* A real address, not a form that goes nowhere. */}
            <a
              href={`mailto:${site.email}`}
              className="transition-colors hover:text-ink-2"
            >
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
