import Link from "next/link";

import { currentUser } from "@/lib/auth";
import {
  myBalance,
  periodResetsAt,
  usageByDay,
  usageByKind,
} from "@/lib/credits";
import { kindLabel } from "@/lib/kind-label";
import { Panel } from "@/components/settings/panel";
import { SignedOut } from "@/components/settings/signed-out";
import { UsageChart } from "@/components/settings/usage-chart";
import { cn } from "@/lib/utils";

export const metadata = { title: "Usage & credits" };

const RANGES = [7, 14, 30] as const;

export default async function UsageSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const user = await currentUser();
  if (!user) return <SignedOut />;

  const { days: raw } = await searchParams;
  const asked = Number(raw);
  // Only the three offered ranges. An arbitrary ?days=100000 would otherwise
  // build a hundred thousand buckets in memory to draw a chart nobody asked
  // for.
  const days = (RANGES as readonly number[]).includes(asked) ? asked : 14;

  const [balance, byKind, byDay] = await Promise.all([
    myBalance(),
    usageByKind(user.id),
    usageByDay(user.id, days),
  ]);

  if (!balance) return <SignedOut />;

  const { granted, used, remaining, plan } = balance;
  const pct = granted > 0 ? Math.min(100, Math.round((used / granted) * 100)) : 0;
  const level = remaining <= 0 ? "out" : pct >= 85 ? "low" : "ok";
  const resets = periodResetsAt().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalCredits = byKind.reduce((s, r) => s + r.credits, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Credits" description={`On the ${plan.name} plan.`}>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-[34px] font-semibold leading-none tabular-nums",
                level === "out"
                  ? "text-critical"
                  : level === "low"
                    ? "text-caution"
                    : "text-ink",
              )}
            >
              {remaining.toLocaleString()}
            </span>
            <span className="text-[14px] text-ink-4">
              / {granted.toLocaleString()}
            </span>
          </div>

          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-sunk"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${remaining.toLocaleString()} of ${granted.toLocaleString()} credits left`}
          >
            <div
              className={cn(
                "h-full rounded-full",
                level === "out"
                  ? "bg-critical"
                  : level === "low"
                    ? "bg-caution"
                    : "bg-accent",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="mt-3 text-[12.5px] text-ink-4">
            {pct}% used · resets {resets}
          </p>
        </Panel>

        <Panel
          title="By feature"
          description="Where this month's credits went."
        >
          {byKind.length ? (
            <ul className="space-y-2.5">
              {byKind.map((r) => {
                const share = totalCredits
                  ? Math.round((r.credits / totalCredits) * 100)
                  : 0;
                return (
                  <li key={r.kind}>
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="truncate text-ink-2">
                        {kindLabel(r.kind)}
                      </span>
                      <span className="shrink-0 tabular-nums text-ink-4">
                        {share}%
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-sunk">
                      <div
                        className="h-full rounded-full bg-accent/70"
                        style={{ width: `${Math.max(share, 2)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-4">
              Nothing used yet this month.
            </p>
          )}
        </Panel>
      </div>

      <Panel
        title="History"
        description="Credits spent per day."
        footer={
          <>
            <span className="text-[12.5px] text-ink-4">
              Days with no activity are shown as empty, not skipped.
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {RANGES.map((r) => (
                <Link
                  key={r}
                  href={`/settings/usage?days=${r}`}
                  scroll={false}
                  aria-current={r === days ? "true" : undefined}
                  className={cn(
                    "rounded-[var(--r-chip)] px-2.5 py-1 text-[12.5px] transition-colors",
                    r === days
                      ? "bg-hover font-medium text-ink"
                      : "text-ink-3 hover:bg-hover hover:text-ink",
                  )}
                >
                  {r}d
                </Link>
              ))}
            </div>
          </>
        }
      >
        <UsageChart data={byDay} />
      </Panel>
    </div>
  );
}
