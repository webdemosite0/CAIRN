import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { balanceFor, usageByKind } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * This month's credit breakdown for the signed-in user.
 *
 * Exists so the rail's credit meter can stay a cheap server-rendered bar and
 * only pay for the grouped query when someone actually opens the popover —
 * the rail renders on every page, the popover is opened rarely.
 *
 * Scoped to the session user; there is no way to ask for someone else's.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "signed out" }, { status: 401 });
  }

  const [balance, usage] = await Promise.all([
    balanceFor(user.id, user.plan),
    usageByKind(user.id),
  ]);

  return NextResponse.json(
    { balance, usage },
    { headers: { "cache-control": "no-store" } },
  );
}
