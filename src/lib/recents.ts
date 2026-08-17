import "server-only";

import { db, uid } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/** Every page that produces something worth coming back to. */
export type RecentKind =
  | "chat"
  | "docs"
  | "sheets"
  | "slides"
  | "design"
  | "research"
  | "code"
  | "agent"
  | "team"
  | "site";

export interface Recent {
  id: string;
  kind: RecentKind;
  title: string;
  href: string;
  createdAt: number;
}

/** How many we keep per kind, per person. Older rows are pruned on write. */
const KEEP = 12;

/** What each page shows under its composer. */
export const RECENT_LABEL: Record<RecentKind, string> = {
  chat: "Recent chats",
  docs: "Recent documents",
  sheets: "Recent spreadsheets",
  slides: "Recent decks",
  design: "Recent design specs",
  research: "Recent research",
  code: "Recent code",
  agent: "Recent agents",
  team: "Recent team tasks",
  site: "Recent sites",
};

/**
 * Next signals "this render must be dynamic" by throwing. Those throws carry a
 * `digest` and MUST reach the framework — swallowing one leaves the page
 * statically rendered, so the strip would be frozen empty forever.
 */
function rethrowFrameworkErrors(e: unknown): void {
  if (typeof e === "object" && e !== null && "digest" in e) throw e;
}

function clean(title: string) {
  const t = title.replace(/\s+/g, " ").trim();
  return t.length > 90 ? `${t.slice(0, 89)}…` : t;
}

/**
 * Records one artefact. Safe to call from anywhere on the server — it resolves
 * the current identity itself (guests included) and never throws into a route:
 * a recents write must not be able to fail a generation the user asked for.
 */
export async function remember(
  kind: RecentKind,
  title: string,
  href = "",
): Promise<void> {
  const text = clean(title);
  if (!text) return;

  try {
    const user = await currentUser();
    if (!user) return;

    const d = db();

    // Re-asking the same thing should move it up, not add a duplicate row.
    d.prepare(`DELETE FROM recents WHERE user_id = ? AND kind = ? AND title = ?`).run(
      user.id,
      kind,
      text,
    );

    d.prepare(
      `INSERT INTO recents (id, user_id, kind, title, href, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(uid("rec"), user.id, kind, text, href, Date.now());

    d.prepare(
      `DELETE FROM recents
        WHERE user_id = ? AND kind = ?
          AND id NOT IN (
            SELECT id FROM recents
             WHERE user_id = ? AND kind = ?
             ORDER BY created_at DESC
             LIMIT ?
          )`,
    ).run(user.id, kind, user.id, kind, KEEP);
  } catch (e) {
    rethrowFrameworkErrors(e);
    console.error("recents: could not record", e);
  }
}

/** Reads the strip for one page. Returns [] for signed-out or on any failure. */
export async function listRecents(
  kind: RecentKind,
  limit = 6,
): Promise<Recent[]> {
  try {
    const user = await currentUser();
    if (!user) return [];

    const rows = db()
      .prepare(
        `SELECT id, kind, title, href, created_at
           FROM recents
          WHERE user_id = ? AND kind = ?
          ORDER BY created_at DESC
          LIMIT ?`,
      )
      .all(user.id, kind, limit) as Array<Record<string, unknown>>;

    // node:sqlite hands back null-prototype objects; map to plain ones.
    return rows.map((r) => ({
      id: String(r.id),
      kind: String(r.kind) as RecentKind,
      title: String(r.title),
      href: String(r.href ?? ""),
      createdAt: Number(r.created_at),
    }));
  } catch (e) {
    rethrowFrameworkErrors(e);
    console.error("recents: could not read", e);
    return [];
  }
}
