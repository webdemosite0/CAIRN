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
    return "Google's servers are busy right now. CAIRN already retried every model a few times — give it a few seconds and try again.";
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
async function callWithFallback(path: string, body: unknown) {
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

/** Streams plain text deltas out of Gemini's SSE response. */
export async function streamText({
  turns,
  system,
  temperature = 0.7,
  maxOutputTokens = 4096,
  extraParts,
  onUsage,
}: {
  turns: Turn[];
  system: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Attachment parts, appended to the most recent user turn. */
  extraParts?: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
  /** Fires once, when the stream ends, with the real token counts. */
  onUsage?: OnUsage;
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
}: {
  turns: Turn[];
  system: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Attachment parts, appended to the most recent user turn. */
  extraParts?: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
  /** Fires with the real token counts once the response is parsed. */
  onUsage?: OnUsage;
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

  const res = await callWithFallback("generateContent", {
    contents,
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: { temperature, maxOutputTokens },
  });

  const json = await res.json();

  const usage = readUsage(json?.usageMetadata);
  if (usage) {
    try {
      onUsage?.(usage);
    } catch (e) {
      console.error("Gemini usage callback failed", e);
    }
  }

  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: { text?: string }) => p.text ?? "").join("");
}
