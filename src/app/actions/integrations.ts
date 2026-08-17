"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { serviceById } from "@/lib/services";

export async function listConnected(): Promise<string[]> {
  const user = await currentUser();
  if (!user) return [];
  const rows = db()
    .prepare(`SELECT service FROM integrations WHERE user_id = ?`)
    .all(user.id) as unknown as { service: string }[];
  return rows.map((r) => String(r.service));
}

export async function toggleIntegration(serviceId: string) {
  const user = await currentUser();
  if (!user) return { error: "Log in to manage integrations." };
  if (!serviceById(serviceId)) return { error: "Unknown service." };

  const existing = db()
    .prepare(`SELECT 1 FROM integrations WHERE user_id = ? AND service = ?`)
    .get(user.id, serviceId);

  if (existing) {
    db()
      .prepare(`DELETE FROM integrations WHERE user_id = ? AND service = ?`)
      .run(user.id, serviceId);
  } else {
    db()
      .prepare(
        `INSERT INTO integrations (user_id, service, connected_at) VALUES (?, ?, ?)`,
      )
      .run(user.id, serviceId, Date.now());
  }

  revalidatePath("/integrations");
  return { ok: true };
}
