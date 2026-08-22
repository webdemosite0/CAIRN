import { SpreadsheetView } from "./spreadsheet-view";
import { listRecents, RECENT_LABEL } from "@/lib/recents";
import { loadConversation } from "@/lib/conversations";

export const metadata = { title: "Spreadsheets" };

export default async function SheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const [recents, saved] = await Promise.all([
    listRecents("sheets"),
    c ? loadConversation(c) : Promise.resolve(null),
  ]);

  return (
    <SpreadsheetView
      recents={recents}
      recentsLabel={RECENT_LABEL.sheets}
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
