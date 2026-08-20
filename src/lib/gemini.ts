import "server-only";

const API = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Models are tried in order. Which models a key may use varies by project —
 * newer keys get 404 on older models, and any single model can return 503
 * under load — so we fall through rather than fail the request.
 * Override the first choice with GEMINI_MODEL.
 */
const MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
].filter(Boolean) as string[];

/** 404 = not available to this key, 503 = busy, 429 = rate limited. */
const FALLBACK_STATUS = new Set([404, 429, 503]);

/** Google's free tier returns 503 "high demand" sporadically — the identical
 *  request usually succeeds seconds later, so sweep the list more than once. */
const PASSES = 2;
const REQUEST_TIMEOUT_MS = 45_000;
const PASS_DELAY_MS = 1200;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Reports each failed attempt as it happens.
 *
 * Without this, a long fallback sweep is completely silent: Google returning
 * 503 across five models for two passes can take minutes, and the caller has
 * no way to tell that apart from a hang. The builder streams these into its
 * console so a stall says why it is stalling.
 */
export type OnAttempt = (info: {
  model: string;
  status: number;
  pass: number;
}) => void;

export interface Turn {
  role: "user" | "model";
  text: string;
}

function key() {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("GEMINI_API_KEY is not set. Add it to .env.local.");
  return k;
}

/** Turns Gemini's HTTP failures into something a person can act on. */
export function describeFailure(status: number, body: string) {
  if (status === 429) {
    // Gemini reports which quota tripped; per-day and per-minute need very
    // different advice, so read it rather than guessing.
    let quotaId = "";
    let quotaValue = "";
    let retry = "";
    try {
      const details = JSON.parse(body)?.error?.details ?? [];
      const failure = details.find((d: { "@type"?: string }) =>
        d["@type"]?.includes("QuotaFailure"),
      );
      const info = details.find((d: { "@type"?: string }) =>
        d["@type"]?.includes("RetryInfo"),
      );
      const violation = failure?.violations?.[0];
      quotaId = violation?.quotaId ?? "";
      quotaValue = violation?.quotaValue ?? "";
      retry = info?.retryDelay ?? "";
    } catch {
      /* fall through to the generic message */
    }

    if (/PerDay/i.test(quotaId)) {
      return `Daily Gemini quota used up${
        quotaValue ? ` (${quotaValue} requests per day on the free tier)` : ""
      }. It resets on Google's daily schedule — enable billing on the key to lift the cap.`;
    }
    if (/PerMinute/i.test(quotaId)) {
      return `Gemini per-minute rate limit hit${
        quotaValue ? ` (${quotaValue} requests per minute)` : ""
      }. Wait ${retry || "a few seconds"} and try again.`;
    }
    return "Gemini rate limit reached. Wait a moment and try again, or enable billing on the key to raise the limit.";
  }
  if (status === 401 || status === 403) {
    return "The Gemini API key was rejected. Check GEMINI_API_KEY in .env.local.";
  }
  if (status === 400 && /API key not valid/i.test(body)) {
    return "The Gemini API key is not valid.";
  }
  if (status === 503) {
    return "Google's servers are busy right now. Trove already retried every model a few times — give it a few seconds and try again.";
  }
  if (status === 404) {
    return "None of the configured models are available to this API key. Set GEMINI_MODEL in .env.local to a model your key can use.";
  }
  if (status >= 500) {
    return "Gemini is having trouble right now. Try again in a moment.";
  }
  return `The model returned ${status}.`;
}

/**
 * Posts to each model in turn, moving on when one is unavailable or busy.
 * Returns the first successful response, or throws the last failure.
 */
