import { HomeChat } from "@/components/chat/home-chat";
import { MobileChat } from "@/components/mobile/chat";
import { listAllRecents } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";
import { currentUser } from "@/lib/auth";
import { isMobile } from "@/lib/device";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string }>;
}) {
  const { c, q } = await searchParams;
  const [saved, user, activity, mobile] = await Promise.all([
    c ? loadConversation(c) : Promise.resolve(null),
    currentUser(),
    listAllRecents(12),
    isMobile(),
  ]);

  const props = {
    name: user?.name?.split(" ")[0] ?? "there",
    activity,
    restored: saved
      ? { id: saved.id, title: saved.title, messages: saved.messages }
      : null,
    /**
     * An idea typed on the landing page, carried through sign-in.
     *
     * Middleware puts the whole path and query into ?next=, and the auth form
     * posts it back, so someone who typed a prompt before having an account
     * finds it waiting in the composer rather than having to remember it.
     */
    draft: typeof q === "string" ? q.slice(0, 2000) : "",
  };

  /**
   * The key is passed directly, not through the spread.
   *
   * It used to live inside `props`, which React ignores — a key in a spread is
   * not a key, and it warns about exactly this. So the remount this was here
   * for never happened: opening a different saved conversation left the
   * previous transcript sitting in the component's state.
   */
  const key = saved?.id ?? "new";

  // Two screens, not one that reflows. Picked on the server so a phone never
  // renders the desktop tree at all.
  return mobile ? (
    <MobileChat key={key} {...props} />
  ) : (
    <HomeChat key={key} {...props} />
  );
}
