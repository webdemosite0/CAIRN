import type { NextRequest } from "next/server";
import { generateText, type Source } from "@/lib/ai";
import { currentUser } from "@/lib/auth";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import {
  loadMission,
  startTask,
  finishTask,
  logEvent,
  setMissionStatus,
} from "@/lib/missions";
import { roleFor } from "@/lib/roles";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * Runs one task of a mission.
 *
 * One task per request, because a whole mission takes minutes and a serverless
 * function is cut off long before that. The client asks for the next task each
 * time; everything is written as it completes, so the record is correct even if
 * the browser goes away mid-run.
 *
 * Each agent sees what the agents before it produced. That is the difference
 * between a team and six separate chats: the strategist reads the research, the
 * engineer reads the design. Earlier outputs are truncated rather than sent
 * whole — by task five the context would otherwise be most of the budget, and
 * the tail of a long answer matters less than its conclusion.
 */

/** How much of each earlier task to carry forward. */
const CONTEXT_CHARS = 1200;

function contextFrom(
  tasks: { title: string; role: string; output: string; status: string }[],
) {
  const done = tasks.filter((t) => t.status === "done" && t.output.trim());
  if (!done.length) return "";

  const parts = done.map((t) => {
    const body =
      t.output.length > CONTEXT_CHARS
        ? `${t.output.slice(0, CONTEXT_CHARS)}\n…(truncated)`
        : t.output;
    return `### ${roleFor(t.role)?.name ?? t.role} — ${t.title}\n${body}`;
  });

  return `\n\nWork already done on this mission:\n\n${parts.join("\n\n")}`;
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });

  let missionId = "";
  let taskId = "";
  try {
    const body = await req.json();
    missionId = String(body?.missionId ?? "");
    taskId = String(body?.taskId ?? "");
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Scoped by user, so a guessed mission id reaches nothing.
  const full = await loadMission(user.id, missionId);
  if (!full) return Response.json({ error: "Mission not found." }, { status: 404 });

  const task = full.tasks.find((t) => t.id === taskId);
  if (!task) return Response.json({ error: "Task not found." }, { status: 404 });
  if (task.status === "done") {
    return Response.json({ error: "That task already ran." }, { status: 409 });
  }

  const role = roleFor(task.role);
  if (!role) {
    await finishTask(task.id, "", false);
    await logEvent(missionId, "task.failed", task.role, `No such agent: ${task.role}.`);
    return Response.json({ error: "That mission names an agent that no longer exists." }, { status: 422 });
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

  await setMissionStatus(missionId, "running");
  await startTask(task.id);
  await logEvent(missionId, "task.started", role.id, `${role.name}: ${task.title}`);

  const system = `${role.brief}

You are one agent on a Trove team working toward this goal:

${full.mission.goal}

Your task: ${task.title}

Answer for your own part only — the other agents cover theirs. Be concrete and
usable by the agent that comes after you. Do not restate the goal back.`;

  let text = "";
  let sources: Source[] = [];

  try {
    text = await generateText({
      turns: [
        {
          role: "user",
          text: `${task.title}${contextFrom(full.tasks)}`,
        },
      ],
      system,
      temperature: 0.6,
      maxOutputTokens: 2048,
      search: role.search,
      onSources: (s) => {
        sources = s;
      },
      onUsage: (u) => account && spend(account.userId, "team", u.totalTokens),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("mission step", message);

    // Recorded as a real failure rather than left "working" forever, so the
    // board reflects what happened and the task can be retried.
    await finishTask(task.id, "", false);
    await logEvent(missionId, "task.failed", role.id, `${role.name} could not finish: ${message}`);
    await setMissionStatus(missionId, "failed");
    return Response.json({ error: message }, { status: 502 });
  }

  const output = sources.length
    ? `${text}\n\n## Sources\n${sources.map((s) => `- [${s.title}](${s.url})`).join("\n")}`
    : text;

  await finishTask(task.id, output, true);
  await logEvent(missionId, "task.finished", role.id, `${role.name} finished: ${task.title}`);

  // The mission is done when its last task is. Read back rather than counting
  // locally: another request may have finished a task since this one started.
  const after = await loadMission(user.id, missionId);
  const remaining = after?.tasks.filter((t) => t.status !== "done" && t.status !== "failed") ?? [];
  if (!remaining.length) {
    await setMissionStatus(missionId, "completed");
    await logEvent(missionId, "mission.completed", "", "All tasks finished.");
  }

  const fresh = await loadMission(user.id, missionId);
  return Response.json(fresh, { headers: { "cache-control": "no-store" } });
}
