import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { CommandPalette } from "@/components/shell/command-palette";
import { NavProvider } from "@/components/shell/nav-state";
import { Backdrop } from "@/components/shell/backdrop";
import { resolveShell } from "@/components/shell/guard";
import { ToastProvider } from "@/components/ui/toast";
import { MobileShell } from "@/components/mobile/shell";
import { isMobile } from "@/lib/device";
import { countDueReminders } from "@/app/actions/reminders";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth, database health and the ephemeral-storage refusal all live in the
  // guard, shared with the full-bleed layout so neither can drift open.
  const gate = await resolveShell();
  if (!gate.ok) return gate.screen;
  const { user, balance } = gate;

  // One COUNT alongside the two queries the guard already runs. It is on every
  // navigation, so it stays a count — the reminders themselves are fetched by
  // the page that shows them.
  const due = await countDueReminders();

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
            <TopBar initial={user?.name?.slice(0, 1)} due={due} />
            {children}
          </main>
        </div>
      </ToastProvider>
    </NavProvider>
  );
}
