"use client";

import { useState, useTransition } from "react";
import { FiAlertCircle, FiCheck, FiLoader, FiMail } from "react-icons/fi";
import { logOut, resendVerification, type AuthState } from "@/app/actions/auth";
import { TroveOrb } from "@/components/brand/orb";
import { Ico } from "@/components/ui/ico";

/**
 * The wait-for-the-link screen.
 *
 * Shows the address it was sent to, because the commonest reason a
 * confirmation never arrives is a typo the person cannot see from here — so
 * signing out and starting again has to be one click away.
 */
export function VerifyCard({
  email,
  mailerConfigured,
}: {
  email: string;
  mailerConfigured: boolean;
}) {
  const [result, setResult] = useState<AuthState | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="nx-in w-full max-w-[420px] rounded-[var(--r-panel)] border border-line bg-rail p-6 text-center shadow-[0_24px_70px_-20px_rgba(0,0,0,0.85)] sm:p-7">
      <div className="mb-5 flex flex-col items-center">
        <TroveOrb size={40} state="thinking" />
        <h1 className="mt-4 text-[17px] font-semibold text-ink">Confirm your email</h1>
      </div>

      <p className="text-[14px] leading-relaxed text-ink-2">
        We sent a link to
        <br />
        <span className="font-medium text-ink">{email}</span>
      </p>

      <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
        Open it to finish setting up your account. The link works once and
        expires in 24 hours.
      </p>

      {!mailerConfigured ? (
        <div className="mt-5 flex items-start gap-2 rounded-[var(--r-control)] border border-caution/30 bg-caution/10 px-3 py-2.5 text-left">
          <Ico icon={FiAlertCircle} motion="alert" size={14} className="mt-0.5 shrink-0 text-caution" />
          <p className="text-[12.5px] leading-relaxed text-ink-2">
            No mail provider is configured on this deployment, so nothing was
            actually sent. The link is in the server log.
          </p>
        </div>
      ) : null}

      {result?.error ? (
        <div className="mt-5 flex items-start gap-2 rounded-[var(--r-control)] border border-critical/30 bg-critical/10 px-3 py-2.5 text-left">
          <Ico icon={FiAlertCircle} motion="alert" size={14} className="mt-0.5 shrink-0 text-critical" />
          <p className="text-[13px] text-critical">{result.error}</p>
        </div>
      ) : null}

      {result?.notice ? (
        <div className="mt-5 flex items-start gap-2 rounded-[var(--r-control)] border border-positive/30 bg-positive/10 px-3 py-2.5 text-left">
          <Ico icon={FiCheck} motion="check" size={14} className="mt-0.5 shrink-0 text-positive" />
          <p className="text-[13px] text-ink-2">{result.notice}</p>
        </div>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setResult(await resendVerification());
          })
        }
        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[var(--r-control)] border border-line-strong bg-raised text-[14px] font-medium text-ink transition-colors hover:bg-hover disabled:opacity-60"
      >
        {pending ? (
          <Ico icon={FiLoader} motion="spin" size={15} className="animate-spin" />
        ) : (
          <Ico icon={FiMail} motion="mail" size={15} />
        )}
        Send it again
      </button>

      <form action={logOut}>
        <button
          type="submit"
          className="mt-3 text-[13px] text-ink-3 underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink"
        >
          Wrong address? Sign out and start again
        </button>
      </form>
    </div>
  );
}
