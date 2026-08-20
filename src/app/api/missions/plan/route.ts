import type { NextRequest } from "next/server";
import { generateText } from "@/lib/gemini";
import { currentUser } from "@/lib/auth";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { createMission, setTasks, logEvent, loadMission } from "@/lib/missions";
import { ROLES, roleFor } from "@/lib/roles";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Turns a goal into a mission: a title, and an ordered list of tasks with an
 * agent on each.
 *
 * Planning and execution are separate requests, and execution is one task per
 * request, because a mission takes minutes and a serverless function does not.
 * The client drives the sequence; every step is written to the database as it
 * finishes, so closing the tab loses the tab and not the work.
 */

const ROLE_MENU = ROLES.map((r) => `- ${r.id}: ${r.name}. ${r.summary}`).join("\n");

const SYSTEM = `You plan work for Trove, an AI team.

Given a goal, break it into 3-6 tasks and assign each to one agent.

Agents available:
${ROLE_MENU}

Reply with ONE JSON object and nothing else — no prose, no markdown fence:

{
  "title": "Short name for this mission, under 60 characters",
  "tasks": [
    { "role": "researcher", "title": "What this agent will do, one line" }
  ]
}

Rules:
- 3 to 6 tasks, ordered so each builds on the ones before it.
- "role" must be one of the ids listed above, exactly.
- Only include an agent the goal actually needs. A goal that is pure research
  needs no engineer, and adding one produces filler.
- Task titles describe the work, not the agent. "Find who else sells this"
  rather than "Researcher does research".`;

/** Pulls the first JSON object out of a reply, tolerating fences and prose. */
function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Coerces the reply into a plan, dropping anything unusable.
 *
 * A task naming an agent that does not exist is discarded rather than
 * defaulted: silently reassigning it would run the wrong agent and the user
 * would have no way to tell. Ending with no tasks is the one failure worth
 * reporting, because there would be nothing to execute.
 */
function normalise(data: unknown, goal: string) {
  if (!data || typeof data !== "object") return null;
  const d = data as { title?: unknown; tasks?: unknown };

  const title =
    typeof d.title === "string" && d.title.trim()
      ? d.title.trim().slice(0, 80)
      : goal.slice(0, 80);

  const raw = Array.isArray(d.tasks) ? d.tasks : [];
  const tasks: { role: string; title: string }[] = [];

  for (const t of raw.slice(0, 6)) {
    if (!t || typeof t !== "object") continue;
    const role = roleFor((t as { role?: unknown }).role);
    const label = (t as { title?: unknown }).title;
    if (!role) continue;
    if (typeof label !== "string" || !label.trim()) continue;
    tasks.push({ role: role.id, title: label.trim().slice(0, 140) });
  }

  if (!tasks.length) return null;
  return { title, tasks };
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });

  let goal = "";
  try {
    const body = await req.json();
    goal = String(body?.goal ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (goal.length < 8) {
    return Response.json(
      { error: "Say a little more about what you want done." },
      { status: 400 },
    );
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

  let reply: string;
  try {
    reply = await generateText({
      turns: [{ role: "user", text: goal }],
      system: SYSTEM,
      temperature: 0.4,
      maxOutputTokens: 1024,
      onUsage: (u) => account && spend(account.userId, "team", u.totalTokens),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("mission plan", message);
    return Response.json({ error: message }, { status: 502 });
  }

  const plan = normalise(extractJson(reply), goal);
  if (!plan) {
    // Logged because otherwise this failure is invisible: generateText only
    // throws when every model refused the request, so a reply that came back
    // fine and simply was not a plan left no trace anywhere.
    console.error(
      "mission plan: unusable reply —",
      reply.trim() ? JSON.stringify(reply).slice(0, 400) : "(empty)",
    );

    // An empty reply is not the user rephrasing their way out. It means the
    // model returned no content — a safety block, or a quota that ran out
    // between the check and the call — and telling someone to describe their
    // goal better would send them to fix the one thing that is not wrong.
    if (!reply.trim()) {
      return Response.json(
        {
          error:
            "The model returned nothing. That is usually a quota limit or a " +
            "safety block rather than a problem with your goal — try again in a moment.",
        },
        { status: 502 },
      );
    }

    return Response.json(
      { error: "Trove could not turn that into a plan. Try describing the outcome you want." },
      { status: 422 },
    );
  }

  // Only written once there is a real plan, so a failed planning attempt does
  // not leave an empty mission on the board.
  const mission = await createMission(user.id, goal, plan.title);
  await setTasks(mission.id, plan.tasks);
  await logEvent(
    mission.id,
    "mission.planned",
    "",
    `Planned ${plan.tasks.length} tasks across ${new Set(plan.tasks.map((t) => t.role)).size} agents.`,
  );

  const full = await loadMission(user.id, mission.id);
  return Response.json(full, { headers: { "cache-control": "no-store" } });
}
