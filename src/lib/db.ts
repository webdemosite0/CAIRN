import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * SQLite store on the local filesystem, via Node's built-in `node:sqlite` —
 * no database dependency to install and no external service to run.
 *
 * DEPLOYMENT: this needs a real, writable, PERSISTENT disk. On a host with a
 * read-only or per-request filesystem (Vercel, Netlify, Cloudflare Workers)
 * it will either throw EROFS or silently lose every account, saved
 * conversation and credit balance between requests. Point CAIRN_DATA_DIR at a
 * mounted volume; see the Deploying section of the README.
 */

const DIR = process.env.CAIRN_DATA_DIR
  ? path.resolve(process.env.CAIRN_DATA_DIR)
  : path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "nexora.db");

let instance: DatabaseSync | null = null;

function migrate(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      plan          TEXT NOT NULL DEFAULT 'free',
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agents (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      role         TEXT NOT NULL,
      instructions TEXT NOT NULL,
      tools        TEXT NOT NULL DEFAULT '[]',
      accent       TEXT NOT NULL DEFAULT '#3b82f6',
      created_at   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sites (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      prompt     TEXT NOT NULL,
      html       TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      note       TEXT NOT NULL DEFAULT '',
      due_at     INTEGER NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      notified   INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recents (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      -- which page produced it: chat, docs, sheets, slides, design, research,
      -- code, agent, site
      kind       TEXT NOT NULL,
      title      TEXT NOT NULL,
      -- where clicking it goes back to, when the artefact is addressable
      href       TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS recents_lookup
      ON recents (user_id, kind, created_at DESC);

    /* A saved conversation. Reopening one replays these rows instead of
       asking the model again — the same question answered twice gives two
       different answers, so re-running was losing people's work. */
    CREATE TABLE IF NOT EXISTS conversations (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind       TEXT NOT NULL,
      title      TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id              TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL,
      text            TEXT NOT NULL,
      seq             INTEGER NOT NULL,
      created_at      INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS messages_by_conversation
      ON messages (conversation_id, seq);

    /* One row per person per calendar month. The primary key is what makes
       granting idempotent — INSERT OR IGNORE cannot double-grant on a race. */
    CREATE TABLE IF NOT EXISTS credit_grants (
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period     TEXT NOT NULL,
      plan       TEXT NOT NULL,
      credits    INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, period)
    );

    /* Every AI call that actually consumed Gemini tokens. The token count is
       the number Google reported, kept alongside the derived credit cost so
       the ledger stays auditable if the conversion rate ever changes. */
    CREATE TABLE IF NOT EXISTS credit_spends (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind       TEXT NOT NULL,
      tokens     INTEGER NOT NULL,
      credits    INTEGER NOT NULL,
      period     TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS credit_spends_lookup
      ON credit_spends (user_id, period);

    CREATE TABLE IF NOT EXISTS integrations (
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service      TEXT NOT NULL,
      connected_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, service)
    );
  `);
}

export function db() {
  if (!instance) {
    try {
      mkdirSync(DIR, { recursive: true });
      instance = new DatabaseSync(FILE);
    } catch (e) {
      // The raw failure here is an opaque EROFS/EACCES from deep inside a
      // server component, which is a miserable thing to debug from a deploy
      // log. Say what is actually wrong and how to fix it.
      const code = (e as NodeJS.ErrnoException)?.code;
      // ENOTDIR belongs here too: a misconfigured CAIRN_DATA_DIR pointing at
      // something that is not a directory threw a raw stack trace instead of
      // this message.
      if (
        code === "EROFS" ||
        code === "EACCES" ||
        code === "EPERM" ||
        code === "ENOTDIR"
      ) {
        throw new Error(
          `CAIRN cannot write its database to ${DIR} (${code}). This host has a ` +
            `read-only filesystem, so it cannot run CAIRN as built — accounts, saved ` +
            `conversations and credits all need a persistent disk. Deploy to a host ` +
            `with a mounted volume and set CAIRN_DATA_DIR to it. See the Deploying ` +
            `section of the README.`,
        );
      }
      throw e;
    }
    migrate(instance);
  }
  return instance;
}

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}
