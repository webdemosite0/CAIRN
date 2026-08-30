import { TeamView } from "./team-view";
import { listRecents } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";

export const metadata = { title: "AI Team" };

export default async function SwarmPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const [recents, saved] = await Promise.all([
    listRecents("team", 5),
    c ? loadConversation(c) : Promise.resolve(null),
  ]);

  return (
    <TeamView
      recents={recents}
      restored={
        saved
          ? {
              id: saved.id,
              task: saved.messages.find((m) => m.role === "user")?.text ?? saved.title,
              // Each specialist's answer was stored as its own message, in the
              // order they ran, so a reopened run reads exactly as it did live.
              results: saved.messages.filter((m) => m.role === "model").map((m) => m.text),
            }
          : null
      }
      key={saved?.id ?? "new"}
    />
  );
}
