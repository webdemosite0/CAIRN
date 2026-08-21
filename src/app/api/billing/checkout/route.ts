import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { planById } from "@/lib/credits";
import { saveCustomerId, subscriptionFor } from "@/lib/billing";
import { priceFor, stripe, stripeConfigured } from "@/lib/stripe";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Starts a Stripe Checkout session for a paid plan.
 *
 * The plan is looked up server-side and the price comes from the environment,
 * so the amount charged never depends on anything the browser sent. A client
 * that posts {plan:"team"} gets the Team price; it cannot post a price id or an
 * amount, because those are not read from the body at all.
 *
 * Nothing is granted here. Checkout only redirects someone to Stripe — the plan
 * is applied when Stripe tells us it was paid, in the webhook.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Log in to change your plan." }, { status: 401 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not set up on this deployment yet." },
      { status: 503 },
    );
  }

  let planId = "";
  try {
    planId = String(((await req.json()) as { plan?: unknown })?.plan ?? "");
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const plan = planById(planId);
  if (plan.id !== planId || plan.price <= 0) {
    return NextResponse.json({ error: "That is not a paid plan." }, { status: 400 });
  }

  const price = priceFor(plan.id);
  if (!price) {
    return NextResponse.json(
      { error: `${plan.name} has no price configured on this deployment yet.` },
      { status: 503 },
    );
  }

  try {
    const sub = await subscriptionFor(user.id);
    const sdk = stripe();

    // Reuse the customer if this account has one. Creating a second customer
    // for the same person splits their history in two and breaks the portal.
    let customerId = sub.customerId;
    if (!customerId) {
      const customer = await sdk.customers.create({
        email: user.email,
        name: user.name || undefined,
        // The webhook arrives with a customer id and nothing else useful; this
        // is what lets it find the account again.
        metadata: { troveUserId: user.id },
      });
      customerId = customer.id;
      await saveCustomerId(user.id, customerId);
    }

    const session = await sdk.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      // Carried through to the webhook on both the session and the
      // subscription, so neither handler has to guess who this was for.
      client_reference_id: user.id,
      metadata: { troveUserId: user.id, plan: plan.id },
      subscription_data: { metadata: { troveUserId: user.id, plan: plan.id } },
      allow_promotion_codes: true,
      success_url: `${site.url}/plans?checkout=done`,
      cancel_url: `${site.url}/plans?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout page. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Stripe messages name the misconfiguration precisely ("No such price"),
    // which matters while setting this up — but they are for the log, not for
    // the person, who cannot act on them.
    console.error("[billing] checkout failed:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again in a moment." },
      { status: 502 },
    );
  }
}
