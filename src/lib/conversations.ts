import "server-only";

import { db, uid } from "@/lib/db";
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
    chat: "/",
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
  const d = db();

  let convoId = id ?? null;

  if (convoId) {
    // Scoped by user_id so an id from somewhere else cannot be written to.
    const owned = d
      .prepare(`SELECT id FROM conversations WHERE id = ? AND user_id = ?`)
      .get(convoId, user.id);
    if (!owned) convoId = null;
  }

  if (convoId) {
    d.prepare(`UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?`).run(
      text,
      now,
      convoId,
    );
    d.prepare(`DELETE FROM messages WHERE conversation_id = ?`).run(convoId);
  } else {
    convoId = uid("conv");
    d.prepare(
      `INSERT INTO conversations (id, user_id, kind, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(convoId, user.id, kind, text, now, now);
  }

  const insert = d.prepare(
    `INSERT INTO messages (id, conversation_id, role, text, seq, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  messages.forEach((m, i) => {
    insert.run(uid("msg"), convoId, m.role, m.text, i, now);
  });

  // Keep Recents pointing at this conversation. Matching on href rather than
  // title means renaming a thread moves the row instead of adding a second one.
  const href = hrefFor(kind, convoId);
  d.prepare(`DELETE FROM recents WHERE user_id = ? AND kind = ? AND href = ?`).run(
    user.id,
    kind,
    href,
  );
  d.prepare(
    `INSERT INTO recents (id, user_id, kind, title, href, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(uid("rec"), user.id, kind, text, href, now);

  return convoId;
}

/** Loads a conversation, scoped to the person asking. */
export async function loadConversation(id: string): Promise<Conversation | null> {
  const user = await currentUser();
  if (!user || !id) return null;

  const head = db()
    .prepare(
      `SELECT id, kind, title, updated_at FROM conversations
        WHERE id = ? AND user_id = ?`,
    )
    .get(id, user.id) as Record<string, unknown> | undefined;

  if (!head) return null;

  const rows = db()
    .prepare(
      `SELECT role, text FROM messages WHERE conversation_id = ? ORDER BY seq ASC`,
    )
    .all(id) as Array<Record<string, unknown>>;

  return {
    id: String(head.id),
    kind: String(head.kind) as RecentKind,
    title: String(head.title),
    updatedAt: Number(head.updated_at),
    messages: rows.map((r) => ({
      role: String(r.role) === "user" ? "user" : "model",
      text: String(r.text),
    })),
  };
}
