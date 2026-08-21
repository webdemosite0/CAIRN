import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { subscriptionFor } from "@/lib/billing";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opens Stripe's customer portal: change card, download invoices, cancel.
 *
 * Cancelling, upgrading and refunds all live there rather than being rebuilt
 * here. Stripe's portal is already correct about proration and tax, and a
 * hand-rolled cancel button that only writes a local column would leave someone
 * still being charged.
 *
 * The customer id comes from the session user's own row, so this can only ever
 * open the portal for the person who asked.
 */
export async function POST() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not set up on this deployment yet." },
      { status: 503 },
    );
  }

  const sub = await subscriptionFor(user.id);
  if (!sub.customerId) {
    return NextResponse.json(
      { error: "There is no billing history on this account yet." },
      { status: 400 },
    );
  }

  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: sub.customerId,
      return_url: `${site.url}/plans`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing] portal failed:", err);
    return NextResponse.json(
      { error: "Could not open the billing portal. Please try again." },
      { status: 502 },
    );
  }
}