async function callWithFallback(path: string, body: unknown, onAttempt?: OnAttempt) {
  // Rank failures by how useful they are to report. A 404 just means "this key
  // cannot use that model" — never the headline when something was merely busy.
  const priority: Record<number, number> = { 429: 3, 503: 2, 404: 1 };
  let best = { status: 0, detail: "", rank: -1 };

  const note = (status: number, detail: string) => {
    const rank = priority[status] ?? 4; // unknown failures outrank all of these
    if (rank > best.rank) best = { status, detail, rank };
  };

  for (let pass = 0; pass < PASSES; pass++) {
    for (const model of MODELS) {
      let res: Response;
      try {
        res = await fetch(`${API}/${model}:${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key() },
          body: JSON.stringify(body),
          // A congested model can hang for a minute. Cut it loose and try the
          // next one rather than making the whole request wait.
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        console.warn(`gemini: ${model} timed out (pass ${pass + 1})`);
        note(503, "");
        try { onAttempt?.({ model, status: 0, pass: pass + 1 }); } catch {}
        continue;
      }

      if (res.ok) return res;

      const detail = await res.text().catch(() => "");
      note(res.status, detail);

      // A genuine error (bad request, bad key) will not fix itself.
      if (!FALLBACK_STATUS.has(res.status)) {
        throw new Error(describeFailure(res.status, detail));
      }

      // A daily quota will not clear by retrying — say so immediately rather
      // than making the user watch fifteen doomed attempts.
      if (res.status === 429 && /PerDay/i.test(detail)) {
        throw new Error(describeFailure(res.status, detail));
      }

      console.warn(`gemini: ${model} returned ${res.status} (pass ${pass + 1})`);
      try { onAttempt?.({ model, status: res.status, pass: pass + 1 }); } catch {}
    }

    if (pass < PASSES - 1) await sleep(PASS_DELAY_MS * (pass + 1));
  }

  throw new Error(describeFailure(best.status, best.detail));
}

/** What Google says the call actually cost. */
export interface Usage {
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
}

/** Callback shape shared by both entry points. */
export type OnUsage = (usage: Usage) => void;

function readUsage(meta: unknown): Usage | null {
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  const prompt = Number(m.promptTokenCount ?? 0);
  const response = Number(m.candidatesTokenCount ?? 0);
  const total = Number(m.totalTokenCount ?? 0) || prompt + response;
  if (!total) return null;
  return { promptTokens: prompt, responseTokens: response, totalTokens: total };
}

/**
 * A page the model actually consulted.
 *
 * These come from Gemini's own grounding metadata, not from anything Trove
 * scraped — the search happens inside the API call. Showing them is not
 * decoration: an answer that cites nothing is indistinguishable from one the
 * model invented, which is exactly the failure the research prompt has been
 * warning about while it had no web access at all.
 */
export interface Source {
  title: string;
  url: string;
}

export type OnSources = (sources: Source[], queries: string[]) => void;

/** Pulls the sources out of one SSE frame, if it carries any. */
function readGrounding(meta: unknown): { sources: Source[]; queries: string[] } | null {
  const g = meta as {
    groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    webSearchQueries?: string[];
  } | null;
  if (!g) return null;

  const sources: Source[] = [];
  for (const chunk of g.groundingChunks ?? []) {
    const url = chunk.web?.uri;
    if (!url) continue;
    // Same page can be cited by several passages; one entry each.
    if (sources.some((s) => s.url === url)) continue;
    sources.push({ url, title: chunk.web?.title?.trim() || new URL(url).hostname });
  }

  const queries = g.webSearchQueries ?? [];
  if (!sources.length && !queries.length) return null;
  return { sources, queries };
}

/** Streams plain text deltas out of Gemini's SSE response. */
export async function streamText({
  turns,
  system,
  temperature = 0.7,
  maxOutputTokens = 4096,
  extraParts,
  onUsage,
  search = false,
  onSources,
}: {
  turns: Turn[];
  system: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Attachment parts, appended to the most recent user turn. */
  extraParts?: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
  /** Fires once, when the stream ends, with the real token counts. */
  onUsage?: OnUsage;
  /**
   * Let the model search the web before answering.
   *
   * Google runs the search inside the API call and returns which pages it
   * used; Trove never fetches a URL itself, so there is no request this
   * server can be tricked into making on someone else's behalf.
   */
  search?: boolean;
  /** Fires when grounding metadata arrives, before the stream ends. */
  onSources?: OnSources;
}) {
  const contents = turns.map((t) => ({
    role: t.role,
    parts: [{ text: t.text }] as Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    >,
  }));
  if (extraParts?.length) {
    const last = contents[contents.length - 1];
    if (last?.role === "user") last.parts.push(...extraParts);
  }

  const upstream = await callWithFallback("streamGenerateContent?alt=sse", {
    contents,
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: { temperature, maxOutputTokens },
    // Omitted entirely rather than sent as false: a model that does not know
    // this tool rejects the whole request for an unknown field, and the
    // fallback chain would then burn through every model on a 400.
    ...(search ? { tools: [{ google_search: {} }] } : {}),
  });

  if (!upstream.body) {
    throw new Error("The model returned an empty response.");
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  // Gemini repeats usageMetadata on successive SSE frames, each one cumulative,
  // so the last frame that carries it is the authoritative total.
  let usage: Usage | null = null;
  let grounded: { sources: Source[]; queries: string[] } = { sources: [], queries: [] };

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const seen = readUsage(json?.usageMetadata);
              if (seen) usage = seen;

              if (onSources) {
                const g = readGrounding(json?.candidates?.[0]?.groundingMetadata);
                // Later frames carry the fuller set, so the last one wins.
                if (g && g.sources.length >= grounded.sources.length) grounded = g;
              }
              for (const part of json?.candidates?.[0]?.content?.parts ?? []) {
                if (typeof part?.text === "string" && part.text) {
                  controller.enqueue(encoder.encode(part.text));
                }
              }
            } catch {
              /* partial frame; the next chunk completes it */
            }
          }
        }
      } catch (err) {
        console.error("Gemini stream error", err);
      } finally {
        // Reported before the stream closes, not after: a caller that appends
        // the sources to the end of the answer runs its flush the moment the
        // readable closes, and would otherwise race this callback and append
        // an empty list.
        if (onSources && (grounded.sources.length || grounded.queries.length)) {
          try {
            onSources(grounded.sources, grounded.queries);
          } catch (e) {
            console.error("Gemini sources callback failed", e);
          }
        }

        controller.close();
        reader.releaseLock();
        // Billed from what the model reported. If the stream died before any
        // usage frame arrived, nothing is charged.
        if (usage) {
          try {
            onUsage?.(usage);
          } catch (e) {
            console.error("Gemini usage callback failed", e);
          }
        }
      }
    },
  });
}

/** Single-shot completion. */
export async function generateText({
  turns,
  system,
  temperature = 0.7,
  maxOutputTokens = 8192,
  extraParts,
  onUsage,
  onAttempt,
  search = false,
  onSources,
}: {
  turns: Turn[];
  system: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Attachment parts, appended to the most recent user turn. */
  extraParts?: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
  /** Fires with the real token counts once the response is parsed. */
  onUsage?: OnUsage;
  /** Fires on each failed model attempt, so a slow fallback is visible. */
  onAttempt?: OnAttempt;
  /** Let the model search the web first. See streamText for the reasoning. */
  search?: boolean;
  /** Fires with the pages the model consulted, before the text is returned. */
  onSources?: OnSources;
}) {
  const contents = turns.map((t) => ({
    role: t.role,
    parts: [{ text: t.text }] as Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    >,
  }));
  if (extraParts?.length) {
    const last = contents[contents.length - 1];
    if (last?.role === "user") last.parts.push(...extraParts);
  }

  const res = await callWithFallback(
    "generateContent",
    {
      contents,
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { temperature, maxOutputTokens },
      // Omitted rather than sent as false — an unknown field fails the whole
      // request and the fallback chain would walk every model on a 400.
      ...(search ? { tools: [{ google_search: {} }] } : {}),
    },
    onAttempt,
  );

  const json = await res.json();

  const usage = readUsage(json?.usageMetadata);
  if (usage) {
    try {
      onUsage?.(usage);
    } catch (e) {
      console.error("Gemini usage callback failed", e);
    }
  }

  if (onSources) {
    const g = readGrounding(json?.candidates?.[0]?.groundingMetadata);
    if (g && (g.sources.length || g.queries.length)) {
      try {
        onSources(g.sources, g.queries);
      } catch (e) {
        console.error("Gemini sources callback failed", e);
      }
    }
  }

  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: { text?: string }) => p.text ?? "").join("");
}
