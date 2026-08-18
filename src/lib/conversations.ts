import "server-only";

import { one, all, batch, uid, num, str } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import type { RecentKind } from "@/lib/recents";

/**
 * Saved conversations.
 *
 * The Recents strip used to store only the prompt, so clicking one re-ran it —
 * and a model asked the same question twice does not give the same answer, so
 * people lost the reply they wanted to come back to. These rows hold the real
 * exchange; reopening replays them and never calls the model.
 */

export interface StoredMessage {
  role: "user" | "model";
  text: string;
}

export interface Conversation {
  id: string;
  kind: RecentKind;
  title: string;
  messages: StoredMessage[];
  updatedAt: number;
}

/** Where a saved conversation of each kind is reopened. */
export function hrefFor(kind: RecentKind, id: string): string {
  const path: Partial<Record<RecentKind, string>> = {
    chat: "/chat",
    docs: "/documents",
    sheets: "/spreadsheets",
    slides: "/slides",
    design: "/design",
    research: "/research",
    code: "/code",
    team: "/team",
  };
  return `${path[kind] ?? "/"}?c=${encodeURIComponent(id)}`;
}

function clean(title: string) {
  const t = title.replace(/\s+/g, " ").trim();
  return t.length > 90 ? `${t.slice(0, 89)}…` : t;
}

/**
 * Creates or replaces a conversation, and keeps the matching Recents row in
 * step so the strip always points at something that can actually be reopened.
 *
 * Messages are rewritten wholesale rather than appended: the client always
 * sends the full thread, and a full replace cannot drift out of order or
 * duplicate a turn if a request is retried.
 */
export async function saveConversation({
  id,
  kind,
  title,
  messages,
}: {
  id?: string | null;
  kind: RecentKind;
  title: string;
  messages: StoredMessage[];
}): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;
  if (!messages.length) return null;

  const text = clean(title || messages[0]?.text || "Untitled");
  const now = Date.now();

  let convoId = id ?? null;

  if (convoId) {
    // Scoped by user_id so an id from somewhere else cannot be written to.
    const owned = await one(
      `SELECT id FROM conversations WHERE id = ? AND user_id = ?`,
      [convoId, user.id],
    );
    if (!owned) convoId = null;
  }

  const writes: { sql: string; args: (string | number)[] }[] = [];

  if (convoId) {
    writes.push({
      sql: `UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?`,
      args: [text, now, convoId],
    });
    writes.push({
      sql: `DELETE FROM messages WHERE conversation_id = ?`,
      args: [convoId],
    });
  } else {
    convoId = uid("conv");
    writes.push({
      sql: `INSERT INTO conversations (id, user_id, kind, title, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [convoId, user.id, kind, text, now, now],
    });
  }

  messages.forEach((m, i) => {
    writes.push({
      sql: `INSERT INTO messages (id, conversation_id, role, text, seq, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [uid("msg"), convoId as string, m.role, m.text, i, now],
    });
  });

  // Keep Recents pointing at this conversation. Matching on href rather than
  // title means renaming a thread moves the row instead of adding a second one.
  const href = hrefFor(kind, convoId);
  writes.push({
    sql: `DELETE FROM recents WHERE user_id = ? AND kind = ? AND href = ?`,
    args: [user.id, kind, href],
  });
  writes.push({
    sql: `INSERT INTO recents (id, user_id, kind, title, href, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [uid("rec"), user.id, kind, text, href, now],
  });

  // Atomic: replacing the message set and rewriting the recents row must not
  // be observable half-done, or a reader sees a thread with no messages.
  await batch(writes);

  return convoId;
}

/** Loads a conversation, scoped to the person asking. */
export async function loadConversation(id: string): Promise<Conversation | null> {
  const user = await currentUser();
  if (!user || !id) return null;

  const head = await one(
    `SELECT id, kind, title, updated_at FROM conversations
      WHERE id = ? AND user_id = ?`,
    [id, user.id],
  );

  if (!head) return null;

  const rows = await all(
    `SELECT role, text FROM messages WHERE conversation_id = ? ORDER BY seq ASC`,
    [id],
  );

  return {
    id: str(head.id),
    kind: str(head.kind) as RecentKind,
    title: str(head.title),
    updatedAt: num(head.updated_at),
    messages: rows.map((r) => ({
      role: str(r.role) === "user" ? "user" : "model",
      text: str(r.text),
    })),
  };
}
