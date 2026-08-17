import { TbWorld } from "react-icons/tb";
import { ComingSoon } from "@/components/ui/coming-soon";
import { WebsiteBuilder } from "./website-builder";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Website Builder" };

/**
 * The builder itself is complete and working — it generates a real multi-file
 * project, edits it iteratively and exports a ZIP. It is switched off here on
 * purpose. Flip this to true to bring the whole page back; nothing else needs
 * to change and website-builder.tsx is untouched.
 */
const ENABLED = false;

export default async function WebsitesPage() {
  if (!ENABLED) {
    return (
      <ComingSoon
        title="Website Builder"
        icon={TbWorld}
        motion="spin"
        tint="#7dcfff"
        blurb="Describe a site and watch it get built, then keep talking to it to change anything. We are putting the finishing touches on it."
        points={[
          "A real multi-file project — HTML, CSS and JavaScript",
          "Chat your edits: every reply patches only the files that changed",
          "Live preview at phone, tablet and desktop widths",
        ]}
      />
    );
  }

  const user = await currentUser();
  return <WebsiteBuilder signedIn={Boolean(user)} />;
}
