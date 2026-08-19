import "server-only";
import { site } from "@/lib/site";

/**
 * Google sign-in, as a plain OAuth 2.0 authorization-code exchange.
 *
 * No SDK: the flow is two HTTP calls and the id_token carries everything the
 * app needs, so a dependency would only add surface area.
 *
 * Setup, in Google Cloud Console → APIs & Services → Credentials → Create
 * OAuth client ID → Web application:
 *
 *   Authorised redirect URI:  <your site>/api/auth/google/callback
 *
 * then in .env.local:
 *
 *   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
 *   GOOGLE_CLIENT_SECRET=...
 *   NEXT_PUBLIC_SITE_URL=https://your-domain        (so the URI matches)
 *
 * The button does not appear until both variables are set — a sign-in option
 * that fails on click is worse than one that is not offered.
 */

export function googleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

export function redirectUri(): string {
  return `${site.url}/api/auth/google/callback`;
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    // Ask every time rather than silently reusing whichever account the
    // browser happens to be signed into.
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export interface GoogleProfile {
  email: string;
  name: string;
  emailVerified: boolean;
}

/**
 * Trades the callback code for the caller's identity.
 *
 * The id_token is read without verifying its signature, which is safe only
 * because of where it came from: a direct TLS request to Google's token
 * endpoint, authenticated with the client secret. Nothing here is accepted
 * from the browser. If this ever moves to reading a token supplied by the
 * client, the signature must be checked against Google's JWKS first.
 */
export async function exchangeCode(code: string): Promise<GoogleProfile | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("google: token exchange failed —", res.status, detail.slice(0, 300));
    return null;
  }

  const body = (await res.json()) as { id_token?: string };
  if (!body.id_token) {
    console.error("google: token response carried no id_token");
    return null;
  }

  const payload = decodeJwtPayload(body.id_token);
  if (!payload) return null;

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email) {
    console.error("google: id_token carried no email");
    return null;
  }

  return {
    email,
    name:
      (typeof payload.name === "string" && payload.name.trim()) ||
      email.split("@")[0],
    // Google sends this as a boolean or the string "true" depending on the era.
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8",
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    console.error("google: id_token payload did not parse");
    return null;
  }
}
