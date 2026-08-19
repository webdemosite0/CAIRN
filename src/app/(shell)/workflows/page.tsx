import { TbRefreshDot } from "react-icons/tb";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata = { title: "Workflows" };

/**
 * Workflows is in the navigation because the shape of the product needs it
 * there, but nothing runs on a schedule yet. A nav item pointing at a 404 is
 * worse than one that says plainly it is not ready.
 */
export default function WorkflowsPage() {
  return (
    <ComingSoon
      title="Workflows"
      icon={TbRefreshDot}
      motion="spin"
      tint="#7dcfff"
      blurb="Chain the tools together and let them run on their own — on a schedule, or when something changes."
      points={[
        "Run a sequence of steps without starting each one",
        "Hand the output of one tool to the next",
        "Trigger on a schedule, or when an integration fires",
      ]}
    />
  );
}
