import "server-only";
import {
  streamText as geminiStream,
  generateText as geminiGenerate,
  type Turn,
  type Usage,
  type OnUsage,
  type OnAttempt,
  type Source,
  type OnSources,
} from "@/lib/gemini";
import {
  compatProviders,
  compatGenerate,
  compatStream,
  type CompatProvider,
} from "@/lib/openai-compat";

export type { Turn, Usage, OnUsage, OnAttempt, Source, OnSources };

/**
 * The model, whichever one is answering today.
 *
 * Gemini first, then OpenRouter, then Grok. The chain exists because a single
 * provider is a single point of failure with a daily quota attached: when
 * Gemini's free tier runs out, every feature in Trove stops at once, and the
 * user did nothing wrong and can do nothing about it.
 *
 * Failing over is silent to the user by design — they asked for an answer, not
 * for a report on which vendor produced it. It is not silent to the operator:
 * every switch is logged with the reason, because a bill arriving from a
 * provider nobody knew was being used is a worse surprise than a slow request.
 *
 * Only providers with a key configured are in the chain, so this collapses to
 * "just Gemini" until someone adds one. Nothing here needs a code change to
 * turn on — see .env.example.
 *
 * One capability does not carry across: web search is Gemini's tool. A
 * fallback provider answers without it, which is why `search` is a request
 * rather than a guarantee, and why nothing downstream claims a source it was
 * not given.
 */

