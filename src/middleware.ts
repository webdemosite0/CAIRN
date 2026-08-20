import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps signed-out visitors out of the app.
 *
 * This used to do the opposite: it handed every visitor a guest cookie which
 * the app turned into a real user row, so anyone could mint an account — and
 * its monthly credit grant — by clearing cookies, any number of times. Using
 * Trove now requires an account.
 *
 * The check here is only "is there a session cookie", because middleware runs
 * on the edge with no database. A cookie that is expired, revoked or forged
 * gets past this and is rejected by the shell layout, which does look it up.
 * This exists to send people to the sign-in page instead of rendering a shell
 * around nothing — it is not the security boundary.
 */

/** Reachable without an account. Everything else needs one. */
const PUBLIC_PAGES = new Set(["/", "/login", "/signup"]);

const PUBLIC_PREFIXES = [
  "/verify-email", // opened from an email, in whatever browser
  "/api/auth/", // the sign-in and OAuth callback routes themselves
  "/api/health", // has to answer when the database is down
];

function isPublic(pathname: string) {
  if (PUBLIC_PAGES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Pins the UI when ?ui=mobile or ?ui=desktop is on the URL.
 *
 * Only writes the cookie; lib/device.ts reads it. That keeps the decision in
 * one place and means middleware does not have to rewrite request headers,
 * which is the fiddly way to get a value from here into a server component.
 *
 * Exists so the phone UI can be opened from a laptop. Without a pin, the
 * device is decided from the user agent.
 */
function pinUi(req: NextRequest, res: NextResponse): NextResponse {
  const asked = req.nextUrl.searchParams.get("ui");
  if (asked === "mobile" || asked === "desktop") {
    res.cookies.set("nx_ui", asked, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  } else if (asked === "auto") {
    // Without this the pin is a trap: ?ui=desktop on a phone lasts a month and
    // there is no way back to letting the device decide.
    res.cookies.delete("nx_ui");
  }
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublic(pathname)) {
    const res = pinUi(req, NextResponse.next());
    // Clear the old guest identity wherever one is still lying around, so it
    // stops being sent on every request for the next year.
    if (req.cookies.has("nx_guest")) res.cookies.delete("nx_guest");
    return res;
  }

  if (req.cookies.has("nx_session")) return pinUi(req, NextResponse.next());

  // An API call gets a status it can act on; a page gets the sign-in screen.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  // Come back to where they were headed once they are in.
  if (pathname !== "/") url.searchParams.set("next", pathname + search);

  const res = pinUi(req, NextResponse.redirect(url));
  if (req.cookies.has("nx_guest")) res.cookies.delete("nx_guest");
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|opengraph-image|robots.txt|sitemap.xml|manifest.webmanifest|llms.txt).*)",
  ],
};
