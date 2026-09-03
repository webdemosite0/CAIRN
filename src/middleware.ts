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
const PUBLIC_PAGES = new Set(["/", "/login", "/signup", "/pricing"]);

const PUBLIC_PREFIXES = [
  "/features/", // the public capability pages — the only indexable content
  "/verify-email", // opened from an email, in whatever browser
  "/api/auth/", // the sign-in and OAuth callback routes themselves
  "/api/health", // has to answer when the database is down
  "/api/billing/webhook", // Stripe calls this server-to-server; it has no cookie
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

/**
 * One hostname, permanently.
 *
 * www.troveai.site served the whole site as happily as the apex did, with no
 * redirect between them, so Google indexed both — /team appeared under www and
 * the landing page under the apex, splitting every ranking signal the domain
 * has between two addresses it thinks are different sites.
 *
 * 308 rather than 302: permanent is the true answer, and it is the only one
 * that makes Google consolidate the two into one. The method is preserved,
 * which matters because a POST to a form on www must not silently become a GET.
 */
function canonicalHost(req: NextRequest): NextResponse | null {
  const host = req.headers.get("host");
  if (!host?.startsWith("www.")) return null;

  const url = req.nextUrl.clone();
  url.host = host.slice(4);
  // The port is dropped with the prefix: this only ever fires on the deployed
  // domain, and carrying a stray :3000 here would send people nowhere.
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const toApex = canonicalHost(req);
  if (toApex) return toApex;

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
  /**
   * `google...html` is the Search Console ownership file in public/.
   *
   * Without it here the auth gate answered Google's fetch with a 307 to
   * /login, so the file was never read and the domain could not be verified —
   * a failure that looks like Google's problem and is entirely ours. Any
   * verification file dropped into public/ later is covered by the same
   * pattern.
   *
   * It is safe to expose: the token is public by design and proves ownership
   * only to whoever already controls the Search Console property.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|opengraph-image|robots.txt|sitemap.xml|manifest.webmanifest|llms.txt|google[0-9a-z]+\\.html).*)",
  ],
};
