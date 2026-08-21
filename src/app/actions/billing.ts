"use server";

import { revalidatePath } from "next/cache";
import { currentUser, setPlan } from "@/lib/auth";
import { subscriptionFor } from "@/lib/billing";
import { planById } from "@/lib/credits";
import { purchasable, stripeConfigured } from "@/lib/stripe";

/**
 * Plan changes that do not involve money.
 *
 * Paid plans do not go through here — they go to Stripe Checkout, and the plan
 * is written by the webhook once Stripe confirms payment. This action can only
 * ever move someone *down* to Free, which needs no payment and so needs no
 * processor.
 *
 * Downgrading is deliberately not a local write when a live subscription
 * exists: flipping the column while Stripe keeps charging the card is the worst
 * possible outcome. That case is sent to the billing portal instead, which
 * cancels for real.
 */
export async function choosePlan(plan: string) {
  const user = await currentUser();
  if (!user) return { error: "Log in to change your plan." };

  if (plan !== "free") {
    return { error: "Paid plans go through checkout." };
  }

  const sub = await subscriptionFor(user.id);
  if (sub.subscriptionId && sub.status !== "canceled") {
    return {
      error:
        "You have an active subscription. Cancel it in the billing portal so the card stops being charged.",
      portal: true,
    };
  }

  await setPlan(user.id, "free");
  revalidatePath("/plans");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** What the plans page needs to know about billing before it renders. */
export async function billingState() {
  const user = await currentUser();
  if (!user) {
    return { signedIn: false, stripeReady: false, purchasable: {} as Record<string, boolean>, subscription: null };
  }

  const sub = await subscriptionFor(user.id);
  const canBuy: Record<string, boolean> = {};
  for (const p of [planById("pro"), planById("team")]) canBuy[p.id] = purchasable(p.id);

  return {
    signedIn: true,
    stripeReady: stripeConfigured(),
    purchasable: canBuy,
    subscription: sub,
  };
}
