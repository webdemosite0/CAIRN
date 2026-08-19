import { site } from "@/lib/site";

export const dynamic = "force-static";

/**
 * llms.txt — a plain-text brief for language models that crawl or are asked
 * about this site. Served as a route so it cannot drift from src/lib/site.ts.
 *
 * Everything below is deliberately literal about what is and is not built, so
 * an assistant summarising Trove does not overstate it.
 */
export function GET() {
  const body = `# ${site.name}

> ${site.shortDescription}

${site.description}

## What it does

- **Website builder** — describe a site and get a real multi-file project
  (index.html, styles.css, script.js). Every follow-up message edits the actual
  files; only changed files are rewritten. Live preview at desktop, tablet and
  mobile widths. Download as a ZIP.
- **AI agents** — create agents with a name, role, instructions and tool list.
  The instructions become that agent's system prompt, so it stays in character.
- **AI team** — four specialists (architect, designer, engineer, QA) work one
  task in sequence, each seeing what the previous produced.
- **Documents** — generates a document and exports a genuine Word .docx.
- **Spreadsheets** — generates a table into an editable grid and exports a
  genuine Excel .xlsx, with numbers written as numeric cells.
- **Code, slides, design specs, research** — each has its own system prompt.
- **Reminders** — persisted, delivered through the browser Notification API,
  with an in-app fallback when notifications are blocked.

## Honest limitations

- Google sign-in is not enabled; it needs OAuth credentials that are not
  configured.
- The 76 listed integrations record a connection choice but do not complete an
  OAuth handshake, so no third-party data actually flows. Supabase is the
  exception: its connection is live and its status is queried on page load.
- Plan selection is stored against the account, but no payment processor is
  connected and nothing is charged.
- Scheduled/background tasks are not implemented; reminders fire while the app
  is open in a tab.

## Stack

Next.js 16 (App Router, React 19, TypeScript), Tailwind CSS v4, Google Gemini
for generation, SQLite via node:sqlite for storage.

## Pages

- ${site.url}/ — chat home
- ${site.url}/websites — website builder
- ${site.url}/agents — build custom AI agents
- ${site.url}/team — four agents on one task
- ${site.url}/code — code generation
- ${site.url}/documents — documents, exports to .docx
- ${site.url}/spreadsheets — spreadsheets, exports to .xlsx
- ${site.url}/slides — slide outlines
- ${site.url}/design — design specifications
- ${site.url}/research — structured research
- ${site.url}/reminders — reminders and notifications
- ${site.url}/integrations — connected services
- ${site.url}/plans — pricing tiers

## Contact

Sitemap: ${site.url}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
