import { HomeChat } from "@/components/chat/home-chat";
import { MobileChat } from "@/components/mobile/chat";
import { listAllRecents } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";
import { currentUser } from "@/lib/auth";
import { isMobile } from "@/lib/device";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
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
    // Remounts when the thread changes, so opening a different saved chat
    // replaces the transcript instead of leaving the old one in state.
    key: saved?.id ?? "new",
  };

  // Two screens, not one that reflows. Picked on the server so a phone never
  // renders the desktop tree at all.
  return mobile ? <MobileChat {...props} /> : <HomeChat {...props} />;
}
