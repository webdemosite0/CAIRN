import { IntegrationsView } from "./integrations-view";
import { listConnected } from "@/app/actions/integrations";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await currentUser();
  const connected = await listConnected();
  return <IntegrationsView connected={connected} signedIn={Boolean(user)} />;
}
