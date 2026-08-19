import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeUrl, googleConfigured } from "@/lib/google";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Starts the Google sign-in redirect.
 *
 * The state value is generated here and stored in an httpOnly cookie so the
 * callback can prove the response belongs to a flow this browser began —
 * without it, anyone could feed the callback a code of their choosing.
 */
export async function GET() {
  if (!googleConfigured()) {
    return NextResponse.redirect(`${site.url}/login?error=google-unconfigured`);
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(state));

  res.cookies.set("nx_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return res;
}
