import type { NextRequest } from "next/server";
import { streamText, type Turn } from "@/lib/ai";
import { currentUser } from "@/lib/auth";
import { one, str } from "@/lib/db";
import { toParts, type Attachment } from "@/lib/attachments";
import { OBEY_FORMAT, safeTimeZone, situation } from "@/lib/context";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Log in to talk to your agents." }, { status: 401 });
  }

  let agentId = "";
  let turns: Turn[] = [];
  let attachments: Attachment[] = [];
  let timeZone = "UTC";
  try {
    const body = await req.json();
    agentId = String(body?.agentId ?? "");
    turns = Array.isArray(body?.messages) ? body.messages : [];
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    timeZone = safeTimeZone(body?.timeZone);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const row = await one(`SELECT * FROM agents WHERE id = ? AND user_id = ?`, [
    agentId,
    user.id,
  ]);
  const agent = row
    ? {
        name: str(row.name),
        role: str(row.role),
        instructions: str(row.instructions),
        tools: str(row.tools),
      }
    : undefined;

  if (!agent) {
    return Response.json({ error: "Agent not found." }, { status: 404 });
  }
  if (turns.length === 0) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
  }

  let tools: string[] = [];
  try {
    tools = JSON.parse(agent.tools);
  } catch {
    tools = [];
  }

  const system = `You are ${agent.name}, a specialist agent on a Trove engineering team.

Your role: ${agent.role}

Your operating instructions:
${agent.instructions}

${
  tools.length
    ? `Capabilities you were configured with: ${tools.join(", ")}. You cannot
actually call these yet — if a request needs one, say precisely what you would
run and what you would need, rather than pretending you executed it.`
    : `You have no tool access. Do not claim to have run anything.`
}

Stay in role. Be concrete and brief. Never invent results you did not compute.

${OBEY_FORMAT}

${situation({ timeZone, canSearch: false })}`;

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
        account && spend(account.userId, "agent", u.totalTokens),
      turns,
      system,
      temperature: 0.75,
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
    console.error("agent route", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
