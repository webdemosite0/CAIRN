import type { NextRequest } from "next/server";
import { generateText } from "@/lib/ai";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 60;

export interface Question {
  id: string;
  label: string;
  hint: string;
  /** Suggestions the user can accept with one tap. Free text is always allowed. */
  options: string[];
}

/**
 * The few things worth asking before planning.
 *
 * Two are fixed because the answer is always needed and a model should not
 * spend tokens rediscovering that a shop needs a name. The rest are generated
 * from the idea, so a barber gets asked about services and a shop gets asked
 * about catalogue size.
 */
const FIXED: Question[] = [
  {
    id: "name",
    label: "What is it called?",
    hint: "The name shown in the header and the page title.",
    options: [],
  },
  {
    id: "theme",
    label: "How should it feel?",
    hint: "Drives the palette, type and spacing.",
    options: [
      "Warm and editorial",
      "Clean and minimal",
      "Bold and colourful",
      "Dark and premium",
      "Playful and rounded",
    ],
  },
];

const SYSTEM = `You write the clarifying questions a designer would ask before
building someone's website. Reply with ONE JSON array and nothing else:

[
  {
    "id": "short_snake_case",
    "label": "the question, under 8 words, ending in ?",
    "hint": "why it matters, under 12 words",
    "options": ["3-5 tappable answers, each under 5 words"]
  }
]

Exactly 3 questions. They must be specific to THIS idea — never ask for the
name or the visual style, those are already covered. Ask about things that
change what gets built: what the visitor is meant to do, what content exists,
what must appear above the fold, which of several plausible scopes is wanted.
Every question needs options, so it can be answered with one tap.`;

function parseQuestions(raw: string): Question[] {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start === -1 || end <= start) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(body.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .slice(0, 3)
    .map((q, i) => {
      const o = (q ?? {}) as Record<string, unknown>;
      const label = typeof o.label === "string" ? o.label.trim() : "";
      return {
        id:
          typeof o.id === "string" && o.id.trim()
            ? o.id.trim().replace(/[^a-z0-9_]/gi, "_").slice(0, 32)
            : `q${i + 1}`,
        label,
        hint: typeof o.hint === "string" ? o.hint.trim() : "",
        options: Array.isArray(o.options)
          ? o.options
              .filter((x): x is string => typeof x === "string" && Boolean(x.trim()))
              .map((x) => x.trim())
              .slice(0, 5)
          : [],
      };
    })
    .filter((q) => q.label);
}

export async function POST(req: NextRequest) {
  let idea = "";
  try {
    const body = await req.json();
    idea = String(body?.idea ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (idea.length < 3) {
    return Response.json({ error: "Describe what to build." }, { status: 400 });
  }

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
    const raw = await generateText({
      onUsage: (u) => account && spend(account.userId, "site", u.totalTokens),
      turns: [{ role: "user", text: `Idea: ${idea}` }],
      system: SYSTEM,
      temperature: 0.5,
      maxOutputTokens: 1024,
    });

    const generated = parseQuestions(raw);

    // A reply that parses to nothing is a quiet failure: the call succeeded, so
    // no catch fires, and the user simply gets fewer questions with no reason
    // given. Report it rather than letting it look like the intended output.
    if (!generated.length) {
      console.warn(
        `builder/questions: model returned ${raw.length} chars but no usable questions`,
      );
      return Response.json({
        questions: FIXED,
        degraded: true,
        reason: "the model's extra questions could not be read",
      });
    }

    return Response.json({ questions: [...FIXED, ...generated] });
  } catch (e) {
    // Questions are a convenience, not a gate. If the model is unavailable the
    // build should still be possible, so fall back to the fixed pair rather
    // than blocking on an optional refinement.
    console.error("builder/questions", e instanceof Error ? e.message : e);
    return Response.json({ questions: FIXED, degraded: true });
  }
}
