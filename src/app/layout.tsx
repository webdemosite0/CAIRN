import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Poppins } from "next/font/google";
import { site } from "@/lib/site";
import { THEME_SCRIPT } from "@/components/shell/theme";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// The wordmark only. A geometric sans with near-circular bowls, matching the
// supplied artwork — the earlier serif was a different brand direction and the
// reference settles it. Heavy weights only: this face never sets body copy.
const display = Poppins({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.searchTitle}`,
    template: `%s · ${site.name}`,
  },
  description: site.metaDescription,
  keywords: [...site.keywords],
  applicationName: site.name,
  category: "technology",
  authors: [{ name: site.name }],
  creator: site.name,
  publisher: site.name,
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    url: site.url,
    title: `${site.name} — ${site.searchTitle}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.searchTitle}`,
    description: site.shortDescription,
    creator: site.twitter,
  },
  formatDetection: { telephone: false, address: false, email: false },
  // No `verification` block here on purpose.
  //
  // Ownership of troveai.site is proved by public/google117c584ed0903345.html
  // instead. A meta tag carrying a *different* property's token was left over
  // from a previous domain: Search Console reads it, matches it against no
  // property this site owns, and it does nothing but sit in the <head> of
  // every page. One verification method, and one that corresponds to the
  // domain actually being verified.
};

export const viewport: Viewport = {
  // Two entries so the browser chrome matches whichever palette is showing.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  // The mobile UI paints its tab bar into the gesture area at the bottom of a
  // phone, which only works if the page is allowed under the notch and home
  // indicator. Without this, env(safe-area-inset-*) is always 0.
  viewportFit: "cover",
};

/**
 * Structured data. Search engines use it for rich results; LLM crawlers use it
 * to work out what this product actually is without parsing the app shell.
 */
function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.url}/#organization`,
        name: site.name,
        url: site.url,
        // Google needs somewhere to find the mark before it can show one beside
        // the result. Points at the icon route the app already renders, so it
        // cannot drift from the favicon.
        logo: `${site.url}/icon`,
        description: site.shortDescription,
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        // What Google reads to decide whether the result says "Trove" or
        // "troveai.site". A hint, not an instruction, and it needs a recrawl.
        alternateName: "Trove AI",
        description: site.description,
        publisher: { "@id": `${site.url}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${site.url}/#app`,
        name: site.name,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        description: site.description,
        url: site.url,
        featureList: [
          "Generate a complete website from a prompt and refine it in chat",
          "Build custom AI agents with their own instructions and tools",
          "Run a team of four AI agents on a single task",
          "Write documents and export them as Word .docx",
          "Build spreadsheets and export them as Excel .xlsx",
          "Generate runnable code, slide outlines, design specs and research",
          "Reminders with browser notifications",
        ],
        offers: [
          {
            "@type": "Offer",
            name: "Free",
            price: "0",
            priceCurrency: "USD",
          },
          {
            "@type": "Offer",
            name: "Pro",
            price: "24",
            priceCurrency: "USD",
          },
          {
            "@type": "Offer",
            name: "Team",
            price: "96",
            priceCurrency: "USD",
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

/**
 * data-theme is rendered on the server, not only set by the script.
 *
 * Light became the default, so the script was stamping data-theme="light"
 * onto an element the server had rendered without it — a hydration
 * mismatch on every page, reported by React and unfixable by it ("this
 * won't be patched up").
 *
 * Rendering the default here makes the markup agree. The script still
 * overrides it: to "dark" for that preference, and removing it entirely
 * for "system", both of which happen before the first paint.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      // THEME_SCRIPT rewrites this attribute before the first paint, so on any
      // machine set to dark the server's "light" and the client's "dark"
      // disagree by design, and React logged a hydration error on every load
      // for those people. Suppression is scoped to this element's own
      // attributes and is exactly what it is for: a value deliberately changed
      // before hydration. Children are unaffected.
      suppressHydrationWarning
      className={`${inter.variable} ${display.variable} ${mono.variable}`}
    >
      <head>
        {/* Must run before the first paint — see THEME_SCRIPT. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <StructuredData />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
