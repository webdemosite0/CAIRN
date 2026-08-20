import type { NextRequest } from "next/server";
import { streamText, type Turn } from "@/lib/ai";
import { toParts, type Attachment } from "@/lib/attachments";
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

  try {
    const body = await req.json();
    turns = Array.isArray(body?.messages) ? body.messages : [];
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    mode = body?.mode;
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

  try {
    const stream = await streamText({
      onUsage: (u) =>
        account && spend(account.userId, "chat", u.totalTokens),
      turns,
      // The mode contributes an instruction as well as a temperature, so
      // "Fast" and "Deep" are real differences in what is asked for rather
      // than two labels on the same request.
      system: [SYSTEM, hintFor(mode)].filter(Boolean).join("\n\n"),
      // The composer's mode, resolved to a real temperature. An unknown
      // value falls back to balanced rather than being trusted.
      temperature: temperatureFor(mode),
      // Attachments belong to the newest user turn.
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
    console.error("chat route", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
