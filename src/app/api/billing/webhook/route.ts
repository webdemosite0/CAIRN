import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { applySubscription, userIdForCustomer } from "@/lib/billing";
import { planForPrice, stripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe's side of the conversation. This is the only thing that grants a plan.
 *
 * Three rules hold this together:
 *
 *  1. The body is read as raw text. Signature verification hashes the exact
 *     bytes Stripe sent, so parsing to JSON first and re-serialising would
 *     change the whitespace and fail every time.
 *  2. Nothing is trusted until the signature checks out. This route is public
 *     (no session cookie exists on a server-to-server call), so the signature
 *     is the entire authentication story.
 *  3. The subscription is re-read from Stripe instead of being taken from the
 *     event payload. Webhooks can arrive out of order, and a delayed "updated"
 *     event would otherwise overwrite newer state with older state.
 */

const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripeConfigured() || !secret) {
    // 503, not 200: Stripe should keep retrying while this is being set up
    // rather than marking the delivery successful and dropping it.
    return NextResponse.json({ error: "billing not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "unsigned" }, { status: 400 });
  }

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, signature, secret);
  } catch (err) {
    console.error("[billing] bad webhook signature:", err);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (!HANDLED.has(event.type)) {
    // Acknowledged deliberately. Stripe sends many event types; retrying the
    // ones this app does not care about achieves nothing.
    return NextResponse.json({ received: true, ignored: event.type });
  }

  try {
    await handle(event);
  } catch (err) {
    // 500 so Stripe retries. A database blip should not silently cost someone
    // the plan they just paid for.
    console.error(`[billing] handling ${event.type} failed:`, err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handle(event: Stripe.Event) {
  const sdk = stripe();

  let subscriptionId = "";
  let customerId = "";

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "subscription") return;
    subscriptionId = idOf(session.subscription);
    customerId = idOf(session.customer);
  } else {
    const sub = event.data.object as Stripe.Subscription;
    subscriptionId = sub.id;
    customerId = idOf(sub.customer);
  }

  if (!customerId) {
    console.error(`[billing] ${event.type} had no customer`);
    return;
  }

  const userId = await userIdForCustomer(customerId);
  if (!userId) {
    // Someone else's Stripe account, or an account deleted since paying.
    // Not an error worth retrying — a retry would find nothing either.
    console.error(`[billing] no account for stripe customer ${customerId}`);
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    await applySubscription(userId, {
      plan: "free",
      subscriptionId: "",
      status: "canceled",
      endsAt: null,
    });
    return;
  }

  if (!subscriptionId) {
    console.error(`[billing] ${event.type} had no subscription`);
    return;
  }

  // The authoritative read. See rule 3 above.
  const sub = await sdk.subscriptions.retrieve(subscriptionId);
  const item = sub.items?.data?.[0];
  const priceId = idOf(item?.price);
  const plan = priceId ? planForPrice(priceId) : null;

  if (!plan) {
    // A real price that no Trove plan claims: usually STRIPE_PRICE_* pointing
    // at a different price than the one checkout used. Granting a guessed plan
    // would be worse than granting none, so record the state and stop.
    console.error(
      `[billing] price ${priceId || "(none)"} maps to no plan; not changing plan for ${userId}`,
    );
    return;
  }

  // In this API version the period boundary lives on the subscription item,
  // not the subscription. Reading sub.current_period_end silently yields
  // undefined.
  const endsAt = typeof item?.current_period_end === "number" ? item.current_period_end : null;

  const active =
    sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";

  await applySubscription(userId, {
    plan: active ? plan : "free",
    subscriptionId: sub.id,
    status: sub.status,
    endsAt,
  });
}

/** Stripe fields are `string | Object | null` depending on expansion. */
function idOf(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "id" in v) return String((v as { id: unknown }).id);
  return "";
}
