import { Backdrop } from "@/components/shell/backdrop";
import { CommandPalette } from "@/components/shell/command-palette";
import { NavProvider } from "@/components/shell/nav-state";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { resolveShell } from "@/components/shell/guard";
import { ToastProvider } from "@/components/ui/toast";
import { countDueReminders } from "@/app/actions/reminders";
import { isMobile } from "@/lib/device";
import { MobileShell } from "@/components/mobile/shell";

/**
 * The tool layout: the same chrome as the rest of the workspace.
 *
 * This group used to render full-bleed, on the reasoning that a builder is a
 * workspace rather than a page inside one. That holds for the moment a build
 * is actually running and the preview wants every pixel — but it also took the
 * navigation away from the library screens that live at these paths, so
 * Documents and Research were the only places in the app you could not get to
 * Agents from. They carry the rail now, like everything else.
 *
 * The group still exists rather than being folded into (shell): the routes
 * under it are the ones that open a full-bleed editor, and keeping them
 * grouped is what lets that editor take the screen back later without moving
 * every URL.
 *
 * The auth gate is the same one the shell uses — see components/shell/guard.
 */
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await resolveShell();
  if (!gate.ok) return gate.screen;
  const { user, balance } = gate;

  // The phone gets its own chrome, exactly as the shell does. Rendering the
  // desktop rail here and hiding it with a media query would ship both trees
  // to a device that can only ever use one.
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

  const due = await countDueReminders();

  return (
    <NavProvider>
      <ToastProvider>
        <Backdrop />
        <CommandPalette />
        <div className="flex min-h-screen">
          <Sidebar user={user} balance={balance} />
          <main className="flex min-w-0 flex-1 flex-col">
            <TopBar initial={user?.name?.slice(0, 1)} due={due} />
            {children}
          </main>
        </div>
      </ToastProvider>
    </NavProvider>
  );
}
