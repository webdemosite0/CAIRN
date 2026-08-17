/** Single source of truth for anything that ends up in a meta tag. */

export const site = {
  name: "CAIRN",
  /** Set NEXT_PUBLIC_SITE_URL in production — canonical URLs depend on it. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100",
  tagline: "Describe what you want. CAIRN builds it.",
  description:
    "CAIRN is an AI workspace that builds real things and keeps them. Generate a complete website from a sentence and keep editing it in chat, create your own AI agents, put a team of four on one task, and export documents to Word and spreadsheets to Excel. Every conversation is saved, so reopening it shows the same answer you left.",
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
  twitter: "@cairn",
} as const;

/** Pages worth indexing, with crawl hints. */
export const publicRoutes = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/websites", priority: 0.9, changeFrequency: "weekly" as const },
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
