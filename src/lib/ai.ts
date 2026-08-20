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
        console.warn(
          `ai: ${describe(provider)} failed —`,
          err instanceof Error ? err.message.slice(0, 160) : String(err),
        );
      }
    }

    // Report the original failure, not the last fallback's. Gemini is the
    // configured provider; "Grok returned 402" would send someone to debug an
    // account they did not know existed.
    throw e;
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
        console.warn(
          `ai: ${describe(provider)} failed —`,
          err instanceof Error ? err.message.slice(0, 160) : String(err),
        );
      }
    }

    throw e;
  }
}

/** For /api/health: which providers could answer if Gemini were down. */
export function providerChain(): string[] {
  return ["Gemini", ...compatProviders().map((p) => p.label)];
}
