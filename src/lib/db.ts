import "server-only";

import { createClient, type Client, type InValue } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { SCHEMA, REPAIRS, MIGRATIONS } from "@/lib/schema";

/**
 * The database, over libSQL.
 *
 * One code path, two destinations. With TURSO_DATABASE_URL set it talks to a
 * hosted Turso database over HTTP; without it, it opens a local SQLite file.
 * Both are the same SQLite dialect and the same client, so what runs in
 * development is what runs in production — the reason this migration could be
 * verified locally at all.
 *
 * This replaced node:sqlite, which was synchronous and therefore simpler, but
 * required a writable persistent disk. That made the app impossible to deploy
 * on Vercel: the filesystem is read-only, so every page returned 500 rather
 * than merely losing data.
 */

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

/** True when talking to a hosted database rather than a file on disk. */
export const isRemote = Boolean(url);

/**
 * Which Turso variables the running process can actually see.
 *
 * Read fresh rather than reported from the module consts, and returned as
 * booleans only — this is surfaced in the UI and must never echo a token.
 *
 * The distinction matters because the two failure modes look nothing alike:
 * with no URL the app never tries Turso at all and silently uses throwaway
 * local storage, whereas a URL without a token does try, and fails to connect.
 */
export function tursoVars(): { url: boolean; token: boolean } {
  return {
    url: Boolean(process.env.TURSO_DATABASE_URL?.trim()),
    token: Boolean(process.env.TURSO_AUTH_TOKEN?.trim()),
  };
}

/** Whether the database file lives somewhere that survives a restart. */
export let ephemeral = false;

function fileUrlIn(dir: string) {
  // Still nexora.db despite the rename: libSQL reads the same SQLite file
  // format node:sqlite wrote, so keeping the name carries existing local data
  // across the migration instead of orphaning it.
  // libSQL wants a URL, and on Windows the path contains backslashes.
  return `file:${path.join(dir, "nexora.db").replace(/\\/g, "/")}`;
}

/**
 * Picks a writable location for the SQLite file.
 *
 * Preferred is TROVE_DATA_DIR or ./.data. On a serverless host neither exists
 * — the bundle at /var/task is read-only — but /tmp IS writable, so rather
 * than refusing to start we fall back to it and mark the store ephemeral.
 *
 * That trade is deliberate. A deploy with no configuration then WORKS: chat,
 * documents, spreadsheets, credits, all of it. What it loses is durability —
 * each serverless instance gets its own /tmp and they are recycled freely, so
 * accounts and saved conversations come and go. Set TURSO_DATABASE_URL to
 * make it permanent. A dead site teaches nobody anything; a working one that
 * says it is temporary does.
 */
function localFileUrl() {
  // CAIRN_DATA_DIR still works so a running container keeps its volume
  // through the rename.
  const configured = process.env.TROVE_DATA_DIR ?? process.env.CAIRN_DATA_DIR;
  const preferred = configured
    ? path.resolve(configured)
    : path.join(process.cwd(), ".data");

  try {
    mkdirSync(preferred, { recursive: true });
    return fileUrlIn(preferred);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    // ENOENT belongs here: Vercel reports exactly that for mkdir under
    // /var/task, and without it the raw stack surfaced instead of a message.
    if (!["EROFS", "EACCES", "EPERM", "ENOTDIR", "ENOENT"].includes(code ?? "")) {
      throw e;
    }

    const temp = path.join(tmpdir(), "trove");
    try {
      mkdirSync(temp, { recursive: true });
      ephemeral = true;
      console.warn(
        `Trove: ${preferred} is not writable (${code}), using ${temp}. ` +
          `Data will NOT survive a restart — set TURSO_DATABASE_URL and ` +
          `TURSO_AUTH_TOKEN to keep it.`,
      );
      return fileUrlIn(temp);
    } catch {
      throw new Error(
        `Trove cannot write its database to ${preferred} (${code}) or to ` +
          `${temp}. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to use a ` +
          `hosted database, or point TROVE_DATA_DIR at a writable volume. ` +
          `See the Deploying section of the README.`,
      );
    }
  }
}

/** Tables the schema creates. A missing one means the schema must run. */
const TABLES = [
  "users",
  "sessions",
  "agents",
  "sites",
  "reminders",
  "recents",
  "conversations",
  "messages",
  "credit_grants",
  "credit_spends",
  "integrations",
  "connections",
  "auth_tokens",
];

/**
 * True when every table already exists. Counting rather than assuming means
 * adding a table later still triggers a migration on the next cold start.
 */
async function alreadyMigrated(c: Client): Promise<boolean> {
  try {
    const placeholders = TABLES.map(() => "?").join(",");
    const res = await c.execute({
      sql: `SELECT COUNT(*) AS n FROM sqlite_master
             WHERE type = 'table' AND name IN (${placeholders})`,
      args: TABLES,
    });
    return Number(res.rows[0]?.n ?? 0) === TABLES.length;
  } catch {
    // A brand new database has no sqlite_master rows to read yet.
    return false;
  }
}

