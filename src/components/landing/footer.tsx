import Link from "next/link";

import { Wordmark } from "@/components/brand/logo";
import { FEATURES } from "@/lib/features";
import { site } from "@/lib/site";

/**
 * The site footer.
 *
 * There was none, which cost two things. Every public page was reachable only
 * from the navigation of the page you were already on, so a crawler arriving
 * on a feature page found no route to the others — and a marketing site with
 * no way to contact anyone reads as unfinished regardless of what is above it.
 *
 * The links here are the real ones. No social accounts are listed because
 * there are none to list, and a row of dead icons is worse than a row with
 * nothing in it.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-line bg-rail/60">
      <div className="mx-auto max-w-[1140px] px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-[280px]">
            <Link href="/" aria-label="Trove home" className="inline-flex">
              <Wordmark size={19} sweep={false} />
            </Link>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
              An AI workspace that turns a sentence into finished work you can
              download and keep.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <nav aria-label="Product">
              <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                Product
              </h2>
              <ul className="space-y-2">
                {FEATURES.map((f) => (
                  <li key={f.slug}>
                    <Link
                      href={`/features/${f.slug}`}
                      className="text-[13px] text-ink-2 transition-colors hover:text-ink"
                    >
                      {f.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/pricing"
                    className="text-[13px] text-ink-2 transition-colors hover:text-ink"
                  >
                    Pricing
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label="Get started">
              <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                Start
              </h2>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/signup"
                    className="text-[13px] text-ink-2 transition-colors hover:text-ink"
                  >
                    Create an account
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="text-[13px] text-ink-2 transition-colors hover:text-ink"
                  >
                    Sign in
                  </Link>
                </li>
              </ul>
            </nav>

            <div>
              <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                Contact
              </h2>
              <a
                href={`mailto:${site.email}`}
                className="text-[13px] text-ink-2 transition-colors hover:text-ink"
              >
                {site.email}
              </a>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-[12.5px] text-ink-4">
          © {year} {site.name}
        </p>
      </div>
    </footer>
  );
}
