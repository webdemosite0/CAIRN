import { ToolPage } from "@/components/tools/tool-page";
import { listRecents, RECENT_LABEL } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";

export const metadata = { title: "Research" };

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const [recents, saved] = await Promise.all([
    listRecents("research"),
    c ? loadConversation(c) : Promise.resolve(null),
  ]);

  return (
    <ToolPage
      tool="research"
      title="Research"
      tagline="Structured analysis that separates what is known from what is not."
      placeholder="Research…"
      accent="#22d3ee"
      examples={[
        "Trade-offs between event sourcing and CRUD",
        "How rate limiting strategies compare at scale",
        "When to choose Postgres over a document store",
      ]}
      recents={recents}
      recentsLabel={RECENT_LABEL.research}
      restored={
        saved
          ? {
              id: saved.id,
              title: saved.messages.find((m) => m.role === "user")?.text ?? saved.title,
              // The whole thread, so reopening it lands you back in the
              // conversation rather than staring at an answer with the
              // question that produced it missing.
              messages: saved.messages,
            }
          : null
      }
      key={saved?.id ?? "new"}
    />
  );
}