let client: Client | null = null;
let ready: Promise<Client> | null = null;

/**
 * Opens the connection and applies the schema exactly once.
 *
 * The promise is memoised rather than the client, so concurrent first requests
 * await the same migration instead of racing to create the same tables.
 */
function connect(): Promise<Client> {
  if (ready) return ready;

  ready = (async () => {
    client = createClient(
      url ? { url, authToken } : { url: localFileUrl() },
    );

    // Skip the schema when it is already there. Every statement is IF NOT
    // EXISTS so replaying is safe, but it is 14 statements on every cold
    // start — against a hosted database that is 14 network round trips
    // before the first page can render. One cheap probe replaces them.
    if (!(await alreadyMigrated(client))) {
      // WAL is a local-file concept and a hosted database rejects it.
      const schema = isRemote
        ? SCHEMA.replace(/PRAGMA journal_mode = WAL;/i, "")
        : SCHEMA;

      await client.executeMultiple(schema);
    }

    // Column additions run one at a time: ALTER TABLE ADD COLUMN throws
    // once the column exists, which is the normal case on every start after
    // the first, and a batch would abandon everything after the throw.
    for (const statement of MIGRATIONS) {
      try {
        await client.execute(statement);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        // "duplicate column name" is the expected outcome, not a problem.
        if (!/duplicate column name/i.test(message)) {
          console.error("db: migration skipped —", message);
        }
      }
    }

    // Repairs run even when the schema was skipped — a database that already
    // has every table is precisely the one carrying rows that need fixing.
    // They are cheap and match nothing once applied, but must never take the
    // app down: a bad row is worth less than a working page.
    try {
      await client.executeMultiple(REPAIRS);
    } catch (e) {
      console.error(
        "db: repairs skipped —",
        e instanceof Error ? e.message : String(e),
      );
    }

    return client;
  })();

  // A failed migration must not poison every later request.
  ready.catch(() => {
    ready = null;
    client = null;
  });

  return ready;
}

type Args = InValue[];

/** A row as a plain object. libSQL hands back a hybrid array/object shape. */
/**
 * True when the database will not survive the next restart, on a deploy where
 * that means real data loss.
 *
 * A serverless host has a read-only filesystem, so the local-file fallback
 * lands in /tmp — and every instance has its own /tmp and is recycled freely.
 * The symptom is that refreshing a page signs you out and empties the account:
 * the request landed on an instance whose database had never been written to.
 *
 * That used to be a console warning, which nobody reads, while the app carried
 * on accepting sign-ups it was going to lose. Callers use this to say so.
 *
 * Connects first, because the flag is only set when the fallback is taken.
 */
export async function storageIsEphemeral(): Promise<boolean> {
  if (isRemote) return false;
  try {
    await connect();
  } catch {
    // Unreachable is a different failure, already reported by the caller.
    return false;
  }
  if (!ephemeral || process.env.NODE_ENV !== "production") return false;

  // Deliberate opt-out, for a demo or a preview that is meant to be
  // disposable. It does not make the data survive — it only says you already
  // know it will not, so the app stops arguing.
  if (process.env.TROVE_ALLOW_EPHEMERAL === "1") {
    console.warn(
      "Trove: running on throwaway storage because TROVE_ALLOW_EPHEMERAL=1. " +
        "Accounts and everything in them are lost whenever the instance recycles.",
    );
    return false;
  }

  return true;
}

export type Row = Record<string, unknown>;

function plain(row: unknown): Row {
  return { ...(row as Record<string, unknown>) };
}

/** First matching row, or undefined. */
export async function one<T = Row>(sql: string, args: Args = []): Promise<T | undefined> {
  const c = await connect();
  const res = await c.execute({ sql, args });
  const row = res.rows[0];
  return row === undefined ? undefined : (plain(row) as T);
}

/** All matching rows. */
export async function all<T = Row>(sql: string, args: Args = []): Promise<T[]> {
  const c = await connect();
  const res = await c.execute({ sql, args });
  return res.rows.map((r) => plain(r) as T);
}

/** A write. Returns how many rows it touched. */
export async function run(sql: string, args: Args = []): Promise<number> {
  const c = await connect();
  const res = await c.execute({ sql, args });
  return Number(res.rowsAffected ?? 0);
}

/** Several writes, applied atomically. */
export async function batch(
  statements: { sql: string; args?: Args }[],
): Promise<void> {
  if (!statements.length) return;
  const c = await connect();
  await c.batch(
    statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    "write",
  );
}

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

/** SQLite returns integers as number or bigint depending on magnitude. */
export function num(v: unknown): number {
  return typeof v === "bigint" ? Number(v) : Number(v ?? 0);
}

export function str(v: unknown): string {
  return v == null ? "" : String(v);
}
