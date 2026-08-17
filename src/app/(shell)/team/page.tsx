import { TeamView } from "./team-view";
import { listRecents } from "@/lib/recents";

export const metadata = { title: "AI Team" };

export default async function SwarmPage() {
  const recents = await listRecents("team", 5);
  return <TeamView recents={recents} />;
}
