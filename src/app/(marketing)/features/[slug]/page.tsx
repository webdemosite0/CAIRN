import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowRight, FiCheck } from "react-icons/fi";

import { FEATURES, featureBySlug } from "@/lib/features";
import { site } from "@/lib/site";

/** One page per capability, built at compile time — the content is static. */
export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = featureBySlug(slug);
  if (!feature) return {};

  const url = `/features/${feature.slug}`;
  return {
    title: feature.title,
    description: feature.description,
    // Self-referential: these are the pages that should rank, so each one
    // claims its own URL rather than inheriting anything.
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: `${feature.title} · ${site.name}`,
      description: feature.description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${feature.title} · ${site.name}`,
      description: feature.description,
    },
  };
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = featureBySlug(slug);
  if (!feature) notFound();

  const others = FEATURES.filter((f) => f.slug !== feature.slug);
  const Icon = feature.icon;

  return (
    <div className="mx-auto max-w-[820px] px-5 pb-24 pt-16 lg:px-8 lg:pt-24">
      <article>
        <span
          aria-hidden
          className="mb-6 grid h-12 w-12 place-items-center rounded-[var(--r-card)]"
          style={{ background: `${feature.tone}1f`, color: feature.tone }}
        >
          <Icon size={24} />
        </span>

        <h1 className="text-[clamp(2rem,1.2rem+2.4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink">
          {feature.headline}
        </h1>

        <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
          {feature.standfirst}
        </p>

        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5">
          {feature.facts.map((f) => (
            <li key={f} className="flex items-center gap-2 text-[13.5px] text-ink-3">
              <FiCheck size={14} className="shrink-0 text-positive" />
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-12 space-y-10">
          {feature.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
                {s.heading}
              </h2>
              <p className="mt-2.5 text-[15px] leading-relaxed text-ink-2">
                {s.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-14 rounded-[var(--r-hero)] border border-line bg-rail p-7">
          <h2 className="text-[19px] font-semibold text-ink">
            Try it on the free plan
          </h2>
          <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-3">
            200 credits a month, every tool included, no card. Enough to build
            something real and decide whether it is any good.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="btn-grad inline-flex items-center gap-2 rounded-[var(--r-control)] px-5 py-2.5 text-[14px] font-medium"
            >
              Create an account
              <FiArrowRight size={15} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-[var(--r-control)] border border-line-strong px-5 py-2.5 text-[14px] font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink"
            >
              See pricing
            </Link>
          </div>
        </div>
      </article>

      {/* A crawler that lands here needs a route to the rest, and a reader who
          is not sold on this one needs the same thing. */}
      <nav aria-label="Other capabilities" className="mt-16">
        <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-4">
          More of the workspace
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {others.map((o) => {
            const OIcon = o.icon;
            return (
              <Link
                key={o.slug}
                href={`/features/${o.slug}`}
                className="group rounded-[var(--r-card)] border border-line bg-rail p-4 transition-[transform,border-color] duration-[var(--t-hover)] hover:-translate-y-0.5 hover:border-line-strong"
              >
                <OIcon size={18} style={{ color: o.tone }} />
                <span className="mt-2.5 block text-[14px] font-medium text-ink">
                  {o.label}
                </span>
                <span className="mt-1 block text-[12.5px] leading-snug text-ink-4">
                  {o.title}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
