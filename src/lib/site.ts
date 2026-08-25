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

/** Pages worth indexing, with crawl hints. */
export const publicRoutes = [
  // "/" is now the landing page; the workspace itself lives at /chat.
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/chat", priority: 0.9, changeFrequency: "weekly" as const },
  // Low on purpose while ENABLED is false in (shell)/websites/page.tsx — that
  // route currently renders "Coming soon", and advertising a placeholder as a
  // headline page is both bad ranking and dishonest. Raise to 0.9 when the
  // builder is switched back on.
  { path: "/websites", priority: 0.4, changeFrequency: "monthly" as const },
  { path: "/agents", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/team", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/code", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/documents", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/spreadsheets", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/slides", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/design", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/research", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/reminders", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/integrations", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/plans", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/login", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/signup", priority: 0.4, changeFrequency: "yearly" as const },
];

/** Routes that must never be indexed. */
export const privateRoutes = ["/settings", "/dashboard", "/api/"];
