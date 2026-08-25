import { DesignView } from "./design-view";
import { listRecents } from "@/lib/recents";

export const metadata = { title: "Design" };

/**
 * Design no longer goes through ToolPage.
 *
 * ToolPage is built for one prompt and one written answer, which is the right
 * shape for a document or a piece of research. A design is a brief and a set
 * of screens, and forcing that through a prose pipeline is what produced a
 * specification nobody asked for.
 */
export default async function DesignPage() {
  const recents = await listRecents("design");
  return <DesignView recents={recents} />;
}
