import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Local SQLite store. Uses Node's built-in `node:sqlite`, so there is no
 * database dependency to install and no external service to run.
 */

const DIR = path.join(process.cwd(), ".data");
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
    mkdirSync(DIR, { recursive: true });
    instance = new DatabaseSync(FILE);
    migrate(instance);
  }
  return instance;
}

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}
