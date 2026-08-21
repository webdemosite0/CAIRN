import "server-only";
import { one, run, num, str } from "@/lib/db";

/**
 * The local cache of what Stripe last told us about a subscription.
 *
 * Stripe is the source of truth. These columns exist so rendering a page does
 * not require a network round trip to Stripe, and so the app still knows which
 * plan someone is on when Stripe is unreachable.
 *
 * Nothing here grants a plan on its own — only the webhook writes these, and
 * only after Stripe has confirmed the change. A client that says "I paid" is
 * not evidence.
 */

export interface Subscription {
  customerId: string;
  subscriptionId: string;
  /** Stripe's own status verbatim: active, trialing, past_due, canceled… */
  status: string;
  endsAt: number | null;
}

export async function subscriptionFor(userId: string): Promise<Subscription> {
  const row = await one(
    `SELECT stripe_customer_id, stripe_subscription_id, subscription_status, subscription_ends_at
       FROM users WHERE id = ?`,
    [userId],
  );
  return {
    customerId: str(row?.stripe_customer_id),
    subscriptionId: str(row?.stripe_subscription_id),
    status: str(row?.subscription_status),
    endsAt: row?.subscription_ends_at == null ? null : num(row.subscription_ends_at),
  };
}

export async function saveCustomerId(userId: string, customerId: string) {
  await run(`UPDATE users SET stripe_customer_id = ? WHERE id = ?`, [customerId, userId]);
}

/** Finds the account a Stripe webhook is talking about. */
export async function userIdForCustomer(customerId: string): Promise<string | null> {
  const row = await one(`SELECT id FROM users WHERE stripe_customer_id = ?`, [customerId]);
  return row ? str(row.id) : null;
}

/**
 * Applies what Stripe reported.
 *
 * Plan and subscription state move together in one statement: a plan set
 * without its status, or the reverse, is how an account ends up on Pro with a
 * cancelled subscription.
 */
export async function applySubscription(
  userId: string,
  opts: { plan: string; subscriptionId: string; status: string; endsAt: number | null },
) {
  await run(
    `UPDATE users
        SET plan = ?, stripe_subscription_id = ?, subscription_status = ?, subscription_ends_at = ?
      WHERE id = ?`,
    [opts.plan, opts.subscriptionId, opts.status, opts.endsAt, userId],
  );
}

/**
 * Statuses that should still get the paid plan.
 *
 * past_due is included on purpose: a card that failed a retry has not been
 * cancelled, and cutting someone off mid-billing-cycle over a temporary
 * decline is worse than carrying them until Stripe gives up and cancels.
 */
export function entitled(status: string): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}
