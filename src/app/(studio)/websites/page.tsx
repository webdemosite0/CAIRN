import { BuilderView } from "./builder-view";
import { isMobile } from "@/lib/device";

export const metadata = { title: "Website Builder" };

export default async function WebsitesPage() {
  // The builder is one component with two arrangements rather than two
  // components: the state machine, the streaming and the file handling are the
  // hard parts and are identical. Only the layout differs.
  return <BuilderView mobile={await isMobile()} />;
}
