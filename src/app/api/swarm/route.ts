import type { NextRequest } from "next/server";
import { generateText } from "@/lib/ai";
import { remember } from "@/lib/recents";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 120;

export const SWARM_ROLES = [
  {
    id: "architect",
    name: "Product Architect",
    accent: "#3b82f6",
    brief: "Scope the work: what to build, the data model, and the build order.",
  },
  {
    id: "designer",
    name: "UX Designer",
    accent: "#a78bfa",
    brief: "Describe the screens, states, and flow. No code.",
  },
  {
    id: "engineer",
    name: "Engineer",
    accent: "#22d3ee",
    brief: "Give the key implementation with real, runnable code.",
  },
  {
    id: "qa",
    name: "QA Engineer",
    accent: "#34d399",
    brief: "List the cases that must pass and the ones most likely to break.",
  },
];

export async function POST(req: NextRequest) {
  let task = "";
  let roleId = "";
  let context = "";

  try {
    const body = await req.json();
    task = String(body?.task ?? "").trim();
    roleId = String(body?.role ?? "");
    context = String(body?.context ?? "");
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const role = SWARM_ROLES.find((r) => r.id === roleId);
  if (!role) return Response.json({ error: "Unknown role." }, { status: 400 });
  if (task.length < 4) {
    return Response.json({ error: "Describe the task." }, { status: 400 });
  }

  const system = `You are the ${role.name} on a Trove swarm working one task together.

${role.brief}

Answer only for your own discipline — the other agents cover theirs. Be concrete
and brief: at most ~160 words, or one focused code block. No preamble, no
restating the task.`;

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
    const text = await generateText({
      onUsage: (u) => account && spend(account.userId, "team", u.totalTokens),
      turns: [
        {
          role: "user",
          text: context
            ? `Task: ${task}\n\nWhat the team has produced so far:\n${context}\n\nNow give your part.`
            : `Task: ${task}\n\nGive your part.`,
        },
      ],
      system,
      temperature: 0.8,
      maxOutputTokens: 1024,
    });

    // The page fires one request per role for the same task — only the first
    // should create the history entry, and `remember` de-duplicates the rest.
    void remember("team", task);

    return Response.json({ role: role.id, name: role.name, text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("swarm", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
