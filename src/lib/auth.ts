import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db, uid } from "@/lib/db";

const COOKIE = "nx_session";
const SESSION_DAYS = 30;

export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
}

/* ---------------- passwords ---------------- */

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/* ---------------- users ---------------- */

export function createUser(email: string, name: string, password: string): User {
  const id = uid("usr");
  db()
    .prepare(
      `INSERT INTO users (id, email, name, password_hash, plan, created_at)
       VALUES (?, ?, ?, ?, 'free', ?)`,
    )
    .run(id, email.toLowerCase(), name, hashPassword(password), Date.now());
  return { id, email: email.toLowerCase(), name, plan: "free" };
}

export function findByEmail(email: string) {
  return db()
    .prepare(`SELECT * FROM users WHERE email = ?`)
    .get(email.toLowerCase()) as
    | { id: string; email: string; name: string; password_hash: string; plan: string }
    | undefined;
}

export function setPlan(userId: string, plan: string) {
  db().prepare(`UPDATE users SET plan = ? WHERE id = ?`).run(plan, userId);
}

/* ---------------- sessions ---------------- */

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = Date.now() + SESSION_DAYS * 86_400_000;

  db()
    .prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`)
    .run(token, userId, expires);

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    db().prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    jar.delete(COOKIE);
  }
}

/** Resolves the guest cookie into a real row, creating it on first use. */
function guestUser(guestId: string): User {
  const existing = db()
    .prepare(`SELECT id, email, name, plan FROM users WHERE id = ?`)
    .get(guestId) as User | undefined;

  if (existing) {
    return {
      id: String(existing.id),
      email: String(existing.email),
      name: String(existing.name),
      plan: String(existing.plan),
    };
  }

  const email = `guest-${guestId.slice(0, 8)}@local`;

  db()
    .prepare(
      `INSERT INTO users (id, email, name, password_hash, plan, created_at)
       VALUES (?, ?, ?, '', 'free', ?)`,
    )
    .run(guestId, email, "You", Date.now());

  return { id: guestId, email, name: "You", plan: "free" };
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;

  if (!token) {
    const guest = jar.get("nx_guest")?.value;
    return guest ? guestUser(guest) : null;
  }

  const row = db()
    .prepare(
      `SELECT u.id, u.email, u.name, u.plan, s.expires_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token = ?`,
    )
    .get(token) as
    | { id: string; email: string; name: string; plan: string; expires_at: number }
    | undefined;

  if (!row) {
    const guest = jar.get("nx_guest")?.value;
    return guest ? guestUser(guest) : null;
  }
  if (row.expires_at < Date.now()) {
    db().prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    return null;
  }

  return { id: row.id, email: row.email, name: row.name, plan: row.plan };
}

/** Throws to the caller when a route needs a signed-in user. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
