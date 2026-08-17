"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FiCheck, FiLoader } from "react-icons/fi";
import { choosePlan } from "@/app/actions/billing";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";
import type { Balance, Plan, UsageRow } from "@/lib/credits";

const KIND_LABEL: Record<string, string> = {
  chat: "Chat",
  docs: "Documents",
  sheets: "Spreadsheets",
  slides: "Slides",
  design: "Design",
  research: "Research",
  code: "Code",
  agent: "Agents",
  team: "AI Team",
  site: "Website builder",
};

export function PlansView({
  plans,
  balance,
  usage,
  currentPlan,
  signedIn,
}: {
  plans: Plan[];
  balance: Balance | null;
  usage: UsageRow[];
  currentPlan: string | null;
  signedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function pick(id: string) {
    if (!signedIn) return;
    setBusyId(id);
    startTransition(async () => {
      await choosePlan(id);
      setBusyId(null);
    });
  }

  const pct =
    balance && balance.granted > 0
      ? Math.min(100, Math.round((balance.used / balance.granted) * 100))
      : 0;

  return (
    <div className="mx-auto min-h-screen max-w-[1060px] px-5 py-10 lg:px-8">
      <header className="mb-8 text-center">
        <h1 className="text-[30px] font-semibold tracking-tight text-ink">
          Credits and plans
        </h1>
        <p className="mt-2 text-[14.5px] text-ink-3">
          One credit is 1,000 tokens of actual model usage. Nothing is estimated —
          you are charged what Google reports.
        </p>
      </header>

      {/* ---------------- this month ---------------- */}

      {balance ? (
        <section className="panel nx-in mb-8 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-4">
                This month · {balance.period}
              </p>
              <p className="mt-1.5 text-[27px] font-semibold tabular-nums text-ink">
                {balance.remaining.toLocaleString()}
                <span className="ml-1.5 text-[15px] font-normal text-ink-3">
                  of {balance.granted.toLocaleString()} left
                </span>
              </p>
            </div>
            <p className="text-[13px] text-ink-3">
              {balance.tokensUsed.toLocaleString()} tokens used across{" "}
              {usage.reduce((n, u) => n + u.calls, 0)} calls
            </p>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-sunk">
            <span
              className={cn(
                "block h-full rounded-full transition-[width] duration-500",
                balance.remaining <= 0
                  ? "bg-critical"
                  : pct >= 85
                    ? "bg-caution"
                    : "bg-accent",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          {usage.length ? (
            <ul className="mt-5 space-y-2 border-t border-line pt-4">
              {usage.map((u) => (
                <li
                  key={u.kind}
                  className="flex items-center justify-between gap-3 text-[13.5px]"
                >
                  <span className="text-ink-2">{KIND_LABEL[u.kind] ?? u.kind}</span>
                  <span className="flex items-center gap-3 tabular-nums text-ink-4">
                    <span>{u.calls} calls</span>
                    <span className="text-ink-2">
                      {u.credits.toLocaleString()} cr
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 border-t border-line pt-4 text-[13.5px] text-ink-4">
              Nothing used yet this month.
            </p>
          )}
        </section>
      ) : null}

      {/* ---------------- tiers ---------------- */}

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((t, i) => {
          const active = currentPlan === t.id;
          const paid = t.price > 0;
          const featured = t.id === "pro";

          return (
            <article
              key={t.id}
              className={cn(
                "nx-in relative flex flex-col rounded-[14px] border p-6 transition-transform duration-200 hover:-translate-y-1",
                featured ? "border-accent/45 bg-accent-soft" : "border-line bg-rail",
              )}
              style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}
            >
              {featured ? (
                <span className="absolute -top-2.5 left-6 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-white">
                  Most popular
                </span>
              ) : null}

              <h2 className="text-[16px] font-semibold text-ink">{t.name}</h2>
              <p className="mt-1 min-h-[38px] text-[13px] text-ink-3">{t.blurb}</p>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-[34px] font-semibold tracking-tight text-ink">
                  ${t.price}
                </span>
                <span className="text-[13px] text-ink-4">
                  {t.price === 0 ? "forever" : "per month"}
                </span>
              </div>

              <p className="mt-1 text-[12.5px] font-medium text-accent">
                {t.monthly.toLocaleString()} credits a month
              </p>

              {/* Free can be selected for real. Paid tiers cannot: there is no
                  payment processor, and letting anyone switch to Team for free
                  would make the credit budget meaningless. */}
              {paid ? (
                <span className="mt-5 flex items-center justify-center gap-2 rounded-[9px] border border-line-strong py-2.5 text-[13.5px] font-medium text-ink-4">
                  Coming soon
                </span>
              ) : (
                <button
                  onClick={() => pick(t.id)}
                  disabled={!signedIn || active || pending}
                  className={cn(
                    "mt-5 flex items-center justify-center gap-2 rounded-[9px] py-2.5 text-[13.5px] font-medium transition-colors",
                    active
                      ? "border border-positive/35 text-positive"
                      : "border border-line-strong text-ink hover:bg-hover",
                    (!signedIn || pending) && "opacity-60",
                  )}
                >
                  {busyId === t.id ? (
                    <Ico icon={FiLoader} motion="spin" size={15} className="animate-spin" />
                  ) : null}
                  {active ? "Current plan" : `Switch to ${t.name}`}
                </button>
              )}

              <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[13.5px] text-ink-2">
                    <Ico
                      icon={FiCheck}
                      motion="check"
                      size={15}
                      className="mt-0.5 shrink-0 text-positive"
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      {!signedIn ? (
        <p className="mt-8 text-center text-[13.5px] text-ink-4">
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>{" "}
          to keep your credits between visits.
        </p>
      ) : null}
    </div>
  );
}
