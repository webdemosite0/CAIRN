import "server-only";

/**
 * The schema, applied on first connection. Every statement is IF NOT EXISTS,
 * so this is safe to run on every cold start and doubles as the migration.
 *
 * Plain SQLite, which is exactly what Turso speaks — nothing here changes
 * between a local file and a hosted database.
 */
export const SCHEMA = `
PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      plan          TEXT NOT NULL DEFAULT 'free',
      created_at    INTEGER NOT NULL,
      /* 0 until the address is proven. Accounts created through Google are
         verified on arrival: Google has already done it. */
      email_verified INTEGER NOT NULL DEFAULT 0,
      provider       TEXT NOT NULL DEFAULT 'password'
    );

    /* Single-use links sent by email. Rows are deleted the moment they are
       redeemed, so a leaked link is worthless once used. */
    CREATE TABLE IF NOT EXISTS auth_tokens (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose    TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS auth_tokens_user ON auth_tokens (user_id, purpose);

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

    /* A real, verified connection to a third party. The secret is
       AES-256-GCM ciphertext, never plaintext — see src/lib/secrets.ts.
       Separate from the older integrations table, which only ever recorded
       intent to connect. */
    CREATE TABLE IF NOT EXISTS connections (
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service     TEXT NOT NULL,
      kind        TEXT NOT NULL,
      secret      TEXT NOT NULL,
      account     TEXT NOT NULL DEFAULT '',
      hint        TEXT NOT NULL DEFAULT '',
      verified_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, service)
    );

    CREATE TABLE IF NOT EXISTS integrations (
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service      TEXT NOT NULL,
      connected_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, service)
    );
`;

/**
 * Data repairs, applied on every connection.
 *
 * These cannot live in SCHEMA: that block is skipped entirely once the tables
 * exist, so anything added to it would never reach a database that already has
 * them — which is every database that needs repairing.
 *
 * Each statement is written so that running it a second time matches nothing,
 * making repeated execution free rather than merely harmless.
 */
/**
 * Statements that must run one at a time, because failure is expected.
 *
 * ALTER TABLE ADD COLUMN throws once the column is there, and REPAIRS is
 * executed as a single batch — one duplicate-column error would abandon
 * every statement after it. These are run individually so each can fail on
 * its own without taking the rest down.
 */
