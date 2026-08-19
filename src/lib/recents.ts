import "server-only";

import { all, batch, uid, num, str } from "@/lib/db";
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

    // One atomic batch: de-duplicate, insert, then prune. Splitting these
    // would let a concurrent read see the list briefly missing its newest row.
    await batch([
      {
        sql: `DELETE FROM recents WHERE user_id = ? AND kind = ? AND title = ?`,
        args: [user.id, kind, text],
      },
      {
        sql: `INSERT INTO recents (id, user_id, kind, title, href, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [uid("rec"), user.id, kind, text, href, Date.now()],
      },
      {
        sql: `DELETE FROM recents
                WHERE user_id = ? AND kind = ?
                  AND id NOT IN (
                    SELECT id FROM recents
                     WHERE user_id = ? AND kind = ?
                     ORDER BY created_at DESC
                     LIMIT ?
                  )`,
        args: [user.id, kind, user.id, kind, KEEP],
      },
    ]);
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

    const rows = await all(
      `SELECT id, kind, title, href, created_at
         FROM recents
        WHERE user_id = ? AND kind = ?
        ORDER BY created_at DESC
        LIMIT ?`,
      [user.id, kind, limit],
    );

    return rows.map((r) => ({
      id: str(r.id),
      kind: str(r.kind) as RecentKind,
      title: str(r.title),
      href: str(r.href),
      createdAt: num(r.created_at),
    }));
  } catch (e) {
    rethrowFrameworkErrors(e);
    console.error("recents: could not read", e);
    return [];
  }
}

/**
 * The most recent work across every kind, newest first.
 *
 * The home page shows one list of what you were last doing, which is a
 * different question from "your last six spreadsheets" — hence a separate
 * query rather than calling listRecents ten times and merging.
 */
export async function listAllRecents(limit = 12): Promise<Recent[]> {
  try {
    const user = await currentUser();
    if (!user) return [];

    const rows = await all(
      `SELECT id, kind, title, href, created_at
         FROM recents
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?`,
      [user.id, limit],
    );

    return rows.map((r) => ({
      id: str(r.id),
      kind: str(r.kind) as RecentKind,
      title: str(r.title),
      href: str(r.href),
      createdAt: num(r.created_at),
    }));
  } catch (e) {
    rethrowFrameworkErrors(e);
    console.error("recents: could not read all", e);
    return [];
  }
}

export { relativeTime } from "@/lib/time";
