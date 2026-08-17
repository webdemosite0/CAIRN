import { PlansView } from "./plans-view";
import { currentUser } from "@/lib/auth";
import { PLANS, myBalance, usageByKind } from "@/lib/credits";

export const metadata = { title: "Credits and plans" };

export default async function PricingPage() {
  const user = await currentUser();
  const balance = await myBalance();
  const usage = user ? usageByKind(user.id) : [];

  return (
    <PlansView
      plans={PLANS}
      balance={balance}
      usage={usage}
      currentPlan={user?.plan ?? null}
      signedIn={Boolean(user)}
    />
  );
}