export const MIGRATIONS: string[] = [
  /* ---------------------------------------------------------------
     Reminders
     ---------------------------------------------------------------
     This table was only ever declared in SCHEMA, and SCHEMA is skipped the
     moment a database already has tables. Every database created before
     reminders existed therefore never got it, and the page 500s on the query
     rather than showing an empty list.

     Repeated verbatim here so an existing database picks it up. The index
     covers the top bar's due count, which now runs on every navigation. */
  `CREATE TABLE IF NOT EXISTS reminders (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      note       TEXT NOT NULL DEFAULT '',
      due_at     INTEGER NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      notified   INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
  `CREATE INDEX IF NOT EXISTS reminders_by_user_due ON reminders (user_id, done, due_at)`,

  /* ---------------------------------------------------------------
     Billing
     ---------------------------------------------------------------
     Stripe is the source of truth for whether someone is subscribed; these
     columns are a local cache of what it last told us, so a page render does
     not need a network call to Stripe to know which plan to show.

     status is Stripe own subscription status verbatim (active, past_due,
     canceled, ...) rather than a boolean, because "not active" and "about to
     lapse" need different treatment and a boolean throws that away. */
  `ALTER TABLE users ADD COLUMN stripe_customer_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN subscription_status TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN subscription_ends_at INTEGER`,
  `CREATE INDEX IF NOT EXISTS users_by_stripe_customer ON users (stripe_customer_id)`,


  /* ---------------------------------------------------------------
     Missions
     ---------------------------------------------------------------
     A mission is one piece of work given to Trove: a goal, the tasks it was
     broken into, and a record of what happened. Everything the mission UI
     shows is read from these three tables, so a screen can only display work
     that actually ran.

     Status values are fixed and small: planning, running, waiting,
     reviewing, completed, failed. A free-text status column drifts into six
     spellings of the same thing within a month. */
  `CREATE TABLE IF NOT EXISTS missions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      goal       TEXT NOT NULL,
      title      TEXT NOT NULL DEFAULT '',
      status     TEXT NOT NULL DEFAULT 'planning',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
  `CREATE INDEX IF NOT EXISTS missions_by_user ON missions (user_id, created_at DESC)`,

  /* One row per unit of work, in the order the plan put them. `seq` rather
     than relying on insertion order: a retried task keeps its place. */
  `CREATE TABLE IF NOT EXISTS mission_tasks (
      id          TEXT PRIMARY KEY,
      mission_id  TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
      seq         INTEGER NOT NULL,
      role        TEXT NOT NULL,
      title       TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'waiting',
      output      TEXT NOT NULL DEFAULT '',
      started_at  INTEGER,
      finished_at INTEGER
    )`,
  `CREATE INDEX IF NOT EXISTS mission_tasks_by_mission ON mission_tasks (mission_id, seq)`,

  /* The activity timeline. Append-only: it is the record of what happened,
     and a log you can edit is not a log. */
  `CREATE TABLE IF NOT EXISTS mission_events (
      id         TEXT PRIMARY KEY,
      mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
      at         INTEGER NOT NULL,
      kind       TEXT NOT NULL,
      actor      TEXT NOT NULL DEFAULT '',
      text       TEXT NOT NULL
    )`,
  `CREATE INDEX IF NOT EXISTS mission_events_by_mission ON mission_events (mission_id, at)`,


  /* New tables belong here, not only in SCHEMA. SCHEMA is skipped wholesale
     once the database has its tables, so a table added to it later reaches
     exactly the databases that do not need it — the empty ones. IF NOT EXISTS
     makes replaying this free. */
  `CREATE TABLE IF NOT EXISTS auth_tokens (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose    TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`,
  `CREATE INDEX IF NOT EXISTS auth_tokens_user ON auth_tokens (user_id, purpose)`,

  `ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN provider TEXT NOT NULL DEFAULT 'password'`,

  /* Grandfathering. Accounts that existed before verification was added
     were created by someone who set a password, and locking them out to
     prove an address they already use would be a regression. Guest rows are
     excluded by the empty password hash: they were never real accounts and
     are no longer reachable. */
  `UPDATE users SET email_verified = 1
    WHERE email_verified = 0 AND password_hash <> '' AND email NOT LIKE 'guest-%@local'`,
];

export const REPAIRS = `
    /* Chat moved from "/" to "/chat" when "/" became the landing page. Rows
       written before that point send people to the marketing page, which
       drops the ?c= and reopens a blank session instead of their thread. */
    UPDATE recents
       SET href = '/chat' || substr(href, 2)
     WHERE kind = 'chat' AND href LIKE '/?c=%';

    /* Agent threads never had a path at all: hrefFor had no 'agent' entry and
       fell through to "/". The owning agent is recoverable because the title
       is written as "<agent name>: <subject>". */
    UPDATE recents
       SET href = '/agents/' || (
             SELECT a.id FROM agents a
              WHERE a.user_id = recents.user_id
                AND recents.title LIKE a.name || ':%'
              LIMIT 1
           ) || substr(href, 2)
     WHERE kind = 'agent'
       AND href LIKE '/?c=%'
       AND EXISTS (
             SELECT 1 FROM agents a
              WHERE a.user_id = recents.user_id
                AND recents.title LIKE a.name || ':%'
           );

    /* Anything still pointing at the landing page goes to the agent list —
       not the thread, but a real page rather than a blank session. */
    UPDATE recents
       SET href = '/agents'
     WHERE kind = 'agent' AND href LIKE '/?c=%';
`;
