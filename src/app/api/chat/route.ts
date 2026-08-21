import type { NextRequest } from "next/server";
import { streamText, type Source, type Turn } from "@/lib/ai";
import { toParts, type Attachment } from "@/lib/attachments";
import { OBEY_FORMAT, safeTimeZone, situation } from "@/lib/context";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { hintFor, temperatureFor } from "@/lib/modes";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM = `You are Trove, an AI engineering team.

Answer as a senior engineer would: direct, concrete, no filler. Prefer real code
over description. When a question is ambiguous in a way that changes the answer,
ask one clarifying question instead of guessing. Keep responses tight unless the
user asks for depth. Use fenced code blocks for code.

When a file is attached, work from its actual contents. If a file could not be
read, say so plainly rather than guessing what it contained.`;

export async function POST(req: NextRequest) {
  let turns: Turn[];
  let attachments: Attachment[] = [];
  let mode: unknown;
  let timeZone = "UTC";

  try {
    const body = await req.json();
    turns = Array.isArray(body?.messages) ? body.messages : [];
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    mode = body?.mode;
    // The browser knows where the reader is; this server does not. Validated
    // rather than trusted — it goes straight into a date the model will state.
    timeZone = safeTimeZone(body?.timeZone);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (turns.length === 0) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
  }

  // Checked before the call; the debit below uses what Google actually
  // reported, so a long answer costs more than a short one.
  let account: Awaited<ReturnType<typeof requireCredits>> = null;
  try {
    account = await requireCredits();
  } catch (e) {
    if (e instanceof OutOfCredits) {
      return Response.json(
        { error: e.message, outOfCredits: true, balance: e.balance },
        { status: 402 },
      );
    }
    throw e;
  }

  const promptFor = (canSearch: boolean) =>
    [SYSTEM, OBEY_FORMAT, situation({ timeZone, canSearch }), hintFor(mode)]
      .filter(Boolean)
      .join("\n\n");

  try {
    // Collected during the stream and appended after it, the same way the
    // tool route does it — the client renders markdown, so no extra protocol.
    let sources: Source[] = [];
    const searches: { query: string; provider: string; count: number }[] = [];

    const stream = await streamText({
      onUsage: (u) =>
        account && spend(account.userId, "chat", u.totalTokens),
      turns,
      // The mode contributes an instruction as well as a temperature, so
      // "Fast" and "Deep" are real differences in what is asked for rather
      // than two labels on the same request.
      system: promptFor(true),
      // Used when Google refuses the search tool, or a fallback provider
      // answers. Same prompt, minus the promise of a tool that is not there.
      systemWithoutSearch: promptFor(false),
      // The composer's mode, resolved to a real temperature. An unknown
      // value falls back to balanced rather than being trusted.
      temperature: temperatureFor(mode),
      // Attachments belong to the newest user turn.
      extraParts: attachments.length ? toParts(attachments) : undefined,
      /**
       * Chat can search the web.
       *
       * Google decides per request whether to actually run a search, so a
       * question about syntax costs nothing extra while one about a share
       * price gets a real lookup. Leaving this off is what made "what is X's
       * net worth" answer confidently from a training snapshot.
       *
       * Grounded requests are billed differently by Google, and the fallback
       * providers have no equivalent — an answer served by OpenRouter or xAI
       * comes back without sources rather than with invented ones.
       */
      search: true,
      onSources: (s) => {
        sources = s;
      },
      // Fires when Trove ran the search itself (function calling) rather than
      // Google running it inside the call. Recorded so the answer can still
      // say where it looked, which is the whole point of searching.
      onSearch: (query, provider, count) => {
        searches.push({ query, provider, count });
      },
    });

    const withSources = stream.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        flush(controller) {
          // Google's own grounding reports the pages it used; a search Trove
          // ran reports the query. Either way the reader gets to see that the
          // answer came from a lookup rather than from memory.
          if (sources.length) {
            const lines = sources.map((s) => `- [${s.title}](${s.url})`).join("\n");
            controller.enqueue(
              new TextEncoder().encode(`\n\n---\n**Sources**\n${lines}\n`),
            );
            return;
          }
          if (searches.length) {
            const lines = searches
              .map((s) => `- Searched ${s.provider} for "${s.query}" — ${s.count} results`)
              .join("\n");
            controller.enqueue(new TextEncoder().encode(`\n\n---\n${lines}\n`));
          }
        },
      }),
    );

    return new Response(withSources, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("chat route", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
