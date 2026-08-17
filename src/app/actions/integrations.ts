"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { one, all, run } from "@/lib/db";
import { serviceById } from "@/lib/services";

export async function listConnected(): Promise<string[]> {
  const user = await currentUser();
  if (!user) return [];
  const rows = await all(`SELECT service FROM integrations WHERE user_id = ?`, [
    user.id,
  ]);
  return rows.map((r) => String(r.service));
}

export async function toggleIntegration(serviceId: string) {
  const user = await currentUser();
  if (!user) return { error: "Log in to manage integrations." };
  if (!serviceById(serviceId)) return { error: "Unknown service." };

  const existing = await one(
    `SELECT 1 AS present FROM integrations WHERE user_id = ? AND service = ?`,
    [user.id, serviceId],
  );

  if (existing) {
    await run(`DELETE FROM integrations WHERE user_id = ? AND service = ?`, [
      user.id,
      serviceId,
    ]);
  } else {
    await run(
      `INSERT INTO integrations (user_id, service, connected_at) VALUES (?, ?, ?)`,
      [user.id, serviceId, Date.now()],
    );
  }

  revalidatePath("/integrations");
  return { ok: true };
}
