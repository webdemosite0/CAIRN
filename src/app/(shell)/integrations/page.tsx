import { IntegrationsView } from "./integrations-view";
import { currentUser } from "@/lib/auth";
import { listConnections } from "@/lib/connections";
import { PROVIDERS } from "@/lib/providers";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await currentUser();
  const connections = await listConnections();

  // Only what the client needs to render a form: never the verify function,
  // and never anything resembling a credential.
  const connectable = Object.fromEntries(
    Object.entries(PROVIDERS).map(([id, p]) => [
      id,
      { label: p.label, help: p.help, docs: p.docs },
    ]),
  );

  return (
    <IntegrationsView
      connected={connections.map((c) => ({
        service: c.service,
        account: c.account,
        hint: c.hint,
      }))}
      connectable={connectable}
      signedIn={Boolean(user)}
    />
  );
}
