import { ToolPage } from "@/components/tools/tool-page";
import { listRecents, RECENT_LABEL } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";

export const metadata = { title: "Design" };

export default async function DesignPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const [recents, saved] = await Promise.all([
    listRecents("design"),
    c ? loadConversation(c) : Promise.resolve(null),
  ]);

  return (
    <ToolPage
      tool="design"
      title="Design"
      tagline="Get a decided interface spec — palette, type, spacing, states."
      placeholder="Design an interface for…"
      accent="#f472b6"
      examples={[
        "A dark analytics dashboard for a fintech",
        "A checkout flow for a mobile marketplace",
        "A settings page with nested preferences",
      ]}
      recents={recents}
      recentsLabel={RECENT_LABEL.design}
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
