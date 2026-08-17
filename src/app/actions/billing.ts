"use server";

import { revalidatePath } from "next/cache";
import { currentUser, setPlan } from "@/lib/auth";

/**
 * Records the chosen plan against the account.
 *
 * Only the free plan can be selected. There is no payment processor wired up,
 * and paid tiers carry a much larger credit grant — so accepting them here
 * would hand out capacity for nothing and make the budget meaningless. The UI
 * shows "Coming soon" on those tiers; this is the matching server-side guard,
 * because hiding a button is not access control.
 */
export async function choosePlan(plan: string) {
  const user = await currentUser();
  if (!user) return { error: "Log in to change your plan." };

  if (plan !== "free") {
    return { error: "Paid plans are coming soon — there is no billing yet." };
  }

  setPlan(user.id, plan);
  revalidatePath("/plans");
  revalidatePath("/", "layout");
  return { ok: true };
}
