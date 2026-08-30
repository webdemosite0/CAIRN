"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { all, one, run, uid } from "@/lib/db";

export interface Reminder {
  id: string;
  title: string;
  note: string;
  due_at: number;
  done: number;
  notified: number;
}

function toPlain(r: Reminder): Reminder {
  return {
    id: String(r.id),
    title: String(r.title),
    note: String(r.note ?? ""),
    due_at: Number(r.due_at),
    done: Number(r.done),
    notified: Number(r.notified),
  };
}

export async function listReminders(): Promise<Reminder[]> {
  const user = await currentUser();
  if (!user) return [];
  const rows = (await all(
    `SELECT * FROM reminders WHERE user_id = ? ORDER BY due_at ASC`,
    [user.id],
  )) as unknown as Reminder[];
  return rows.map(toPlain);
}

/**
 * How many reminders have come due and are still open.
 *
 * Drives the dot on the bell in the top bar. It counts rows, not notifications:
 * a reminder that has passed its time and has not been ticked off is the only
 * thing the app can honestly say is waiting. There is no read/unread state to
 * report, so none is invented.
 */
export async function countDueReminders(): Promise<number> {
  const user = await currentUser();
  if (!user) return 0;
  // This runs in the shell layout, so it is on the path of every page in the
  // app. A dot on a bell is not worth a 500: if the query cannot answer, the
  // honest answer is "nothing to report".
  try {
    const row = await one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM reminders
        WHERE user_id = ? AND done = 0 AND due_at <= ?`,
      [user.id, Date.now()],
    );
    return Number(row?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function createReminder(input: {
  title: string;
  note?: string;
  dueAt: number;
}) {
  const user = await currentUser();
  if (!user) return { error: "Log in to set reminders." };

  const title = input.title.trim();
  if (title.length < 2) return { error: "Give the reminder a title." };
  if (!Number.isFinite(input.dueAt)) return { error: "Pick a valid time." };

  const id = uid("rem");
  await run(
    `INSERT INTO reminders (id, user_id, title, note, due_at, done, notified, created_at)
     VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
    [id, user.id, title, input.note?.trim() ?? "", Math.round(input.dueAt), Date.now()],
  );

  revalidatePath("/reminders");
  return { ok: true, id };
}

export async function markNotified(id: string) {
  const user = await currentUser();
  if (!user) return;
  await run(`UPDATE reminders SET notified = 1 WHERE id = ? AND user_id = ?`, [
    id,
    user.id,
  ]);
}

export async function toggleDone(id: string) {
  const user = await currentUser();
  if (!user) return;
  await run(
    `UPDATE reminders SET done = CASE done WHEN 1 THEN 0 ELSE 1 END
     WHERE id = ? AND user_id = ?`,
    [id, user.id],
  );
  revalidatePath("/reminders");
}

export async function deleteReminder(id: string) {
  const user = await currentUser();
  if (!user) return;
  await run(`DELETE FROM reminders WHERE id = ? AND user_id = ?`, [id, user.id]);
  revalidatePath("/reminders");
}
