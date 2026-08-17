import type { NextRequest } from "next/server";
import { streamText } from "@/lib/gemini";
import { toParts, type Attachment } from "@/lib/attachments";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 120;

export const TOOL_PROMPTS: Record<string, string> = {
  docs: `You are CAIRN's technical writer. Produce a complete, well-structured
document in markdown: a clear title, short intro, logical headings, and concrete
detail. No filler, no "in conclusion". Write the actual content the user asked
for, not a description of it.`,

  sheets: `You are CAIRN's data analyst. Return a markdown table as the main
output: a header row, correct alignment, and realistic, internally consistent
values. Add any formulas as a short list under the table using spreadsheet
syntax (e.g. =SUM(B2:B13)). Keep prose to two sentences at most.`,

  slides: `You are CAIRN's presentation designer. Produce a deck outline. Use
"## Slide N — Title" for each slide, then 3-5 tight bullets, then a one-line
speaker note prefixed "Note:". Aim for 6-10 slides. No filler slides.`,

  design: `You are CAIRN's product designer. Describe the interface concretely:
layout and hierarchy, a specific colour palette with hex values, a type scale
with sizes and weights, spacing rhythm, component states, and responsive
behaviour. Be decisive — pick values, do not offer options.`,

  research: `You are CAIRN's research analyst. Structure the answer as: a
two-sentence summary, then "## Findings" with substantiated points, then
"## Open questions" listing what you could not determine. You have no web
access, so distinguish clearly between what you know and what would need
verification. Never invent statistics, dates, or citations.`,

  code: `You are CAIRN's engineer. Lead with the code in a fenced block with the
correct language tag. It must be complete and runnable — no placeholders, no
"// implementation here". Follow with a short explanation of the important
decisions and any edge cases the caller must handle.`,
};

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
    const stream = await streamText({
      onUsage: (u) =>
        account && spend(account.userId, tool, u.totalTokens),
      turns: [{ role: "user", text: prompt || "Work from the attached files." }],
      system,
      temperature: 0.75,
      maxOutputTokens: 4096,
      extraParts: attachments.length ? toParts(attachments) : undefined,
    });

    return new Response(stream, {
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
