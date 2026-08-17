# CAIRN

An AI workspace: chat, a website builder, an agent builder, and a swarm that
puts four specialists on one task. Light and dark.

## The name

A **cairn** is a stack of stones raised by travellers to mark a route across
ground that has no path — moorland, desert, mountain. Each person who passes
adds a stone. It is two things at once: proof that someone came this way, and a
guide for whoever comes next.

That is the product. Your chats, documents, sites and agents pile up into
something that persists and marks the way back — which is why every
conversation is saved and reopens exactly as you left it, rather than being
regenerated into a different answer.

One syllable, a real English word, a concrete image, and rare as a software
name. Trademark and domain availability are not something I have checked.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript)
- **Tailwind CSS v4** — tokens in `src/app/globals.css`
- **react-icons** — all iconography
- **Gemini 2.5 Flash** — every AI feature
- **libSQL** — a local SQLite file in development, hosted Turso in production
- No animation library; motion is CSS keyframes and inline SVG

## Setup

```bash
GEMINI_API_KEY=your-key-here   # in .env.local (gitignored)
npm run dev
```

The key is read only in server routes. It never reaches the browser.

## What actually works

| Feature | Status |
| --- | --- |
| Website builder | **Built and working, but switched OFF.** `/websites` shows a Coming soon screen. Set `ENABLED = true` in `src/app/(shell)/websites/page.tsx` to restore it — `website-builder.tsx` is untouched. |
| Saved conversations | Real. Every exchange is stored and reopens from `?c=<id>` with the **same** text — no second model call. Scoped by owner: another identity opening the id gets the empty state. |
| Recents | Real. Each page shows its last few threads under the composer; clicking one reopens the saved answer. Kept per identity, 12 per kind. |
| Chat / Swarm / Agent builder | Real. Streams from Gemini; agents persist and their instructions become the system prompt. |
| Docs | Real. Streams a document and exports a genuine **.docx** (Word) or .md. |
| Sheets | Real. Streams a table into an editable Excel-style grid (A/B/C columns, numbered rows) and exports genuine **.xlsx** or .csv. |
| Reminders | Real. Persisted, browser notifications, in-app fallback. |
| Signup / login / logout | Real. scrypt-hashed passwords, httpOnly session cookies. |
| Supabase | **Live.** The integrations page queries your project on load and reports its real auth + OAuth provider state. |
| Credits | Real, and metered off actual Gemini usage — see below. |
| Plans | Free is selectable. Pro and Team say **Coming soon**: there is no payment processor, and letting anyone switch to Team for free would make the credit budget meaningless. Enforced in the server action, not just hidden in the UI. |
| Other integrations | 76 services, connect state persists. **No OAuth handshake.** |
| Gmail / Google sign-in | **Not working, and cannot be from this app alone.** See below. |

### Gmail

Your Supabase project reports **zero OAuth providers enabled**. To make Gmail real:

1. Google Cloud Console → create an OAuth 2.0 client ID.
2. Supabase dashboard → Authentication → Providers → Google → paste the client
   ID and secret, and enable it.
3. The integrations page will then show Google in its live provider list.

No amount of app code substitutes for step 1 and 2 — the credentials are yours.

## Saved conversations

The Recents strip used to store only the prompt, so clicking one re-ran it — and
a model asked the same question twice does not answer the same way, so people
lost the reply they came back for. Threads are now stored in `conversations` +
`messages` and replayed on open.

- The client issues the save, because the model response is streamed straight
  through to the browser and the client is the only place holding the finished
  text.
- Messages are rewritten wholesale on each save rather than appended: the client
  always sends the full thread, so a replace cannot drift out of order or
  duplicate a turn on a retry.
- Loading is scoped by `user_id`. Verified: a second identity requesting the
  same id gets the empty state, not the transcript.
- The thread id lives in `?c=<id>` via `replaceState`, so reload and back both
  behave.

Covers chat, code, design, research, slides, documents and spreadsheets. The AI
Team and the website builder still re-run rather than replay.

## Credits

**One credit = 1,000 tokens that Google actually reported.** Nothing is
estimated up front and no call is flat-rated — a one-line chat and a 30k-token
site build are not the same amount of work, so they do not cost the same.

Both `streamText` and `generateText` surface Gemini's `usageMetadata` through an
`onUsage` callback. Routes check the balance *before* calling and debit *after*,
from the real number. On a stream, usage arrives on the final SSE frames; if the
stream dies before one arrives, nothing is charged.

| Plan | Credits / month | ≈ tokens |
| --- | --- | --- |
| Free | 200 | 200k |
| Pro | 5,000 | 5M |
| Team | 20,000 | 20M |

Two tables: `credit_grants` (one row per person per month — the primary key is
what makes granting idempotent under a race) and `credit_spends` (one row per
call, storing the raw token count next to the derived credit cost so the ledger
stays auditable if the rate ever changes). Grants are topped up, never reduced,
when the plan changes mid-month, so an upgrade applies immediately.

