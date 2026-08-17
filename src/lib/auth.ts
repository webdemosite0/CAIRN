import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { one, run, uid, num, str } from "@/lib/db";

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

export async function createUser(
  email: string,
  name: string,
  password: string,
): Promise<User> {
  const id = uid("usr");
  await run(
    `INSERT INTO users (id, email, name, password_hash, plan, created_at)
     VALUES (?, ?, ?, ?, 'free', ?)`,
    [id, email.toLowerCase(), name, hashPassword(password), Date.now()],
  );
  return { id, email: email.toLowerCase(), name, plan: "free" };
}

export async function findByEmail(email: string) {
  const row = await one(`SELECT * FROM users WHERE email = ?`, [
    email.toLowerCase(),
  ]);
  if (!row) return undefined;
  return {
    id: str(row.id),
    email: str(row.email),
    name: str(row.name),
    password_hash: str(row.password_hash),
    plan: str(row.plan),
  };
}

export async function setPlan(userId: string, plan: string) {
  await run(`UPDATE users SET plan = ? WHERE id = ?`, [plan, userId]);
}

/* ---------------- sessions ---------------- */

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = Date.now() + SESSION_DAYS * 86_400_000;

  await run(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`, [
    token,
    userId,
    expires,
  ]);

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
    await run(`DELETE FROM sessions WHERE token = ?`, [token]);
    jar.delete(COOKIE);
  }
}

/** Resolves the guest cookie into a real row, creating it on first use. */
async function guestUser(guestId: string): Promise<User> {
  const existing = await one(
    `SELECT id, email, name, plan FROM users WHERE id = ?`,
    [guestId],
  );

  if (existing) {
    return {
      id: str(existing.id),
      email: str(existing.email),
      name: str(existing.name),
      plan: str(existing.plan),
    };
  }

  const email = `guest-${guestId.slice(0, 8)}@local`;

  // OR IGNORE because two concurrent first requests carry the same cookie and
  // would otherwise race on the primary key.
  await run(
    `INSERT OR IGNORE INTO users (id, email, name, password_hash, plan, created_at)
     VALUES (?, ?, ?, '', 'free', ?)`,
    [guestId, email, "You", Date.now()],
  );

  return { id: guestId, email, name: "You", plan: "free" };
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;

  if (!token) {
    const guest = jar.get("nx_guest")?.value;
    return guest ? guestUser(guest) : null;
  }

  const row = await one(
    `SELECT u.id, u.email, u.name, u.plan, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`,
    [token],
  );

  if (!row) {
    const guest = jar.get("nx_guest")?.value;
    return guest ? guestUser(guest) : null;
  }
  if (num(row.expires_at) < Date.now()) {
    await run(`DELETE FROM sessions WHERE token = ?`, [token]);
    return null;
  }

  return {
    id: str(row.id),
    email: str(row.email),
    name: str(row.name),
    plan: str(row.plan),
  };
}

/** Throws to the caller when a route needs a signed-in user. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
