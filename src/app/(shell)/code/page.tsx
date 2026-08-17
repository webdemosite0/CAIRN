import { ToolPage } from "@/components/tools/tool-page";
import { listRecents, RECENT_LABEL } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";

export const metadata = { title: "Code" };

export default async function CodePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const [recents, saved] = await Promise.all([
    listRecents("code"),
    c ? loadConversation(c) : Promise.resolve(null),
  ]);

  return (
    <ToolPage
      tool="code"
      title="Code"
      tagline="Complete, runnable code — no placeholders."
      placeholder="Write code that…"
      accent="#22d3ee"
      examples={[
        "A debounce hook in TypeScript with cleanup",
        "A Postgres migration adding a composite index",
        "An Express middleware for JWT verification",
      ]}
      recents={recents}
      recentsLabel={RECENT_LABEL.code}
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