Running out returns **402** with a plain message, *before* any Gemini call — so
an exhausted account does not burn API quota either. The meter lives at the
bottom of the sidebar and turns amber at 85% and red at zero; `/plans` shows the
per-tool breakdown.

Note the real ceiling is still your Gemini key: the free tier allows 20 requests
per day per model regardless of how many credits are left.

### Gemini quota

The free tier allows **20 requests per day per model**. When it is exhausted
every AI feature returns a clear rate-limit message rather than a raw 502.
Enable billing on the key to lift it.

## Routes

```
/                 chat home
/dashboard        your account and counts
/websites         website builder
/agents           build your own AI agents
/team             four agents on one task
/code             code generation
/documents        documents      -> .docx
/spreadsheets     spreadsheets   -> .xlsx
/slides           slide outlines
/design           design specs
/research         research
/reminders        reminders and notifications
/integrations  /plans  /settings  /login  /signup
```

## Deploying

Read this before picking a host — the storage layer decides where this can run.

The storage layer decides where this can run, and it now runs almost anywhere.

| Host | Works |
| --- | --- |
| **Vercel / Netlify / Workers** | **Yes**, with `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` set |
| A VPS / container with a mounted volume (Fly, Railway, a droplet) | **Yes**, no configuration — falls back to a local file |
| **GitHub Pages, S3, any static host** | **No, and it never can be** — see below |

## The database

One client, two destinations. `src/lib/db.ts` uses libSQL, which speaks both a
local SQLite file and hosted Turso over HTTP:

- **No env vars** → a file under `.data/`. Zero setup for development, and
  correct for a container with a volume.
- **`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`** → hosted, which is what makes
  serverless deployment possible at all.

It is the same client and the same SQL either way, so what runs locally is what
runs in production — which is the only reason the migration off `node:sqlite`
could be verified without deploying.

Turso's free tier is 5 GB, 500 M row reads and 10 M writes a month, with no card.
CAIRN uses a few MB and a few thousand writes.

```bash
turso db create cairn
turso db show cairn --url      # -> TURSO_DATABASE_URL
turso db tokens create cairn   # -> TURSO_AUTH_TOKEN
```

**Why this was necessary.** The database used to be `node:sqlite`, which is
synchronous and writes to disk. On a read-only filesystem it did not merely lose
data — the shell layout reads the account and credit balance on every render, so
**every page returned 500**. Measured, not assumed.

### Static hosting cannot work

GitHub Pages serves files. CAIRN is not a set of files — it is a server. Setting
`output: "export"` fails on the first server-dependent route, and there are a lot
of them: **7 API routes** (`/api/chat`, `/api/tool`, `/api/builder`,
`/api/conversations`, `/api/agent`, `/api/swarm`, `/api/build-site`), **5 server
action modules** (auth, agents, reminders, billing, integrations), the middleware
that issues guest identities, and the database behind all of it.

There is no configuration that makes a static host run those. Use a host that
runs Node.

### Docker

The included `Dockerfile` builds the `output: "standalone"` bundle — a
self-contained `server.js` with only the modules actually reached, **31 MB**
against an 863 MB `.next` directory.

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://your-domain.com -t cairn .
docker run -p 3000:3000 -e GEMINI_API_KEY=... -v cairn-data:/data cairn
```

The volume is not optional. `CAIRN_DATA_DIR` defaults to `/data` in the image;
without a volume mounted there, every account and saved conversation disappears
on redeploy. If the filesystem is read-only, startup fails with an explicit
message naming the directory rather than a bare `EROFS`.

Verified by running the standalone artifact exactly as the container does: it
served every route and created its database at the configured path.

### Also required before going live

- `NEXT_PUBLIC_SITE_URL=https://your-domain.com` — canonical URLs, the sitemap
  and the OG image all derive from it, and it defaults to localhost. It is baked
  into the client bundle at **build** time, hence the `--build-arg`.
- `GEMINI_API_KEY` with billing enabled. The free tier is 20 requests per day
  per model, which is a demo budget, not a product one.
- Node 24 or newer, pinned in `engines`.
- Rotate any key that has been pasted into a chat.

## Publishing

Set your real domain before deploying — canonical URLs, the sitemap and the OG
image URL all derive from it:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### SEO

- Title template, description, keywords, canonical, Open Graph and Twitter card
- **Generated OG image** at `/opengraph-image` (1200x630) and favicon at `/icon`
- **JSON-LD** graph: Organization, WebSite and SoftwareApplication with a
  feature list and the three pricing offers
- `/sitemap.xml` with per-route priority and change frequency
- `/robots.txt` blocking `/settings`, `/dashboard` and `/api/`
- `/manifest.webmanifest` for installability, theme colour `#0f0f0f`

### AI SEO

- **`/llms.txt`** — a plain-text brief for LLM crawlers describing what the
  product does *and what it does not do*, so an assistant summarising CAIRN
  does not overstate it.
- Seventeen AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended and
  others) are explicitly allowed on public pages and blocked from private ones.
