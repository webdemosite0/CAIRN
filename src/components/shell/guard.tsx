import { redirect } from "next/navigation";
import { Backdrop } from "@/components/shell/backdrop";
import { SetupNeeded } from "@/components/shell/setup-needed";
import { currentUser, type User } from "@/lib/auth";
import { myBalance, type Balance } from "@/lib/credits";
import { storageIsEphemeral, tursoVars } from "@/lib/db";

/**
 * Everything that must be true before a signed-in page renders.
 *
 * Extracted from the shell layout so a second layout — the full-bleed builder,
 * which has no rail — enforces exactly the same gate. Two copies of an auth
 * check is two places for one of them to drift open.
 *
 * Returns either the resolved account or a finished screen to render instead.
 * The caller cannot accidentally continue past a failure, because there is no
 * user to continue with.
 */
export type ShellGate =
  | { ok: true; user: User; balance: Balance | null }
  | { ok: false; screen: React.ReactNode };

export async function resolveShell(): Promise<ShellGate> {
  let user: User | null = null;
  let balance: Balance | null = null;

  try {
    user = await currentUser();
    balance = await myBalance();
  } catch (e) {
    // Next signals redirect, notFound and dynamic-render bailout by THROWING.
    // Swallowing those would silently break routing, so hand them back.
    const digest = (e as { digest?: unknown })?.digest;
    if (
      typeof digest === "string" &&
      (digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE")
    ) {
      throw e;
    }

    // Every page here reads the account and credit balance, so an unreachable
    // database took the entire site down as an unexplained 500. Say what is
    // wrong instead — the cause otherwise only exists in the host's logs.
    const message = e instanceof Error ? e.message : String(e);
    console.error("shell guard: database unavailable —", message);

    const seen = tursoVars();
    return {
      ok: false,
      screen: (
        <>
          <Backdrop />
          <SetupNeeded
            detail={[
              message,
              "",
              `TURSO_DATABASE_URL: ${seen.url ? "set" : "NOT SET"}`,
              `TURSO_AUTH_TOKEN:   ${seen.token ? "set" : "NOT SET"}`,
            ].join("\n")}
          />
        </>
      ),
    };
  }

  // Storage that does not survive a restart is worse than storage that is
  // down: the app works, then a refresh lands on a fresh instance and the
  // account is gone. Checked after the queries above, because the flag is only
  // set once a connection has actually been attempted.
  if (await storageIsEphemeral()) {
    return {
      ok: false,
      screen: (
        <>
          <Backdrop />
          <SetupNeeded
            reason="ephemeral"
            detail={[
              "database mode: ephemeral-tmp",
              `TURSO_DATABASE_URL: ${tursoVars().url ? "set" : "NOT SET"}`,
              `TURSO_AUTH_TOKEN:   ${tursoVars().token ? "set" : "NOT SET"}`,
            ].join("\n")}
          />
        </>
      ),
    };
  }

  // The real gate. Middleware only sees whether a cookie is present; this is
  // where the session is actually looked up, so an expired, revoked or forged
  // cookie stops here.
  if (!user) redirect("/login");
  if (!user.emailVerified) redirect("/verify-email");

  return { ok: true, user, balance };
}
