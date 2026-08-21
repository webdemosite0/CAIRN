import { Backdrop } from "@/components/shell/backdrop";
import { resolveShell } from "@/components/shell/guard";
import { ToastProvider } from "@/components/ui/toast";

/**
 * The full-bleed layout: no rail, no top bar, no command palette.
 *
 * The builder is a workspace, not a page inside one. Its two panes — the
 * conversation and the live preview — are both the work, and 248px of
 * navigation beside them is 248px taken from the thing being built. Every
 * other tool in this class puts the chat against one edge and the preview
 * against the other, for that reason.
 *
 * This is a separate route group rather than a flag on the shell because a
 * layout cannot read the current path on the server. Route groups do not
 * appear in the URL, so /websites is still /websites.
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

  return (
    <ToastProvider>
      <Backdrop />
      {children}
    </ToastProvider>
  );
}
