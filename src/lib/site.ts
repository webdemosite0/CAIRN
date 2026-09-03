/** Single source of truth for anything that ends up in a meta tag. */

const FALLBACK_URL = "http://localhost:3100";

/**
 * Resolves the canonical origin, and never throws.
 *
 * This used to be `process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK`, which breaks
 * the whole build: `??` only catches null and undefined, so declaring the
 * variable and leaving it blank yields "", and `new URL("")` in metadataBase
 * fails the build with ERR_INVALID_URL on /_not-found. An empty variable is a
 * completely normal thing to have on a host dashboard, so treat it as absent.
 */
function resolveSiteUrl(): string {
  /**
   * SITE_URL first, NEXT_PUBLIC_SITE_URL second.
   *
   * Nothing that reads `site.url` is a client component — it is metadata,
   * sitemap, robots, OG image, OAuth redirect and Stripe return URLs, all of
   * which run on the server. So the NEXT_PUBLIC_ prefix bought nothing and
   * cost a warning: Vercel flags public-prefixed variables because the prefix
   * inlines the value into the browser bundle.
   *
   * The old name is still read so deployments that already set it keep
   * working; there is nothing secret about a site's own address either way.
   */
  const raw =
    process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (raw) {
    // People type "trove.app" as often as "https://trove.app".
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      return new URL(withScheme).origin;
    } catch {
      // Fall through rather than take the build down over a typo.
    }
  }

  // Vercel injects these, so a preview deploy gets correct canonical URLs
  // without anyone configuring anything.
  const auto =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (auto) {
    try {
      return new URL(`https://${auto.replace(/^https?:\/\//i, "")}`).origin;
    } catch {
      /* fall through */
    }
  }

  return FALLBACK_URL;
}

export const site = {
  name: "Trove",
  /** Set SITE_URL in production — canonical URLs depend on it. */
  url: resolveSiteUrl(),
  /** Where a person can actually reach a human. */
  email: "official@troveai.site",
  tagline: "Describe what you want. Trove builds it.",
  description:
    "Trove is an AI workspace that builds real things and keeps them. Generate a complete website from a sentence and keep editing it in chat, create your own AI agents, put a team of four on one task, and export documents to Word and spreadsheets to Excel. Every conversation is saved, so reopening it shows the same answer you left.",
  /**
   * The <title> on the home page, and the tail of every other title.
   *
   * Under 60 characters because Google truncates around there — the old one
   * was 110 and the result read "…generates websites, agents ...", cut off
   * mid-list. A title that ends in an ellipsis wastes the most valuable line
   * on the page.
   */
  searchTitle: "AI workspace that builds websites, docs and agents",
  /**
   * The <meta name="description">.
   *
   * Separate from `description` because that one is 329 characters — written
   * for schema.org and llms.txt, where length is free. Google renders about
   * 155, so the long version arrives cut off mid-clause and the sentence that
   * would have persuaded anyone never appears.
   */
  metaDescription:
    "An AI workspace that turns a sentence into finished work: websites, documents, spreadsheets, code and AI agents you can download and keep.",
  shortDescription:
    "An AI workspace that generates websites, agents, documents and spreadsheets you can actually download.",
  keywords: [
    "AI website builder",
    "AI agent builder",
    "AI workspace",
    "generate website from prompt",
    "custom AI agents",
    "AI document generator",
    "AI spreadsheet generator",
    "multi-agent AI",
    "AI coding assistant",
    "Gemini app",
  ],
  locale: "en_US",
  twitter: "@trove",
} as const;

/**
 * Pages worth indexing, with crawl hints.
 *
 * Only pages a visitor can actually reach. This listed fifteen routes —
 * /chat, /team, /spreadsheets, /research and the rest — every one of which
 * sits behind the sign-in wall, so Googlebot followed the sitemap, was
 * redirected to /login, and indexed each of them as "Sign in · Trove". A
 * search for the site returned the landing page and then three sign-in pages.
 *
 * The middleware is the authority on what is public: "/", "/login" and
 * "/signup". Of those, only the landing page is worth a search result — a
 * sign-in form is not something anyone is looking for — so the sitemap now
 * says so, and login and signup carry noindex instead.
 */
export const publicRoutes = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
];

/** Routes that must never be indexed. */
export const privateRoutes = ["/settings", "/dashboard", "/api/"];
