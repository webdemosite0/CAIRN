import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  createUser,
  findByEmail,
  markVerified,
  startSession,
} from "@/lib/auth";
import { exchangeCode, googleConfigured } from "@/lib/google";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (why: string) =>
  NextResponse.redirect(`${site.url}/login?error=${encodeURIComponent(why)}`);

/**
 * Where Google sends people back to.
 *
 * Matching on email address means someone who signed up with a password and
 * later uses the Google button lands in the same account rather than a second
 * one — but only when Google says the address is verified. Without that check
 * an unverified Google address would be a way into an existing account.
 */
export async function GET(req: NextRequest) {
  if (!googleConfigured()) return fail("google-unconfigured");

  const url = new URL(req.url);

  // The user pressed cancel on Google's consent screen.
  const denied = url.searchParams.get("error");
  if (denied) return fail("google-cancelled");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = req.cookies.get("nx_oauth_state")?.value;

  if (!code || !state || !expected || state !== expected) {
    return fail("google-state");
  }

  const profile = await exchangeCode(code);
  if (!profile) return fail("google-exchange");
  if (!profile.emailVerified) return fail("google-unverified");

  const existing = await findByEmail(profile.email);

  if (existing) {
    // Arriving through Google proves the address, whatever the row said.
    if (!existing.emailVerified) await markVerified(existing.id);
    await startSession(existing.id);
  } else {
    // A random password nobody knows: this account signs in through Google.
    // Password reset, when it exists, is how it would gain a local password.
    const created = await createUser(
      profile.email,
      profile.name,
      randomBytes(32).toString("hex"),
      { provider: "google", emailVerified: true },
    );
    await startSession(created.id);
  }

  const res = NextResponse.redirect(`${site.url}/chat`);
  res.cookies.delete("nx_oauth_state");
  return res;
}
