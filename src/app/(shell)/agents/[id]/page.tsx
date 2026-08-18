import { notFound } from "next/navigation";
import { AgentChat } from "./agent-chat";
import { currentUser } from "@/lib/auth";
import { one, str, num } from "@/lib/db";
import { listRecents } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";
import type { AgentRow } from "@/app/actions/agents";

export const metadata = { title: "Agent" };

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const [{ id }, { c }] = await Promise.all([params, searchParams]);

  const user = await currentUser();
  if (!user) notFound();

  // Scoped by user_id: an agent id from somewhere else must not be readable.
  const row = await one(
    `SELECT * FROM agents WHERE id = ? AND user_id = ?`,
    [id, user.id],
  );
  if (!row) notFound();

  const agent: AgentRow = {
    id: str(row.id),
    name: str(row.name),
    role: str(row.role),
    instructions: str(row.instructions),
    tools: str(row.tools),
    accent: str(row.accent),
    created_at: num(row.created_at),
  };

  const [recents, saved] = await Promise.all([
    listRecents("agent"),
    c ? loadConversation(c) : Promise.resolve(null),
  ]);

  return (
    <AgentChat
      agent={agent}
      recents={recents.filter((r) => r.title.startsWith(`${agent.name}:`))}
      restored={saved ? { id: saved.id, messages: saved.messages } : null}
      key={saved?.id ?? "new"}
    />
  );
}
