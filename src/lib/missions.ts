import "server-only";
import { all, one, run, uid, num, str } from "@/lib/db";

/**
 * Missions: one piece of work given to Trove, from goal to result.
 *
 * Every screen in the mission UI reads from here, which is deliberate — it
 * means a mission board can only ever show work that actually ran. There is no
 * path in this module that invents a task or a timestamp.
 *
 * The lifecycle is one direction with two exits:
 *
 *   planning → running → reviewing → completed
 *                 ↓
 *              waiting  (needs a human: an approval, an answer)
 *                 ↓
 *               failed
 *
 * Nothing here executes anything. Running the work belongs to the orchestrator;
 * this module records what it did, so the record survives a page reload, a
 * redeploy, and the browser being closed halfway through.
 */

export const MISSION_STATUSES = [
  "planning",
  "running",
  "waiting",
  "reviewing",
  "completed",
  "failed",
] as const;

export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const TASK_STATUSES = ["waiting", "working", "done", "failed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Mission {
  id: string;
  goal: string;
  title: string;
  status: MissionStatus;
  createdAt: number;
  updatedAt: number;
}

export interface MissionTask {
  id: string;
  seq: number;
  /** Which agent owns it — an id from the agent library. */
  role: string;
  title: string;
  status: TaskStatus;
  output: string;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface MissionEvent {
  id: string;
  at: number;
  kind: string;
  actor: string;
  text: string;
}

/** Never trust a status off the wire or out of an old row. */
function asMissionStatus(v: unknown): MissionStatus {
  return MISSION_STATUSES.includes(v as MissionStatus)
    ? (v as MissionStatus)
    : "planning";
}

function asTaskStatus(v: unknown): TaskStatus {
  return TASK_STATUSES.includes(v as TaskStatus) ? (v as TaskStatus) : "waiting";
}

function toMission(r: Record<string, unknown>): Mission {
  return {
    id: str(r.id),
    goal: str(r.goal),
    title: str(r.title),
    status: asMissionStatus(r.status),
    createdAt: num(r.created_at),
    updatedAt: num(r.updated_at),
  };
}

/* ---------------- writing ---------------- */

export async function createMission(
  userId: string,
  goal: string,
  title = "",
): Promise<Mission> {
  const id = uid("msn");
  const now = Date.now();

  await run(
    `INSERT INTO missions (id, user_id, goal, title, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'planning', ?, ?)`,
    [id, userId, goal, title || goal.slice(0, 80), now, now],
  );

  await logEvent(id, "mission.created", "", "Mission created.");
  return { id, goal, title: title || goal.slice(0, 80), status: "planning", createdAt: now, updatedAt: now };
}

export async function setMissionStatus(id: string, status: MissionStatus) {
  await run(`UPDATE missions SET status = ?, updated_at = ? WHERE id = ?`, [
    status,
    Date.now(),
    id,
  ]);
}

/** Replaces the plan wholesale. Used once, when planning finishes. */
export async function setTasks(
  missionId: string,
  tasks: { role: string; title: string }[],
) {
  await run(`DELETE FROM mission_tasks WHERE mission_id = ?`, [missionId]);
  for (let i = 0; i < tasks.length; i++) {
    await run(
      `INSERT INTO mission_tasks (id, mission_id, seq, role, title, status)
       VALUES (?, ?, ?, ?, ?, 'waiting')`,
      [uid("tsk"), missionId, i, tasks[i].role, tasks[i].title],
    );
  }
}

export async function startTask(taskId: string) {
  await run(
    `UPDATE mission_tasks SET status = 'working', started_at = ? WHERE id = ?`,
    [Date.now(), taskId],
  );
}

export async function finishTask(taskId: string, output: string, ok = true) {
  await run(
    `UPDATE mission_tasks SET status = ?, output = ?, finished_at = ? WHERE id = ?`,
    [ok ? "done" : "failed", output, Date.now(), taskId],
  );
}

/** Append-only. The timeline is a record, and a log you can edit is not one. */
export async function logEvent(
  missionId: string,
  kind: string,
  actor: string,
  text: string,
) {
  await run(
    `INSERT INTO mission_events (id, mission_id, at, kind, actor, text)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [uid("evt"), missionId, Date.now(), kind, actor, text],
  );
}

/* ---------------- reading ---------------- */

/** Scoped by user on every read, so an id cannot be guessed into someone else's work. */
export async function loadMission(
  userId: string,
  id: string,
): Promise<{ mission: Mission; tasks: MissionTask[]; events: MissionEvent[] } | null> {
  const row = await one(`SELECT * FROM missions WHERE id = ? AND user_id = ?`, [
    id,
    userId,
  ]);
  if (!row) return null;

  const taskRows = await all(
    `SELECT * FROM mission_tasks WHERE mission_id = ? ORDER BY seq`,
    [id],
  );
  const eventRows = await all(
    `SELECT * FROM mission_events WHERE mission_id = ? ORDER BY at`,
    [id],
  );

  return {
    mission: toMission(row),
    tasks: taskRows.map((t) => ({
      id: str(t.id),
      seq: num(t.seq),
      role: str(t.role),
      title: str(t.title),
      status: asTaskStatus(t.status),
      output: str(t.output),
      startedAt: t.started_at == null ? null : num(t.started_at),
      finishedAt: t.finished_at == null ? null : num(t.finished_at),
    })),
    events: eventRows.map((e) => ({
      id: str(e.id),
      at: num(e.at),
      kind: str(e.kind),
      actor: str(e.actor),
      text: str(e.text),
    })),
  };
}

export async function listMissions(userId: string, limit = 20): Promise<Mission[]> {
  const rows = await all(
    `SELECT * FROM missions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map(toMission);
}

/** Counts for the dashboard. One query rather than four round trips. */
export async function missionCounts(userId: string) {
  const row = await one(
    `SELECT
       COUNT(*)                                                   AS total,
       SUM(CASE WHEN status IN ('planning','running','waiting','reviewing') THEN 1 ELSE 0 END) AS active,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)      AS completed
     FROM missions WHERE user_id = ?`,
    [userId],
  );
  return {
    total: num(row?.total),
    active: num(row?.active),
    completed: num(row?.completed),
  };
}
