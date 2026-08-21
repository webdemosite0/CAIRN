import "server-only";

/**
 * Web search, so answers can be about now rather than about training day.
 *
 * A language model's weights are frozen at the date it was trained. No amount
 * of prompting changes what it knows — telling it the date only lets it say
 * "my information may be out of date", which is honest but still not an
 * answer. The only cure is putting current text in front of it.
 *
 * Gemini has grounding built in, and Trove still prefers it when it works, but
 * Google meters it separately and refuses it outright on a free key. So this
 * exists as the path that does not depend on that: the model asks for a
 * search through a function call, and Trove runs it here.
 *
 * ---------------------------------------------------------------------------
 * On safety: every provider below is a fixed, hard-coded endpoint. The model
 * supplies a *query string*, never a URL, and nothing here will fetch an
 * address chosen by a model or a user. That is deliberate — a server that
 * fetches arbitrary URLs on request is a server that can be aimed at a cloud
 * metadata endpoint or a machine inside the network it is running in.
 * ---------------------------------------------------------------------------
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  /** Only some providers report this; it is what makes recency checkable. */
  published?: string;
}

export interface SearchOutcome {
  provider: string;
  results: SearchResult[];
}

const TIMEOUT_MS = 9_000;
const MAX_RESULTS = 6;
const SNIPPET_CHARS = 420;

function clean(s: unknown, max = SNIPPET_CHARS): string {
  return String(s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${body.slice(0, 160)}`);
  }
  return res.json();
}

/* ---------------------------------------------------------------------------
   Providers, in preference order. Each returns [] rather than throwing when it
   is not configured, so the chain below can simply try the next one.
   --------------------------------------------------------------------------- */

async function brave(query: string): Promise<SearchResult[]> {
  const key = process.env.BRAVE_API_KEY?.trim();
  if (!key) return [];
  const json = (await getJson(
    `https://api.search.brave.com/res/v1/web/search?count=${MAX_RESULTS}&q=${encodeURIComponent(query)}`,
    { headers: { accept: "application/json", "x-subscription-token": key } },
  )) as { web?: { results?: Array<Record<string, unknown>> } };

  return (json.web?.results ?? []).slice(0, MAX_RESULTS).map((r) => ({
    title: clean(r.title, 160),
    url: String(r.url ?? ""),
    snippet: clean(r.description),
    published: r.age ? clean(r.age, 40) : undefined,
  }));
}

async function tavily(query: string): Promise<SearchResult[]> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return [];
  const json = (await getJson("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: MAX_RESULTS,
      search_depth: "basic",
    }),
  })) as { results?: Array<Record<string, unknown>> };

  return (json.results ?? []).slice(0, MAX_RESULTS).map((r) => ({
    title: clean(r.title, 160),
    url: String(r.url ?? ""),
    snippet: clean(r.content),
    published: r.published_date ? clean(r.published_date, 40) : undefined,
  }));
}

async function serper(query: string): Promise<SearchResult[]> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) return [];
  const json = (await getJson("https://google.serper.dev/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify({ q: query, num: MAX_RESULTS }),
  })) as {
    answerBox?: Record<string, unknown>;
    knowledgeGraph?: Record<string, unknown>;
    organic?: Array<Record<string, unknown>>;
  };

  const out: SearchResult[] = [];

  // The answer box is usually the direct answer to exactly this kind of
  // question ("net worth", "who is the CEO of"), so it leads.
  const box = json.answerBox;
  if (box && (box.answer || box.snippet)) {
    out.push({
      title: clean(box.title ?? "Answer", 160),
      url: String(box.link ?? ""),
      snippet: clean(box.answer ?? box.snippet),
    });
  }

  /**
   * The knowledge panel, where Google puts the attribute someone asked for.
   *
   * "Net worth", "Founded", "CEO" live in `attributes` as plain key/value
   * pairs — for the questions this whole feature exists to answer, that panel
   * is often more direct than any organic result.
   *
   * Read defensively: Serper's exact field names for this object are not
   * pinned down in public documentation, so anything missing is skipped rather
   * than assumed. A renamed field costs a little context; a wrong assumption
   * would throw and lose the whole search.
   */
  const kg = json.knowledgeGraph;
  if (kg) {
    const attrs = kg.attributes;
    const pairs =
      attrs && typeof attrs === "object" && !Array.isArray(attrs)
        ? Object.entries(attrs as Record<string, unknown>)
            .filter(([, v]) => typeof v === "string" || typeof v === "number")
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ")
        : "";
    const body = [clean(kg.description, 260), pairs].filter(Boolean).join(" — ");
    if (body) {
      out.push({
        title: clean(kg.title ?? "Knowledge panel", 160),
        url: String(kg.descriptionLink ?? kg.website ?? ""),
        snippet: clean(body, 600),
      });
    }
  }

  for (const r of json.organic ?? []) {
    out.push({
      title: clean(r.title, 160),
      url: String(r.link ?? ""),
      snippet: clean(r.snippet),
      published: r.date ? clean(r.date, 40) : undefined,
    });
  }
  return out.slice(0, MAX_RESULTS);
}

