import type { NextRequest } from "next/server";
import { streamText, type Source } from "@/lib/ai";
import { toParts, type Attachment } from "@/lib/attachments";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 120;

export const TOOL_PROMPTS: Record<string, string> = {
  docs: `You are Trove's technical writer. Produce a complete, well-structured
document in markdown: a clear title, short intro, logical headings, and concrete
detail. No filler, no "in conclusion". Write the actual content the user asked
for, not a description of it.`,

  sheets: `You are Trove's data analyst. Return a markdown table as the main
output: a header row, correct alignment, and realistic, internally consistent
values. Add any formulas as a short list under the table using spreadsheet
syntax (e.g. =SUM(B2:B13)). Keep prose to two sentences at most.`,

  slides: `You are Trove's presentation designer. Produce a deck.

Format, exactly:
- Start with "# " and the deck title on its own — this becomes the title slide,
  so give it no bullets.
- Then one "## Slide N — Title" per slide, followed by 3-5 bullets starting
  with "- ", then a one-line speaker note prefixed "Note:".

Bullets are phrases, not sentences: under 12 words, no trailing full stop, and
specific rather than generic. Aim for 6-10 slides. No filler slides, no
"Thank you" slide, no markdown tables or code fences.`,

  design: `You are Trove's product designer. Describe the interface concretely:
layout and hierarchy, a specific colour palette with hex values, a type scale
with sizes and weights, spacing rhythm, component states, and responsive
behaviour. Be decisive — pick values, do not offer options.`,

  research: `You are Trove's research analyst. Structure the answer as: a
two-sentence summary, then "## Findings" with substantiated points, then
"## Open questions" listing what you could not determine.

You can search the web. Prefer what you find there to what you remember,
and say when a claim comes from a source rather than from prior knowledge.
Anything you could not verify belongs under Open questions rather than being
stated confidently. Never invent statistics, dates, or citations — the
sources you actually used are listed under your answer, so a citation that
is not among them is visibly wrong.`,

  code: `You are Trove's engineer. Lead with the code in a fenced block with the
correct language tag. It must be complete and runnable — no placeholders, no
"// implementation here". Follow with a short explanation of the important
decisions and any edge cases the caller must handle.`,
};

/**
 * Tools allowed to search the web.
 *
 * Only research. The others take what you gave them and produce something
 * from it — a document, a spreadsheet, some code — and a search on those is
 * latency and cost spent on a question nobody asked. Grounded requests are
 * also billed differently, so this is deliberately a short list.
 */
const SEARCHES = new Set(["research"]);

export async function POST(req: NextRequest) {
  let tool = "";
  let prompt = "";
  let attachments: Attachment[] = [];
  try {
    const body = await req.json();
    tool = String(body?.tool ?? "");
    prompt = String(body?.prompt ?? "").trim();
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const system = TOOL_PROMPTS[tool];
  if (!system) return Response.json({ error: "Unknown tool." }, { status: 400 });
  if (prompt.length < 3 && attachments.length === 0) {
    return Response.json({ error: "Describe what you need." }, { status: 400 });
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

  try {
    // Collected during the stream and appended after it. The client renders
    // markdown, so this needs no protocol of its own.
    let sources: Source[] = [];

    const stream = await streamText({
      onUsage: (u) =>
        account && spend(account.userId, tool, u.totalTokens),
      turns: [{ role: "user", text: prompt || "Work from the attached files." }],
      system,
      temperature: 0.75,
      maxOutputTokens: 4096,
      extraParts: attachments.length ? toParts(attachments) : undefined,
      search: SEARCHES.has(tool),
      onSources: (s) => {
        sources = s;
      },
    });

    const withSources = stream.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        flush(controller) {
          if (!sources.length) return;
          const lines = sources.map((s) => `- [${s.title}](${s.url})`).join("\n");
          controller.enqueue(
            new TextEncoder().encode(`\n\n## Sources\n${lines}\n`),
          );
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
    console.error("tool route", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
