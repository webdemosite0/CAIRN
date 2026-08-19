"use server";

import { redirect } from "next/navigation";
import {
  createUser,
  currentUser,
  endSession,
  findByEmail,
  issueToken,
  lastTokenAt,
  startSession,
  verifyPassword,
} from "@/lib/auth";
import { sendMail, verificationEmail, verificationEnforced } from "@/lib/mail";
import { site } from "@/lib/site";

export interface AuthState {
  error?: string;
  notice?: string;
}

function readForm(form: FormData) {
  return {
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
    name: String(form.get("name") ?? "").trim(),
    next: safeNext(String(form.get("next") ?? "")),
  };
}

/**
 * Where to land after signing in.
 *
 * Only a path on this site. The value arrives from a query string, so
 * anything absolute — including the protocol-relative "//evil.example" that
 * browsers treat as a host — would turn the sign-in form into an open
 * redirect for phishing.
 */
function safeNext(value: string): string | null {
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

/** Sends the confirmation link. Never throws — signup must not fail on mail. */
async function sendVerification(user: { id: string; email: string; name: string }) {
  const token = await issueToken(user.id, "verify-email");
  const link = `${site.url}/verify-email/confirm?token=${token}`;
  const mail = verificationEmail(user.name, link);
  await sendMail({ to: user.email, ...mail });
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const { email, password, name } = readForm(form);

  if (!name) return { error: "Enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (await findByEmail(email)) {
    return { error: "An account with that email already exists." };
  }

  // Without a mailer there is no way to prove the address, and refusing to let
  // anyone in would brick the app. See verificationEnforced().
  const enforced = verificationEnforced();
  const user = await createUser(email, name, password, { emailVerified: !enforced });

  if (enforced) await sendVerification(user);

  await startSession(user.id);
  redirect(enforced ? "/verify-email" : "/chat");
}

export async function logIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const { email, password, next } = readForm(form);

  const row = await findByEmail(email);

  // One message for both cases on purpose: saying "no such account" tells an
  // attacker which addresses are registered.
  if (!row || !row.password_hash || !verifyPassword(password, row.password_hash)) {
    return { error: "That email and password do not match." };
  }

  await startSession(row.id);
  redirect(row.emailVerified ? (next ?? "/chat") : "/verify-email");
}

export async function logOut() {
  await endSession();
  redirect("/login");
}

/**
 * Sends the confirmation link again.
 *
 * Rate limited to one a minute per account, because the button is the obvious
 * thing to hammer when the first mail is slow, and each press costs a send.
 */
export async function resendVerification(): Promise<AuthState> {
  const user = await currentUser();
  if (!user) return { error: "Sign in first." };
  if (user.emailVerified) return { notice: "That address is already confirmed." };

  const last = await lastTokenAt(user.id, "verify-email");
  if (last && Date.now() - last < 60_000) {
    const wait = Math.ceil((60_000 - (Date.now() - last)) / 1000);
    return { error: `Just sent one. Try again in ${wait}s.` };
  }

  await sendVerification(user);
  return { notice: `Sent again to ${user.email}.` };
}
