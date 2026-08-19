import { HomeChat } from "@/components/chat/home-chat";
import { listAllRecents } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";
import { currentUser } from "@/lib/auth";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const [saved, user, activity] = await Promise.all([
    c ? loadConversation(c) : Promise.resolve(null),
    currentUser(),
    listAllRecents(12),
  ]);

  return (
    <HomeChat
      name={user?.name?.split(" ")[0] ?? "there"}
      activity={activity}
      restored={
        saved ? { id: saved.id, title: saved.title, messages: saved.messages } : null
      }
      // Remounts when the thread changes, so opening a different saved chat
      // replaces the transcript instead of leaving the old one in state.
      key={saved?.id ?? "new"}
    />
  );
}
