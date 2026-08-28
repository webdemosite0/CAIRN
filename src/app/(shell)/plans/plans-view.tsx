"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiArrowRight,
  FiCheck,
  FiCreditCard,
  FiExternalLink,
  FiLoader,
  FiZap,
} from "react-icons/fi";
import { choosePlan } from "@/app/actions/billing";
import { Ico } from "@/components/ui/ico";
import { FailureNote } from "@/components/ui/failure-note";
import { cn } from "@/lib/utils";
import type { Balance, Plan, UsageRow } from "@/lib/credits";
import { kindLabel } from "@/lib/kind-label";

interface Subscription {
  customerId: string;
  subscriptionId: string;
  status: string;
  endsAt: number | null;
}

/** Stripe's status strings, said the way a person would say them. */
const STATUS_LABEL: Record<string, { text: string; tone: string; dot: string }> = {
  active: { text: "Active", tone: "text-positive", dot: "bg-positive" },
  trialing: { text: "Trial", tone: "text-accent", dot: "bg-accent" },
  past_due: { text: "Payment failed", tone: "text-caution", dot: "bg-caution" },
  incomplete: { text: "Awaiting payment", tone: "text-caution", dot: "bg-caution" },
  unpaid: { text: "Unpaid", tone: "text-critical", dot: "bg-critical" },
  canceled: { text: "Cancelled", tone: "text-ink-4", dot: "bg-ink-4" },
};

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PlansView({
  plans,
  balance,
  usage,
  currentPlan,
  signedIn,
  stripeReady,
  purchasable,
  subscription,
  checkout,
}: {
  plans: Plan[];
  balance: Balance | null;
  usage: UsageRow[];
  currentPlan: string | null;
  signedIn: boolean;
  stripeReady: boolean;
  purchasable: Record<string, boolean>;
  subscription: Subscription | null;
  checkout: "done" | "cancelled" | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Coming back from Stripe, the plan may not have landed yet: the webhook is
     a separate request and can arrive after the redirect. Rather than showing
     the old plan and looking broken, wait for it — but for a bounded time, and
     then say plainly that it is taking longer than expected. */
  const paidNow = Boolean(currentPlan && currentPlan !== "free");
  const [waiting, setWaiting] = useState(checkout === "done" && !paidNow);
  const tries = useRef(0);

  useEffect(() => {
    if (!waiting) return;
    if (paidNow || tries.current >= 8) {
      setWaiting(false);
      return;
    }
    const t = setTimeout(() => {
      tries.current += 1;
      router.refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [waiting, paidNow, router, currentPlan]);

  async function go(path: string, body?: unknown) {
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }
      // A full navigation, not a router push: Stripe is a different origin.
      // assign() rather than setting .href — the compiler treats assigning to a
      // value from outside the component as a mutation and rejects it.
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function subscribe(id: string) {
    setBusyId(id);
    void go("/api/billing/checkout", { plan: id }).finally(() => setBusyId(null));
  }

  function manage() {
    setBusyId("portal");
    void go("/api/billing/portal").finally(() => setBusyId(null));
  }

  function downgrade() {
    setBusyId("free");
    startTransition(async () => {
      const res = await choosePlan("free");
      if (res && "error" in res && res.error) setError(res.error);
      setBusyId(null);
    });
  }

  const pct =
    balance && balance.granted > 0
      ? Math.min(100, Math.round((balance.used / balance.granted) * 100))
      : 0;
  const low = balance ? balance.remaining <= 0 : false;
  const nearly = !low && pct >= 85;

  const status = subscription?.status ? STATUS_LABEL[subscription.status] : null;
  const hasBilling = Boolean(subscription?.customerId);

  return (
    <div className="relative mx-auto min-h-screen max-w-[1100px] px-5 py-10 lg:px-8">
      {/* A single soft wash behind the header. Enough to stop the page reading
          as a spreadsheet; not enough to fight the cards for attention. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[320px] opacity-70 [background:radial-gradient(60%_100%_at_50%_0%,var(--color-accent-soft),transparent_70%)]"
      />

      <header className="mb-9 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-rail px-3 py-1 text-[11.5px] font-medium text-ink-3">
          <Ico icon={FiZap} motion="sparkle" size={12} className="text-accent" live />
          Pay for what the model actually used
        </span>
        <h1 className="mt-4 text-[32px] font-semibold tracking-tight text-ink sm:text-[36px]">
          Credits and plans
        </h1>
        <p className="mx-auto mt-2.5 max-w-[560px] text-[14.5px] leading-relaxed text-ink-3">
          One credit is 1,000 tokens of real usage. Nothing is estimated and
          nothing is charged per request — you are billed for what the model
          reports, and a one-line question costs a fraction of a build.
        </p>
      </header>

      {/* ---------------- returning from Stripe ---------------- */}

      {checkout === "cancelled" ? (
        <div className="nx-in mb-6 flex items-center gap-2.5 rounded-[var(--r-panel)] border border-line bg-rail px-4 py-3">
          <span className="size-1.5 shrink-0 rounded-full bg-ink-4" />
          <p className="text-[13.5px] text-ink-2">
            Checkout was cancelled. Nothing was charged.
          </p>
        </div>
      ) : null}

      {checkout === "done" && waiting ? (
        <div className="nx-in mb-6 flex items-center gap-3 rounded-[var(--r-panel)] border border-accent/30 bg-accent-soft px-4 py-3">
          <Ico
            icon={FiLoader}
            motion="spin"
            size={15}
            className="shrink-0 animate-spin text-accent"
          />
          <p className="text-[13.5px] text-ink-2">
            Payment received. Activating your plan — this usually takes a second.
          </p>
        </div>
      ) : null}

      {checkout === "done" && !waiting && !paidNow ? (
        <FailureNote
          className="mb-6"
          error="Your payment went through, but the plan has not switched over yet. Stripe sometimes takes a minute to confirm. Refresh shortly — and if it is still on the old plan, open the billing portal, which shows the real subscription."
        />
      ) : null}

      {checkout === "done" && paidNow ? (
        <div className="nx-in mb-6 flex items-center gap-2.5 rounded-[var(--r-panel)] border border-positive/30 bg-positive/10 px-4 py-3">
          <Ico icon={FiCheck} motion="check" size={15} className="shrink-0 text-positive" />
          <p className="text-[13.5px] text-ink-2">
            You are on {plans.find((p) => p.id === currentPlan)?.name ?? "your new plan"}. The
            new credits are available now.
          </p>
        </div>
      ) : null}

      {error ? <FailureNote className="mb-6" error={error} /> : null}

      {/* ---------------- this month ---------------- */}

      {balance ? (
        <section className="panel nx-in mb-5 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-4">
                This month · {balance.period}
              </p>
              <p className="mt-1.5 text-[28px] font-semibold tabular-nums text-ink">
                {balance.remaining.toLocaleString()}
                <span className="ml-1.5 text-[15px] font-normal text-ink-3">
                  of {balance.granted.toLocaleString()} left
                </span>
              </p>
            </div>
            <p className="text-[13px] text-ink-3">
              {balance.tokensUsed.toLocaleString()} tokens across{" "}
              {usage.reduce((n, u) => n + u.calls, 0)} calls
            </p>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-sunk">
            <span
              className={cn(
                "block h-full rounded-full transition-[width] duration-700",
                low ? "bg-critical" : nearly ? "bg-caution" : "bg-accent",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          {low || nearly ? (
            <p className={cn("mt-2.5 text-[12.5px]", low ? "text-critical" : "text-caution")}>
              {low
                ? "You have used everything for this month. Credits reset on the 1st."
                : `${100 - pct}% left — worth topping up before you run out mid-task.`}
            </p>
          ) : null}

          {usage.length ? (
            <ul className="mt-5 space-y-2 border-t border-line pt-4">
              {usage.map((u) => (
                <li
                  key={u.kind}
                  className="flex items-center justify-between gap-3 text-[13.5px]"
                >
                  <span className="text-ink-2">{kindLabel(u.kind)}</span>
                  <span className="flex items-center gap-3 tabular-nums text-ink-4">
                    <span>{u.calls} calls</span>
                    <span className="text-ink-2">{u.credits.toLocaleString()} cr</span>
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

      {/* ---------------- current subscription ---------------- */}

      {hasBilling ? (
        <section className="nx-in mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[var(--r-panel)] border border-line bg-rail px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-accent/12">
              <Ico icon={FiCreditCard} motion="tick" size={16} className="text-accent" />
            </span>
            <div>
              <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                Subscription
                {status ? (
                  <span
                    className={cn("inline-flex items-center gap-1.5 text-[12.5px]", status.tone)}
                  >
                    <span className={cn("size-1.5 rounded-full", status.dot)} />
                    {status.text}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-3">
                {subscription?.status === "past_due"
                  ? "The last payment did not go through. Update the card to avoid losing access."
                  : subscription?.endsAt
                    ? `Renews on ${formatDate(subscription.endsAt)}`
                    : "Manage payment method, invoices and cancellation."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={manage}
            disabled={busyId === "portal"}
            className="group inline-flex h-9 items-center gap-2 rounded-[var(--r-control)] border border-line-strong bg-raised px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-hover disabled:opacity-60"
          >
            {busyId === "portal" ? (
              <Ico icon={FiLoader} motion="spin" size={14} className="animate-spin" />
            ) : (
              <Ico icon={FiExternalLink} motion="launch" size={14} />
            )}
            Manage billing
          </button>
        </section>
      ) : null}

      {/* ---------------- tiers ---------------- */}

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((t, i) => {
          const active = currentPlan === t.id;
          const paid = t.price > 0;
          const featured = t.id === "pro";
          const buyable = paid ? Boolean(purchasable[t.id]) : true;

          return (
            <article
              key={t.id}
              className={cn(
                "nx-in group relative flex flex-col rounded-[var(--r-panel)] border p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1",
                featured
                  ? "border-accent/45 bg-accent-soft shadow-[0_20px_60px_-30px_var(--color-accent)] hover:shadow-[0_28px_70px_-28px_var(--color-accent)]"
                  : "border-line bg-rail hover:border-line-strong",
                active && !featured && "border-positive/40",
              )}
              style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}
            >
              <div className="absolute -top-2.5 left-6 flex gap-2">
                {featured ? (
                  <span className="rounded-full btn-grad px-2.5 py-0.5 text-[11px] font-medium">
                    Most popular
                  </span>
                ) : null}
                {active ? (
                  <span className="rounded-full border border-positive/40 bg-rail px-2.5 py-0.5 text-[11px] font-medium text-positive">
                    Your plan
                  </span>
                ) : null}
              </div>

              <h2 className="text-[16px] font-semibold text-ink">{t.name}</h2>
              <p className="mt-1 min-h-[38px] text-[13px] leading-relaxed text-ink-3">
                {t.blurb}
              </p>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-[36px] font-semibold tracking-tight text-ink">
                  ${t.price}
                </span>
                <span className="text-[13px] text-ink-4">
                  {t.price === 0 ? "forever" : "per month"}
                </span>
              </div>

              <p className="mt-1 text-[12.5px] font-medium text-accent">
                {t.monthly.toLocaleString()} credits a month
              </p>

              <PlanButton
                active={active}
                paid={paid}
                buyable={buyable}
                stripeReady={stripeReady}
                signedIn={signedIn}
                busy={busyId === t.id}
                pending={pending}
                name={t.name}
                featured={featured}
                hasBilling={hasBilling}
                onSubscribe={() => subscribe(t.id)}
                onDowngrade={downgrade}
                onManage={manage}
              />

              <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-2">
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

      {/* ---------------- honest footnotes ---------------- */}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Note title="Credits do not roll over">
          Each plan grants its credits at the start of the calendar month. Anything
          unused at the end of the month is not carried forward.
        </Note>
        <Note title="Cancel whenever">
          Cancelling in the billing portal stops the next charge and keeps your plan
          running until the period you already paid for ends.
        </Note>
        <Note title="Failed calls are not charged">
          Credits are debited from the usage the model reports. If a request errors
          or every provider is busy, nothing is deducted.
        </Note>
        <Note title="Payments are handled by Stripe">
          Card details go to Stripe and never touch Trove&rsquo;s servers or database.
        </Note>
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

function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[var(--r-panel)] border border-line bg-rail/60 px-4 py-3.5">
      <p className="text-[13px] font-medium text-ink">{title}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{children}</p>
    </div>
  );
}

/**
 * The one control that changes what someone pays.
 *
 * Every branch here is a real state of the deployment, not decoration: a paid
 * plan with no Stripe key configured cannot say "Upgrade", and someone with a
 * live subscription is sent to the portal rather than to a second checkout that
 * would charge them twice.
 */
function PlanButton({
  active,
  paid,
  buyable,
  stripeReady,
  signedIn,
  busy,
  pending,
  name,
  featured,
  hasBilling,
  onSubscribe,
  onDowngrade,
  onManage,
}: {
  active: boolean;
  paid: boolean;
  buyable: boolean;
  stripeReady: boolean;
  signedIn: boolean;
  busy: boolean;
  pending: boolean;
  name: string;
  featured: boolean;
  hasBilling: boolean;
  onSubscribe: () => void;
  onDowngrade: () => void;
  onManage: () => void;
}) {
  const base =
    "mt-5 flex h-10 items-center justify-center gap-2 rounded-[var(--r-control)] text-[13.5px] font-medium transition-colors";

  if (!signedIn) {
    return (
      <Link
        href="/login"
        className={cn(base, "border border-line-strong text-ink hover:bg-hover")}
      >
        Log in to choose
      </Link>
    );
  }

  if (active) {
    const manageable = paid && hasBilling;
    return (
      <button
        type="button"
        onClick={manageable ? onManage : undefined}
        disabled={!manageable}
        className={cn(
          base,
          "border border-positive/35 text-positive",
          manageable ? "hover:bg-hover" : "cursor-default",
        )}
      >
        <Ico icon={FiCheck} motion="check" size={15} />
        {manageable ? "Manage plan" : "Current plan"}
      </button>
    );
  }

  if (!paid) {
    return (
      <button
        type="button"
        onClick={onDowngrade}
        disabled={pending}
        className={cn(
          base,
          "border border-line-strong text-ink hover:bg-hover disabled:opacity-60",
        )}
      >
        {busy ? <Ico icon={FiLoader} motion="spin" size={15} className="animate-spin" /> : null}
        Switch to Free
      </button>
    );
  }

  // Paid, and this deployment cannot take money for it. Say which piece is
  // missing rather than showing a button that fails on click.
  if (!buyable) {
    return (
      <span
        className={cn(base, "cursor-not-allowed border border-line-strong text-ink-4")}
        title={
          stripeReady
            ? `No Stripe price is configured for ${name} on this deployment.`
            : "Stripe is not configured on this deployment."
        }
      >
        Not available yet
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onSubscribe}
      disabled={busy}
      className={cn(
        base,
        featured ? "btn-grad font-semibold" : "border border-line-strong text-ink hover:bg-hover",
        "disabled:opacity-60",
      )}
    >
      {busy ? (
        <Ico icon={FiLoader} motion="spin" size={15} className="animate-spin" />
      ) : (
        <Ico icon={FiArrowRight} motion="nudge" size={15} />
      )}
      {busy ? "Opening checkout…" : `Upgrade to ${name}`}
    </button>
  );
}