async function googleCse(query: string): Promise<SearchResult[]> {
  const key = process.env.GOOGLE_CSE_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_ID?.trim();
  if (!key || !cx) return [];
  const json = (await getJson(
    `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&num=${MAX_RESULTS}&q=${encodeURIComponent(query)}`,
  )) as { items?: Array<Record<string, unknown>> };

  return (json.items ?? []).slice(0, MAX_RESULTS).map((r) => ({
    title: clean(r.title, 160),
    url: String(r.link ?? ""),
    snippet: clean(r.snippet),
  }));
}

/**
 * The keyless floor, so search works on a fresh clone with nothing configured.
 *
 * Wikipedia is not a web search engine and this is not pretending otherwise —
 * it will not find a share price or this morning's news. What it does cover is
 * the large class of "who currently runs X", "what is X's net worth", "what
 * happened to Y" questions, because those articles are edited within hours and
 * carry dated figures. Compared to answering from 2024 weights, that is a real
 * improvement; compared to Brave or Serper, it is a stopgap, and the setup
 * notes say so.
 */
async function wikipedia(query: string): Promise<SearchResult[]> {
  const search = (await getJson(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json&origin=*`,
  )) as { query?: { search?: Array<{ title?: string }> } };

  const titles = (search.query?.search ?? [])
    .map((s) => s.title)
    .filter((t): t is string => Boolean(t));
  if (!titles.length) return [];

  // One call for all extracts rather than one per article.
  const extracts = (await getJson(
    `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|info&exintro=1&explaintext=1&inprop=url&titles=${encodeURIComponent(titles.join("|"))}&format=json&origin=*`,
  )) as {
    query?: { pages?: Record<string, { title?: string; extract?: string; fullurl?: string }> };
  };

  const pages = Object.values(extracts.query?.pages ?? {});
  return pages
    .filter((p) => p.extract)
    .map((p) => ({
      title: clean(p.title, 160),
      url: p.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title ?? "")}`,
      snippet: clean(p.extract, 700),
    }));
}

const PROVIDERS: Array<{ name: string; run: (q: string) => Promise<SearchResult[]> }> = [
  { name: "Brave", run: brave },
  { name: "Tavily", run: tavily },
  { name: "Serper", run: serper },
  { name: "Google", run: googleCse },
  { name: "Wikipedia", run: wikipedia },
];

/** Which provider will answer, for /api/health and the setup screen. */
export function searchProvider(): string {
  if (process.env.BRAVE_API_KEY?.trim()) return "Brave";
  if (process.env.TAVILY_API_KEY?.trim()) return "Tavily";
  if (process.env.SERPER_API_KEY?.trim()) return "Serper";
  if (process.env.GOOGLE_CSE_KEY?.trim() && process.env.GOOGLE_CSE_ID?.trim()) return "Google";
  return "Wikipedia";
}

/**
 * Runs a query against the first provider that is configured and working.
 *
 * A provider that errors is stepped over rather than fatal: the point is to
 * get *something* current in front of the model, and a search that fails
 * should degrade to a thinner answer, never to a failed request.
 */
export async function webSearch(query: string): Promise<SearchOutcome> {
  const q = query.trim().slice(0, 300);
  if (!q) return { provider: "none", results: [] };

  for (const provider of PROVIDERS) {
    try {
      const results = await provider.run(q);
      if (results.length) {
        return { provider: provider.name, results };
      }
    } catch (e) {
      console.warn(
        `search: ${provider.name} failed —`,
        (e instanceof Error ? e.message : String(e)).slice(0, 160),
      );
    }
  }

  return { provider: "none", results: [] };
}

/** Formats results for the model. Plain text: no JSON for it to mis-parse. */
export function formatResults(outcome: SearchOutcome): string {
  if (!outcome.results.length) {
    return "No results were found. Say that you could not verify this rather than answering from memory.";
  }
  return outcome.results
    .map((r, i) => {
      const when = r.published ? ` (${r.published})` : "";
      return `[${i + 1}] ${r.title}${when}\n${r.url}\n${r.snippet}`;
    })
    .join("\n\n");
}
