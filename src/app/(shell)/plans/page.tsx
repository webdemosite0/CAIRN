import { PlansView } from "./plans-view";
import { currentUser } from "@/lib/auth";
import { PLANS, myBalance, usageByKind } from "@/lib/credits";
import { subscriptionFor } from "@/lib/billing";
import { purchasable, stripeConfigured } from "@/lib/stripe";

export const metadata = { title: "Credits and plans" };

/**
 * Whether a plan can actually be bought is decided here, on the server, and
 * passed down. The button label follows the deployment's real configuration
 * instead of assuming Stripe is set up — a Subscribe button that 503s on click
 * is worse than one that says what is missing.
 */
export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const user = await currentUser();
  const balance = await myBalance();
  const usage = user ? await usageByKind(user.id) : [];
  const subscription = user ? await subscriptionFor(user.id) : null;

  const canBuy: Record<string, boolean> = {};
  for (const p of PLANS) canBuy[p.id] = p.price > 0 ? purchasable(p.id) : true;

  return (
    <PlansView
      plans={PLANS}
      balance={balance}
      usage={usage}
      currentPlan={user?.plan ?? null}
      signedIn={Boolean(user)}
      stripeReady={stripeConfigured()}
      purchasable={canBuy}
      subscription={subscription}
      checkout={checkout === "done" ? "done" : checkout === "cancelled" ? "cancelled" : null}
    />
  );
}
