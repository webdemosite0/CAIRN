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

/** Worth moving on for: the provider is out, throttled, or refusing the key. */
function shouldFallOver(message: string): boolean {
  return /429|quota|rate.?limit|exhaust|billing|insufficient|401|403|invalid.?api.?key|not available|404|503|overload/i.test(
    message,
  );
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
    onSources?: OnSources;
  },
): Promise<string> {
  const temperature = opts.temperature ?? 0.7;
  const maxOutputTokens = opts.maxOutputTokens ?? 8192;

  try {
    return await geminiGenerate(opts);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
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
          system: opts.system,
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
    onSources?: OnSources;
  },
): Promise<ReadableStream<Uint8Array>> {
  const temperature = opts.temperature ?? 0.7;
  const maxOutputTokens = opts.maxOutputTokens ?? 4096;

  try {
    return await geminiStream(opts);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const chain = compatProviders();
    if (!chain.length || !shouldFallOver(message)) throw e;

    const attempts: { label: string; reason: string }[] = [];

    for (const provider of chain) {
      console.warn(`ai: Gemini unavailable (${message.slice(0, 120)}) — trying ${describe(provider)}`);
      try {
        return await compatStream({
          provider,
          turns: opts.turns,
          system: opts.system,
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