interface Common {
  turns: Turn[];
  system: string;
  temperature?: number;
  maxOutputTokens?: number;
  onUsage?: OnUsage;
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Worth moving on for: the provider is out, throttled, or refusing the key. */
function shouldFallOver(message: string): boolean {
  return /429|quota|rate.?limit|exhaust|billing|insufficient|401|403|invalid.?api.?key|not available|404|503|overload/i.test(
    message,
  );
}

/**
 * Whether an ungrounded retry is worth attempting.
 *
 * Google meters web-search grounding separately from the model itself, and far
 * more tightly — on the free tier a plain request returns 200 while the same
 * request carrying the search tool returns 429. Treating that as "Gemini is
 * down" would take every chat with it, because the fallback providers have no
 * search either: the whole product would stop over a tool it did not need for
 * most questions.
 *
 * So when a grounded call is refused for quota reasons, the model is still
 * there. Ask it again without the tool.
 */
function groundingMayBeTheProblem(message: string): boolean {
  return /429|quota|rate.?limit|exhaust|billing|insufficient|403/i.test(message);
}

/**
 * Remembers that grounding is currently refused, so the next request does not
 * pay for the same discovery.
 *
 * Without this, a key whose search quota is exhausted makes every single
 * message send a doomed request to Google, wait for the 429, and only then ask
 * the real question — the failure is invisible but everyone waits twice.
 *
 * The window is short because the opposite mistake matters too: quota resets,
 * and a long cooldown would keep search switched off for hours after it came
 * back. Serverless instances are short-lived, so this is a per-instance hint
 * rather than shared state — which is fine, since being wrong only costs the
 * one wasted call it was already going to make.
 */
const GROUNDING_COOLDOWN_MS = 10 * 60_000;
let groundingRefusedAt = 0;

function groundingAvailable(): boolean {
  return Date.now() - groundingRefusedAt > GROUNDING_COOLDOWN_MS;
}

function noteGroundingRefused() {
  groundingRefusedAt = Date.now();
}

/**
 * The error to raise when nothing in the chain could answer.
 *
 * This used to rethrow Gemini's error verbatim, on the reasoning that naming
 * a fallback would send someone to debug "an account they did not know
 * existed". That was wrong: whoever configured OPENROUTER_API_KEY knows the
 * account exists, and hiding the fallback failure means a page that says
 * "Gemini quota used up" while two other providers were tried and also
 * failed — which is unactionable and reads as the fallback never running.
 *
 * Naming every provider and why each failed is the difference between
 * "wait until tomorrow" and "your OpenRouter account has no credit".
 */
function chainFailure(primary: unknown, attempts: { label: string; reason: string }[]): Error {
  const first = primary instanceof Error ? primary.message : String(primary);
  if (!attempts.length) return primary instanceof Error ? primary : new Error(first);

  const tail = attempts.map((a) => `${a.label}: ${a.reason}`).join(" · ");
  return new Error(`${first} Fallbacks were tried and also failed — ${tail}`);
}

function describe(p: CompatProvider) {
  return `${p.label} (${p.model})`;
}

export async function generateText(
  opts: Common & {
    extraParts?: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
    onAttempt?: OnAttempt;
    search?: boolean;
    /** See streamText. The prompt to use if the search tool has to be dropped. */
    systemWithoutSearch?: string;
    onSources?: OnSources;
  },
): Promise<string> {
  const temperature = opts.temperature ?? 0.7;
  const maxOutputTokens = opts.maxOutputTokens ?? 8192;

  const grounded = { ...opts, search: Boolean(opts.search) && groundingAvailable() };
  const ungrounded = {
    ...opts,
    search: false,
    system: opts.systemWithoutSearch ?? opts.system,
  };

  let first: unknown;
  try {
    return await geminiGenerate(grounded.search ? grounded : ungrounded);
  } catch (e) {
    first = e;
  }

  if (grounded.search && groundingMayBeTheProblem(errText(first))) {
    noteGroundingRefused();
    try {
      console.warn("ai: grounding refused — retrying without web search");
      return await geminiGenerate(ungrounded);
    } catch (e2) {
      first = e2;
    }
  }

  {
    const e = first;
    const message = errText(e);
    const chain = compatProviders();

    // A failure that is not about availability — a malformed request, say —
    // will fail identically everywhere, and retrying it three times just makes
    // the user wait three times as long for the same error.
    if (!chain.length || !shouldFallOver(message)) throw e;

    const attempts: { label: string; reason: string }[] = [];

    for (const provider of chain) {
      console.warn(`ai: Gemini unavailable (${message.slice(0, 120)}) — trying ${describe(provider)}`);
      try {
        return await compatGenerate({
          provider,
          turns: opts.turns,
          // No fallback provider has Gemini's search tool, so send the prompt
          // written for that case — otherwise the model is told to look
          // something up with a tool it does not have, and answers as though
          // it did.
          system: opts.search ? (opts.systemWithoutSearch ?? opts.system) : opts.system,
          temperature,
          maxOutputTokens,
          onUsage: opts.onUsage,
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(`ai: ${describe(provider)} failed —`, reason.slice(0, 240));
        attempts.push({ label: describe(provider), reason: reason.slice(0, 160) });
      }
    }

    throw chainFailure(e, attempts);
  }
}

export async function streamText(
  opts: Common & {
    extraParts?: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
    search?: boolean;
    /**
     * The prompt to use when the search tool is not in play — because Google
     * refused it, or because a fallback provider is answering.
     *
     * Without this, a degraded request still carries "look it up with your
     * search tool", and a model told it can search will happily produce an
     * answer shaped like a researched one. The caveat has to change with the
     * capability, so the two versions are written by the caller who knows what
     * the prompt says.
     */
    systemWithoutSearch?: string;
    onSources?: OnSources;
  },
): Promise<ReadableStream<Uint8Array>> {
  const temperature = opts.temperature ?? 0.7;
  const maxOutputTokens = opts.maxOutputTokens ?? 4096;

  // Skip a grounded attempt that recent evidence says will be refused.
  const grounded = { ...opts, search: Boolean(opts.search) && groundingAvailable() };
  const ungrounded = {
    ...opts,
    search: false,
    system: opts.systemWithoutSearch ?? opts.system,
  };

  let first: unknown;
  try {
    return await geminiStream(grounded.search ? grounded : ungrounded);
  } catch (e) {
    first = e;
  }

  // Grounding is metered separately and far more tightly than the model. If
  // only the tool was refused, ask again without it before giving up on
  // Gemini entirely — see groundingMayBeTheProblem.
  if (grounded.search && groundingMayBeTheProblem(errText(first))) {
    noteGroundingRefused();
    try {
      console.warn("ai: grounding refused — retrying without web search");
      return await geminiStream(ungrounded);
    } catch (e2) {
      first = e2;
    }
  }

  {
    const e = first;
    const message = errText(e);
    const chain = compatProviders();
    if (!chain.length || !shouldFallOver(message)) throw e;

    const attempts: { label: string; reason: string }[] = [];

    for (const provider of chain) {
      console.warn(`ai: Gemini unavailable (${message.slice(0, 120)}) — trying ${describe(provider)}`);
      try {
        return await compatStream({
          provider,
          turns: opts.turns,
          system: opts.search ? (opts.systemWithoutSearch ?? opts.system) : opts.system,
          temperature,
          maxOutputTokens,
          onUsage: opts.onUsage,
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(`ai: ${describe(provider)} failed —`, reason.slice(0, 240));
        attempts.push({ label: describe(provider), reason: reason.slice(0, 160) });
      }
    }

    throw chainFailure(e, attempts);
  }
}

/** For /api/health: which providers could answer if Gemini were down. */
export function providerChain(): string[] {
  return ["Gemini", ...compatProviders().map((p) => p.label)];
}
