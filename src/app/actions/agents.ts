"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { all, run, uid } from "@/lib/db";

export interface AgentRow {
  id: string;
  name: string;
  role: string;
  instructions: string;
  tools: string;
  accent: string;
  created_at: number;
}

export async function listAgents(): Promise<AgentRow[]> {
  const user = await currentUser();
  if (!user) return [];

  const rows = (await all(
    `SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC`,
    [user.id],
  )) as unknown as AgentRow[];

  // Client components need plain objects.
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    role: String(r.role),
    instructions: String(r.instructions),
    tools: String(r.tools),
    accent: String(r.accent),
    created_at: Number(r.created_at),
  }));
}

export interface AgentFormState {
  error?: string;
  ok?: boolean;
}

export async function createAgent(
  _prev: AgentFormState,
  form: FormData,
): Promise<AgentFormState> {
  const user = await currentUser();
  if (!user) return { error: "Log in to create an agent." };

  const name = String(form.get("name") ?? "").trim();
  const role = String(form.get("role") ?? "").trim();
  const instructions = String(form.get("instructions") ?? "").trim();
  const accent = String(form.get("accent") ?? "#3b82f6");
  const tools = form.getAll("tools").map(String);

  if (name.length < 2) return { error: "Give the agent a name." };
  if (role.length < 2) return { error: "Describe the agent's role." };
  if (instructions.length < 20) {
    return { error: "Instructions need at least 20 characters — be specific." };
  }

  await run(
    `INSERT INTO agents (id, user_id, name, role, instructions, tools, accent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uid("agt"),
      user.id,
      name,
      role,
      instructions,
      JSON.stringify(tools),
      accent,
      Date.now(),
    ],
  );

  revalidatePath("/agents");
  return { ok: true };
}

export async function deleteAgent(id: string) {
  const user = await currentUser();
  if (!user) return;
  await run(`DELETE FROM agents WHERE id = ? AND user_id = ?`, [id, user.id]);
  revalidatePath("/agents");
}
