import { ToolPage } from "@/components/tools/tool-page";
import { listRecents, RECENT_LABEL } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";

export const metadata = { title: "Slides" };

export default async function SlidesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const [recents, saved] = await Promise.all([
    listRecents("slides"),
    c ? loadConversation(c) : Promise.resolve(null),
  ]);

  return (
    <ToolPage
      tool="slides"
      title="Slides"
      tagline="Turn an idea into a slide outline with speaker notes."
      placeholder="Create a deck about…"
      accent="#a78bfa"
      examples={[
        "A seed pitch for an AI devtools startup",
        "An engineering all-hands on migrating to Postgres",
        "A product launch deck for a mobile app",
      ]}
      recents={recents}
      recentsLabel={RECENT_LABEL.slides}
      restored={
        saved
          ? {
              id: saved.id,
              title: saved.messages.find((m) => m.role === "user")?.text ?? saved.title,
              output: saved.messages.find((m) => m.role === "model")?.text ?? "",
            }
          : null
      }
      key={saved?.id ?? "new"}
    />
  );
}
