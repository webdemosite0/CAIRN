import { NextResponse, type NextRequest } from "next/server";

/**
 * Gives every visitor an identity immediately.
 *
 * Nothing in Trove should require an account to try. This sets a random guest
 * id on first request; the app resolves it into a real row on first use, so
 * agents, reminders and integrations all work before anyone signs up. Signing
 * up later adopts the same row, keeping whatever was already created.
 *
 * Only a cookie is written here — no database access, so this stays fast.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const hasSession = req.cookies.has("nx_session");
  const hasGuest = req.cookies.has("nx_guest");

  if (!hasSession && !hasGuest) {
    res.cookies.set("nx_guest", crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|opengraph-image).*)"],
};
