/**
 * The catalogue of third-party services CAIRN can connect to.
 *
 * `oauth: true` means the service uses an OAuth handshake that needs a client
 * id and secret registered with that provider. None are configured here, so
 * connecting records intent locally rather than authenticating — the UI says
 * so plainly.
 */

export interface Service {
  id: string;
  name: string;
  category: Category;
  blurb: string;
  oauth?: boolean;
}

export type Category =
  | "Email & Calendar"
  | "Communication"
  | "Source control"
  | "Project tracking"
  | "Storage & Docs"
  | "Databases"
  | "Cloud & Deploy"
  | "Payments"
  | "CRM & Sales"
  | "Marketing"
  | "Support"
  | "Analytics"
  | "Design"
  | "Automation";

export const CATEGORIES: Category[] = [
  "Email & Calendar",
  "Communication",
  "Source control",
  "Project tracking",
  "Storage & Docs",
  "Databases",
  "Cloud & Deploy",
  "Payments",
  "CRM & Sales",
  "Marketing",
  "Support",
  "Analytics",
  "Design",
  "Automation",
];

export const SERVICES: Service[] = [
  // Email & Calendar
  { id: "gmail", name: "Gmail", category: "Email & Calendar", blurb: "Read, draft, and send mail on your behalf.", oauth: true },
  { id: "google-calendar", name: "Google Calendar", category: "Email & Calendar", blurb: "Read availability and schedule events.", oauth: true },
  { id: "outlook", name: "Outlook", category: "Email & Calendar", blurb: "Microsoft 365 mail and calendar.", oauth: true },
  { id: "fastmail", name: "Fastmail", category: "Email & Calendar", blurb: "IMAP mail access via app password." },
  { id: "calendly", name: "Calendly", category: "Email & Calendar", blurb: "Booking links and scheduled meetings.", oauth: true },

  // Communication
  { id: "slack", name: "Slack", category: "Communication", blurb: "Post updates and read channel context.", oauth: true },
  { id: "discord", name: "Discord", category: "Communication", blurb: "Bot messages and server events." },
  { id: "microsoft-teams", name: "Microsoft Teams", category: "Communication", blurb: "Channel messages and meeting notes.", oauth: true },
  { id: "telegram", name: "Telegram", category: "Communication", blurb: "Bot API for alerts and commands." },
  { id: "twilio", name: "Twilio", category: "Communication", blurb: "SMS and voice notifications." },
  { id: "zoom", name: "Zoom", category: "Communication", blurb: "Create meetings and pull recordings.", oauth: true },

  // Source control
  { id: "github", name: "GitHub", category: "Source control", blurb: "Repos, branches, pull requests, and issues.", oauth: true },
  { id: "gitlab", name: "GitLab", category: "Source control", blurb: "Repos, merge requests, and CI pipelines.", oauth: true },
  { id: "bitbucket", name: "Bitbucket", category: "Source control", blurb: "Repos and pipelines on Atlassian.", oauth: true },
  { id: "gitea", name: "Gitea", category: "Source control", blurb: "Self-hosted git via personal token." },

  // Project tracking
  { id: "linear", name: "Linear", category: "Project tracking", blurb: "Sync agent work with your issues.", oauth: true },
  { id: "jira", name: "Jira", category: "Project tracking", blurb: "Tickets, sprints, and boards.", oauth: true },
  { id: "asana", name: "Asana", category: "Project tracking", blurb: "Tasks and project timelines.", oauth: true },
  { id: "trello", name: "Trello", category: "Project tracking", blurb: "Cards and lists.", oauth: true },
  { id: "clickup", name: "ClickUp", category: "Project tracking", blurb: "Tasks, docs, and goals.", oauth: true },
  { id: "height", name: "Height", category: "Project tracking", blurb: "Autonomous project tracking.", oauth: true },
  { id: "shortcut", name: "Shortcut", category: "Project tracking", blurb: "Stories and epics for engineering." },

  // Storage & Docs
  { id: "google-drive", name: "Google Drive", category: "Storage & Docs", blurb: "Read and write files and folders.", oauth: true },
  { id: "notion", name: "Notion", category: "Storage & Docs", blurb: "Pages, databases, and specs.", oauth: true },
  { id: "dropbox", name: "Dropbox", category: "Storage & Docs", blurb: "File sync and sharing.", oauth: true },
  { id: "onedrive", name: "OneDrive", category: "Storage & Docs", blurb: "Microsoft file storage.", oauth: true },
  { id: "confluence", name: "Confluence", category: "Storage & Docs", blurb: "Team wiki and documentation.", oauth: true },
  { id: "airtable", name: "Airtable", category: "Storage & Docs", blurb: "Structured bases and views.", oauth: true },
  { id: "box", name: "Box", category: "Storage & Docs", blurb: "Enterprise content management.", oauth: true },

  // Databases
  { id: "postgres", name: "PostgreSQL", category: "Databases", blurb: "Direct connection via connection string." },
  { id: "mysql", name: "MySQL", category: "Databases", blurb: "Direct connection via connection string." },
  { id: "mongodb", name: "MongoDB", category: "Databases", blurb: "Atlas or self-hosted clusters." },
  { id: "supabase", name: "Supabase", category: "Databases", blurb: "Postgres, auth, and storage.", oauth: true },
  { id: "planetscale", name: "PlanetScale", category: "Databases", blurb: "Serverless MySQL with branching." },
  { id: "redis", name: "Redis", category: "Databases", blurb: "Cache and queues." },
  { id: "snowflake", name: "Snowflake", category: "Databases", blurb: "Warehouse queries for analysis." },

  // Cloud & Deploy
  { id: "vercel", name: "Vercel", category: "Cloud & Deploy", blurb: "Preview and production deployments.", oauth: true },
  { id: "netlify", name: "Netlify", category: "Cloud & Deploy", blurb: "Static and edge deployments.", oauth: true },
  { id: "aws", name: "AWS", category: "Cloud & Deploy", blurb: "Infrastructure, S3, and Lambda." },
  { id: "gcp", name: "Google Cloud", category: "Cloud & Deploy", blurb: "Compute, storage, and BigQuery.", oauth: true },
  { id: "azure", name: "Azure", category: "Cloud & Deploy", blurb: "Microsoft cloud infrastructure.", oauth: true },
  { id: "cloudflare", name: "Cloudflare", category: "Cloud & Deploy", blurb: "DNS, Workers, and edge caching." },
  { id: "docker", name: "Docker Hub", category: "Cloud & Deploy", blurb: "Image registry and tags." },
  { id: "railway", name: "Railway", category: "Cloud & Deploy", blurb: "App and database hosting.", oauth: true },
  { id: "fly", name: "Fly.io", category: "Cloud & Deploy", blurb: "Apps deployed close to users." },

  // Payments
  { id: "stripe", name: "Stripe", category: "Payments", blurb: "Subscriptions, invoices, and webhooks.", oauth: true },
  { id: "paypal", name: "PayPal", category: "Payments", blurb: "Payments and payouts.", oauth: true },
  { id: "lemonsqueezy", name: "Lemon Squeezy", category: "Payments", blurb: "Merchant of record billing.", oauth: true },
  { id: "paddle", name: "Paddle", category: "Payments", blurb: "Global subscription billing." },
  { id: "quickbooks", name: "QuickBooks", category: "Payments", blurb: "Accounting and reconciliation.", oauth: true },

  // CRM & Sales
  { id: "salesforce", name: "Salesforce", category: "CRM & Sales", blurb: "Accounts, leads, and opportunities.", oauth: true },
  { id: "hubspot", name: "HubSpot", category: "CRM & Sales", blurb: "CRM records and pipelines.", oauth: true },
  { id: "pipedrive", name: "Pipedrive", category: "CRM & Sales", blurb: "Deals and sales activity.", oauth: true },
  { id: "attio", name: "Attio", category: "CRM & Sales", blurb: "Relationship data model.", oauth: true },

  // Marketing
  { id: "mailchimp", name: "Mailchimp", category: "Marketing", blurb: "Campaigns and audiences.", oauth: true },
  { id: "sendgrid", name: "SendGrid", category: "Marketing", blurb: "Transactional email delivery." },
  { id: "resend", name: "Resend", category: "Marketing", blurb: "Developer-first email API." },
  { id: "customerio", name: "Customer.io", category: "Marketing", blurb: "Lifecycle messaging." },
  { id: "webflow", name: "Webflow", category: "Marketing", blurb: "CMS content and site publishing.", oauth: true },

  // Support
  { id: "zendesk", name: "Zendesk", category: "Support", blurb: "Tickets and macros.", oauth: true },
  { id: "intercom", name: "Intercom", category: "Support", blurb: "Conversations and help content.", oauth: true },
  { id: "freshdesk", name: "Freshdesk", category: "Support", blurb: "Support tickets and SLAs." },
  { id: "crisp", name: "Crisp", category: "Support", blurb: "Live chat transcripts." },

  // Analytics
  { id: "google-analytics", name: "Google Analytics", category: "Analytics", blurb: "Traffic and conversion data.", oauth: true },
  { id: "posthog", name: "PostHog", category: "Analytics", blurb: "Product analytics and flags." },
  { id: "mixpanel", name: "Mixpanel", category: "Analytics", blurb: "Event funnels and retention." },
  { id: "amplitude", name: "Amplitude", category: "Analytics", blurb: "Behavioural analytics." },
  { id: "sentry", name: "Sentry", category: "Analytics", blurb: "Errors, traces, and releases.", oauth: true },
  { id: "datadog", name: "Datadog", category: "Analytics", blurb: "Metrics, logs, and monitors." },

  // Design
  { id: "figma", name: "Figma", category: "Design", blurb: "Files, frames, and design tokens.", oauth: true },
  { id: "framer", name: "Framer", category: "Design", blurb: "Sites and prototypes.", oauth: true },
  { id: "canva", name: "Canva", category: "Design", blurb: "Brand assets and templates.", oauth: true },

  // Automation
  { id: "zapier", name: "Zapier", category: "Automation", blurb: "Trigger thousands of downstream apps.", oauth: true },
  { id: "make", name: "Make", category: "Automation", blurb: "Visual automation scenarios.", oauth: true },
  { id: "n8n", name: "n8n", category: "Automation", blurb: "Self-hosted workflow automation." },
  { id: "ifttt", name: "IFTTT", category: "Automation", blurb: "Simple applet triggers.", oauth: true },
];

export function serviceById(id: string) {
  return SERVICES.find((s) => s.id === id);
}
