"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { db, uid } from "@/lib/db";

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
  const rows = db()
    .prepare(`SELECT * FROM reminders WHERE user_id = ? ORDER BY due_at ASC`)
    .all(user.id) as unknown as Reminder[];
  return rows.map(toPlain);
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
  db()
    .prepare(
      `INSERT INTO reminders (id, user_id, title, note, due_at, done, notified, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
    )
    .run(id, user.id, title, input.note?.trim() ?? "", Math.round(input.dueAt), Date.now());

  revalidatePath("/reminders");
  return { ok: true, id };
}

export async function markNotified(id: string) {
  const user = await currentUser();
  if (!user) return;
  db()
    .prepare(`UPDATE reminders SET notified = 1 WHERE id = ? AND user_id = ?`)
    .run(id, user.id);
}

export async function toggleDone(id: string) {
  const user = await currentUser();
  if (!user) return;
  db()
    .prepare(
      `UPDATE reminders SET done = CASE done WHEN 1 THEN 0 ELSE 1 END
       WHERE id = ? AND user_id = ?`,
    )
    .run(id, user.id);
  revalidatePath("/reminders");
}

export async function deleteReminder(id: string) {
  const user = await currentUser();
  if (!user) return;
  db().prepare(`DELETE FROM reminders WHERE id = ? AND user_id = ?`).run(id, user.id);
  revalidatePath("/reminders");
}
