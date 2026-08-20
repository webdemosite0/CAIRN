import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { CommandPalette } from "@/components/shell/command-palette";
import { NavProvider } from "@/components/shell/nav-state";
import { Backdrop } from "@/components/shell/backdrop";
import { SetupNeeded } from "@/components/shell/setup-needed";
import { ToastProvider } from "@/components/ui/toast";
import { MobileShell } from "@/components/mobile/shell";
import { isMobile } from "@/lib/device";
import { redirect } from "next/navigation";
import { currentUser, type User } from "@/lib/auth";
import { myBalance } from "@/lib/credits";
import { storageIsEphemeral, tursoVars } from "@/lib/db";
import type { Balance } from "@/lib/credits";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    console.error("shell layout: database unavailable —", message);

    // Which variables were visible matters more than the driver's wording.
    // A URL with no token is the commonest way to land here: the app does
    // try Turso, and Turso rejects it.
    const seen = tursoVars();
    return (
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
    );
  }

  // Storage that does not survive a restart is worse than storage that is
  // down: the app works, then a refresh lands on a fresh instance and the
  // account is gone. Checked after the queries above, because the flag is only
  // set once a connection has actually been attempted.
  if (await storageIsEphemeral()) {
    return (
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
    );
  }

  // The real gate. Middleware only sees whether a cookie is present; this is
  // where the session is actually looked up, so an expired, revoked or forged
  // cookie stops here.
  if (!user) redirect("/login");
  if (!user.emailVerified) redirect("/verify-email");

  // Two separate UIs, not one that reflows. The phone gets its own chrome —
  // tab bar, sheets, no rail — and never renders the desktop tree, so nothing
  // here can regress the desktop layout.
  if (await isMobile()) {
    return (
      <ToastProvider>
        <Backdrop />
        <MobileShell
          user={{ name: user.name, email: user.email }}
          balance={balance}
        >
          {children}
        </MobileShell>
      </ToastProvider>
    );
  }

  return (
    <NavProvider>
      <ToastProvider>
        <Backdrop />
        <CommandPalette />
        <div className="flex min-h-screen">
          <Sidebar user={user} balance={balance} />
          {/* children are NOT wrapped in a re-keying client component: combined
              with the loading.tsx Suspense boundary that left page content
              server-rendered but never hydrated, so nothing was clickable. */}
          <main className="flex min-w-0 flex-1 flex-col">
            <TopBar initial={user?.name?.slice(0, 1)} />
            {children}
          </main>
        </div>
      </ToastProvider>
    </NavProvider>
  );
}