- The JSON-LD feature list gives models structured facts rather than making
  them infer capability from an app shell.

## Performance

**Run the production server, not `next dev`.** Dev mode compiles on demand and
ships unminified code — it measured ~9x slower here.

```bash
npm run serve      # builds, then serves on the production runtime
```

Measured on this machine, dashboard route:

| | dev | production |
| --- | --- | --- |
| TTFB | 409 ms | **31 ms** |
| DOM interactive | 570 ms | **97 ms** |
| Requests | 31 | **13** |

Other things that keep it fast:

- `optimizePackageImports` for react-icons — the barrel import for
  `react-icons/tb` alone measured 4 s before this.
- `will-change` is applied only while an icon is actually animating, not to
  all ~95 icons at rest.
- The backdrop uses static radial gradients instead of blurred layers; a large
  `filter: blur()` re-rasterises every frame.
- `loading.tsx` gives instant skeleton feedback on navigation.
- Word, Excel and ZIP libraries are dynamically imported — verified absent from
  the initial chunks, so they download only when you export.

## Attachments

The paperclip accepts files by click, drag-and-drop, or paste. Up to 6 files,
8 MB each, 16 MB total.

| Type | Handling |
| --- | --- |
| Images (png, jpeg, webp, heic) | Sent to the model as inline image data — it sees the picture |
| PDF | Sent inline; the model reads the document |
| Text, code, csv, json, yaml, md… | Read as text and quoted into the prompt |
| Anything else | Name, type and size are passed with an explicit note that the contents could not be read, so the model says so instead of guessing |

## No account needed

Every visitor gets a guest identity from  on first request,
so agents, reminders and integrations work immediately. Signing up later keeps
whatever the guest already created.

## Voice input

The mic in the composer uses the browser Web Speech API — nothing is uploaded
by us. Chrome and Edge support it; elsewhere the button says so plainly.

## Data

SQLite at `.data/nexora.db` (gitignored) unless Turso is configured. Tables: `users`,
`sessions`, `agents`, `sites`, `reminders`, `recents`, `integrations`.

To reset everything, delete the `.data` directory.

## Design

Two themes. The switch is at the bottom of the sidebar: **Light / Dark /
System**. System follows `prefers-color-scheme`; an explicit choice is stored in
`localStorage` and re-applied by a tiny inline script in `<head>` before the
first paint, so there is no flash of the wrong theme.

| Token | Dark | Light |
| --- | --- | --- |
| `canvas` / `rail` / `sunk` | `#0f0f0f` / `#171717` / `#1e1e1e` | `#ffffff` / `#f6f8fa` / `#f0f3f7` |
| `raised` / `hover` | `#242424` / `#2a2a2a` | `#ffffff` + shadow / `#eef1f6` |
| `ink` → `ink-4` | `#f2f2f3` → `#7d838d` | `#1a1f36` → `#636b7b` |
| `line` / `line-strong` | `#262626` / `#333333` | `#e6e9ef` / `#d5dbe4` |
| `accent` | `#3b82f6` | `#5b51f5` |

**The elevation ramp reverses direction between themes.** In dark, `canvas` is
darkest and `hover` lightest; in light, `canvas` is lightest and `hover`
darkest. Every `hover:bg-hover` in the app means "step away from the page", and
only reversing the ramp keeps that true. In light mode `raised` equals the
canvas, so cards earn their elevation from `--elev` (a shadow) instead of
lightness — that token is `none` in dark.

Components that take a colour as a prop (`Bot`, `ComingSoon`) are handed
dark-mode neons like `#7dcfff` by their call sites. Those sit at ~1.6:1 on
white, so both mix black in via `--tint-darken` (`0%` dark, `30%` light) rather
than making every call site theme-aware.

Verified with a scripted sweep over 16 routes in both themes, compositing every
translucent layer on a canvas to get true effective contrast: **zero text below
3:1, and zero surfaces that fail to flip.**

### Code blocks

Syntax highlighting is a ~150-line tokenizer in `src/lib/highlight.ts`, not a
library. Shiki (~1MB) and Prism were both rejected on size — this app already
fights for its bundle, and only a handful of languages ever reach a code block.
It covers js/ts, json, bash, python, sql, css and yaml, and degrades to plain
text rather than mangling anything it cannot parse.

Every token colour is a `--sx-*` variable, so blocks re-colour with the theme
instead of staying dark on a white page. Tested for lossless round-tripping
(the tokens always reassemble into the exact input) and for contrast: all eight
token roles clear 4.5:1 on the block surface in both themes.

Agents are drawn as inline SVG robots (`src/components/agents/bot.tsx`) with
four states — idle, working, done, failed. They bob, blink, sweep a visor while
thinking, and show a check when finished.

## Accessibility

Semantic landmarks, `aria-current` on navigation, labelled icon buttons,
`role="dialog"` with Escape-to-close, real `role="switch"` toggles, visible focus
rings, and full `prefers-reduced-motion` support.
