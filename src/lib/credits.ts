import "server-only";

import { db, uid } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/**
 * Credits are a thin, honest wrapper over Gemini token usage.
 *
 * One credit = TOKENS_PER_CREDIT tokens actually reported by Google in
 * `usageMetadata` — prompt + response. Nothing is estimated ahead of time and
 * nothing is charged per request regardless of size, because a one-line chat
 * and a 30k-token website build are not the same amount of work.
 */

export const TOKENS_PER_CREDIT = 1_000;

export interface Plan {
  id: string;
  name: string;
  /** Credits granted at the start of each calendar month. */
  monthly: number;
  price: number;
  blurb: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthly: 200,
    price: 0,
    blurb: "Enough to build something real and see how it feels.",
    features: [
      "200 credits a month (~200k tokens)",
      "Every tool: chat, docs, sheets, code, research",
      "Agents, reminders and integrations",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 5_000,
    price: 24,
    blurb: "For daily work, where you stop thinking about the meter.",
    features: [
      "5,000 credits a month (~5M tokens)",
      "Everything in Free",
      "Priority model fallback when Google is busy",
    ],
  },
  {
    id: "team",
    name: "Team",
    monthly: 20_000,
    price: 96,
    blurb: "Shared capacity for a group building together.",
    features: [
      "20,000 credits a month (~20M tokens)",
      "Everything in Pro",
      "Shared agents across the workspace",
    ],
  },
];

export function planById(id: string): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

/** Calendar month, e.g. "2026-08". Grants and spend are both scoped to it. */
export function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Tokens -> credits. Always at least 1, so a call is never free. */
export function creditsForTokens(tokens: number): number {
  if (!Number.isFinite(tokens) || tokens <= 0) return 1;
  return Math.max(1, Math.ceil(tokens / TOKENS_PER_CREDIT));
}

export interface Balance {
  plan: Plan;
  granted: number;
  used: number;
  remaining: number;
  tokensUsed: number;
  period: string;
}

/**
 * Makes sure this month's grant exists, then returns the balance.
 *
 * The grant is topped up (never reduced) when the plan changed mid-month, so
 * upgrading takes effect immediately instead of next month.
 */
function ensureGrant(userId: string, planId: string, period: string): number {
  const plan = planById(planId);
  const d = db();

  d.prepare(
    `INSERT OR IGNORE INTO credit_grants (user_id, period, plan, credits, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(userId, period, plan.id, plan.monthly, Date.now());

  const row = d
    .prepare(`SELECT credits FROM credit_grants WHERE user_id = ? AND period = ?`)
    .get(userId, period) as { credits?: number } | undefined;

  const granted = Number(row?.credits ?? 0);

  if (plan.monthly > granted) {
    d.prepare(
      `UPDATE credit_grants SET credits = ?, plan = ? WHERE user_id = ? AND period = ?`,
    ).run(plan.monthly, plan.id, userId, period);
    return plan.monthly;
  }

  return granted;
}

export function balanceFor(userId: string, planId: string): Balance {
  const period = currentPeriod();
  const granted = ensureGrant(userId, planId, period);

  const row = db()
    .prepare(
      `SELECT COALESCE(SUM(credits), 0) AS used, COALESCE(SUM(tokens), 0) AS tokens
         FROM credit_spends WHERE user_id = ? AND period = ?`,
    )
    .get(userId, period) as { used?: number; tokens?: number } | undefined;

  const used = Number(row?.used ?? 0);

  return {
    plan: planById(planId),
    granted,
    used,
    remaining: Math.max(0, granted - used),
    tokensUsed: Number(row?.tokens ?? 0),
    period,
  };
}

/** Balance for whoever is making the request. Null when there is no identity. */
export async function myBalance(): Promise<Balance | null> {
  const user = await currentUser();
  if (!user) return null;
  return balanceFor(user.id, user.plan);
}

/**
 * Records real usage. Called after the model has responded, with the token
 * count Google reported — never before, and never with a guess.
 */
export function spend(userId: string, kind: string, tokens: number): void {
  try {
    const credits = creditsForTokens(tokens);
    db()
      .prepare(
        `INSERT INTO credit_spends (id, user_id, kind, tokens, credits, period, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(uid("spend"), userId, kind, Math.max(0, tokens), credits, currentPeriod(), Date.now());
  } catch (e) {
    // Never fail a response the user already received over bookkeeping.
    console.error("credits: could not record spend", e);
  }
}

export class OutOfCredits extends Error {
  constructor(public readonly balance: Balance) {
    super(
      `You have used all ${balance.granted.toLocaleString()} credits on the ` +
        `${balance.plan.name} plan this month. They reset at the start of next month — ` +
        `or upgrade for more.`,
    );
    this.name = "OutOfCredits";
  }
}

/**
 * Gate for a route. Returns the identity and balance, or throws OutOfCredits.
 * Checked before the call; the actual debit happens after, from real usage.
 */
export async function requireCredits(): Promise<{
  userId: string;
  balance: Balance;
} | null> {
  const user = await currentUser();
  if (!user) return null;

  const balance = balanceFor(user.id, user.plan);
  if (balance.remaining <= 0) throw new OutOfCredits(balance);

  return { userId: user.id, balance };
}

export interface UsageRow {
  kind: string;
  credits: number;
  tokens: number;
  calls: number;
}

/** Per-tool breakdown for the current month, biggest consumer first. */
export function usageByKind(userId: string): UsageRow[] {
  const rows = db()
    .prepare(
      `SELECT kind,
              COALESCE(SUM(credits), 0) AS credits,
              COALESCE(SUM(tokens), 0)  AS tokens,
              COUNT(*)                  AS calls
         FROM credit_spends
        WHERE user_id = ? AND period = ?
        GROUP BY kind
        ORDER BY credits DESC`,
    )
    .all(userId, currentPeriod()) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    kind: String(r.kind),
    credits: Number(r.credits),
    tokens: Number(r.tokens),
    calls: Number(r.calls),
  }));
}
