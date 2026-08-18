import "server-only";

import { createClient, type Client, type InValue } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { SCHEMA } from "@/lib/schema";

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

function localFileUrl() {
  const dir = process.env.CAIRN_DATA_DIR
    ? path.resolve(process.env.CAIRN_DATA_DIR)
    : path.join(process.cwd(), ".data");

  try {
    mkdirSync(dir, { recursive: true });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    // ENOENT belongs here: Vercel reports exactly that for mkdir under
    // /var/task, and without it the user got a raw stack instead of this.
    if (["EROFS", "EACCES", "EPERM", "ENOTDIR", "ENOENT"].includes(code ?? "")) {
      throw new Error(
        `CAIRN cannot write its database to ${dir} (${code}). This host has a ` +
          `read-only filesystem. Either set TURSO_DATABASE_URL and ` +
          `TURSO_AUTH_TOKEN to use a hosted database, or deploy somewhere with ` +
          `a persistent volume and point CAIRN_DATA_DIR at it. See the ` +
          `Deploying section of the README.`,
      );
    }
    throw e;
  }

  // Still nexora.db despite the rename: libSQL reads the same SQLite file
  // format node:sqlite wrote, so keeping the name carries existing local data
  // across the migration instead of orphaning it.
  // libSQL wants a URL, and on Windows the path contains backslashes.
  return `file:${path.join(dir, "nexora.db").replace(/\\/g, "/")}`;
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

    // WAL is a local-file concept and a hosted database rejects it.
    const schema = isRemote
      ? SCHEMA.replace(/PRAGMA journal_mode = WAL;/i, "")
      : SCHEMA;

    await client.executeMultiple(schema);
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
