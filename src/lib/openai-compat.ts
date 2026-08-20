import "server-only";
import type { Turn, Usage, OnUsage } from "@/lib/gemini";
import { site } from "@/lib/site";

/**
 * One adapter for every provider that speaks the OpenAI chat format.
 *
 * OpenRouter and xAI both do, so this is written once and configured twice.
 * They differ only in a base URL, a key and a model name — writing a class per
 * vendor would be three copies of the same SSE parser waiting to drift.
 *
 * Deliberately not the official SDK: this needs one endpoint, and a dependency
 * that ships a retry policy, a telemetry layer and a browser bundle is a poor
 * trade for `fetch`.
 */

export interface CompatProvider {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** Which of these are actually configured, in the order they should be tried. */
export function compatProviders(): CompatProvider[] {
  const out: CompatProvider[] = [];

  const openrouter = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouter) {
    out.push({
      id: "openrouter",
      label: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: openrouter,
      // A zero-priced model by default. The previous default was a paid
      // one, so a fresh OpenRouter key with no balance failed on every
      // request — the fallback existed and could never fire, which is worse
      // than not having one because it looks configured.
      // Verified zero-priced and text->text against OpenRouter own model list.
      model: process.env.OPENROUTER_MODEL?.trim() || "nvidia/nemotron-3.5-lightning:free",
    });
  }

  const xai = process.env.XAI_API_KEY?.trim();
  if (xai) {
    out.push({
      id: "xai",
      label: "Grok",
      baseUrl: "https://api.x.ai/v1",
      apiKey: xai,
      model: process.env.XAI_MODEL?.trim() || "grok-2-latest",
    });
  }

  return out;
}

/** Gemini's shape converted to the OpenAI one. */
function toMessages(turns: Turn[], system: string) {
  const messages: { role: string; content: string }[] = [
    { role: "system", content: system },
  ];
  for (const t of turns) {
    // Gemini calls the assistant "model"; OpenAI calls it "assistant".
    messages.push({ role: t.role === "model" ? "assistant" : "user", content: t.text });
  }
  return messages;
}

function headersFor(p: CompatProvider) {
  const h: Record<string, string> = {
    authorization: `Bearer ${p.apiKey}`,
    "content-type": "application/json",
  };
  // OpenRouter asks callers to identify themselves; it affects rate limits and
  // shows up in the dashboard, which is worth having when debugging spend.
  if (p.id === "openrouter") {
    // site.url, not the raw variable: NEXT_PUBLIC_SITE_URL is unset on both
    // deployments, and site.url falls back to Vercel own URL rather than to a
    // domain this app is not actually served from.
    h["HTTP-Referer"] = site.url;
    h["X-Title"] = "Trove";
  }
  return h;
}

function readUsage(u: unknown): Usage | null {
  const d = u as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  if (!d || typeof d.total_tokens !== "number") return null;
  return {
    promptTokens: d.prompt_tokens ?? 0,
    responseTokens: d.completion_tokens ?? 0,
    totalTokens: d.total_tokens,
  };
}

export async function compatGenerate({
  provider,
  turns,
  system,
  temperature,
  maxOutputTokens,
  onUsage,
}: {
  provider: CompatProvider;
  turns: Turn[];
  system: string;
  temperature: number;
  maxOutputTokens: number;
  onUsage?: OnUsage;
}): Promise<string> {
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: headersFor(provider),
    body: JSON.stringify({
      model: provider.model,
      messages: toMessages(turns, system),
      temperature,
      max_tokens: maxOutputTokens,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${provider.label} returned ${res.status}. ${detail.slice(0, 200)}`);
  }

  const json = await res.json();
  const usage = readUsage(json?.usage);
  if (usage) {
    try {
      onUsage?.(usage);
    } catch (e) {
      console.error("usage callback failed", e);
    }
  }

  return String(json?.choices?.[0]?.message?.content ?? "");
}

export async function compatStream({
  provider,
  turns,
  system,
  temperature,
  maxOutputTokens,
  onUsage,
}: {
  provider: CompatProvider;
  turns: Turn[];
  system: string;
  temperature: number;
  maxOutputTokens: number;
  onUsage?: OnUsage;
}): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: headersFor(provider),
    body: JSON.stringify({
      model: provider.model,
      messages: toMessages(turns, system),
      temperature,
      max_tokens: maxOutputTokens,
      stream: true,
      // Without this the usage block never arrives on a streamed response, and
      // the request would be billed to the account as zero tokens.
      stream_options: { include_usage: true },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${provider.label} returned ${res.status}. ${detail.slice(0, 200)}`);
  }

  const upstream = res.body;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let usage: Usage | null = null;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
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
              const seen = readUsage(json?.usage);
              if (seen) usage = seen;
              const delta = json?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              /* partial frame; the next chunk completes it */
            }
          }
        }
      } catch (err) {
        console.error(`${provider.label} stream error`, err);
      } finally {
        controller.close();
        reader.releaseLock();
        if (usage) {
          try {
            onUsage?.(usage);
          } catch (e) {
            console.error("usage callback failed", e);
          }
        }
      }
    },
  });
}
