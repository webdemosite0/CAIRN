import { HomeChat } from "@/components/chat/home-chat";
import { listRecents } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const [recents, saved] = await Promise.all([
    listRecents("chat"),
    c ? loadConversation(c) : Promise.resolve(null),
  ]);

  return (
    <HomeChat
      recents={recents}
      restored={
        saved ? { id: saved.id, title: saved.title, messages: saved.messages } : null
      }
      // Remounts when the thread changes, so opening a different saved chat
      // replaces the transcript instead of leaving the old one in state.
      key={saved?.id ?? "new"}
    />
  );
}
