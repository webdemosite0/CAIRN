"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle, FiCheck, FiLoader } from "react-icons/fi";
import { logIn, signUp, type AuthState } from "@/app/actions/auth";
import { TroveOrb } from "@/components/brand/orb";
import { Ico } from "@/components/ui/ico";
import { PasswordField } from "@/components/auth/password-field";

const field =
  "h-12 w-full rounded-[8px] border border-line-strong bg-sunk px-3.5 text-[16px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-accent sm:text-[14.5px]";

/**
 * Codes come back on the URL from the Google callback, which cannot render a
 * message of its own. Anything unrecognised falls through to a generic line
 * rather than being echoed — the query string is attacker-controlled.
 */
const OAUTH_ERRORS: Record<string, string> = {
  "google-unconfigured": "Google sign-in is not set up on this deployment yet.",
  "google-cancelled": "Google sign-in was cancelled.",
  "google-state": "That sign-in attempt expired. Please try again.",
  "google-exchange": "Google could not complete the sign-in. Please try again.",
  "google-unverified":
    "That Google account has no confirmed email address, so it cannot be used to sign in.",
};

export function AuthCard({
  mode,
  googleEnabled = false,
  oauthError,
  next,
  justVerified = false,
}: {
  mode: "login" | "signup";
  googleEnabled?: boolean;
  oauthError?: string;
  next?: string;
  justVerified?: boolean;
}) {
  const isLogin = mode === "login";
  const [state, action, pending] = useActionState<AuthState, FormData>(
    isLogin ? logIn : signUp,
    {},
  );

  const urlError = oauthError
    ? (OAUTH_ERRORS[oauthError] ?? "Sign-in failed. Please try again.")
    : null;
  const error = state.error ?? urlError;

  return (
    <div className="nx-in w-full max-w-[420px] rounded-[12px] border border-line bg-rail p-6 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.85)] sm:p-7">
      <div className="mb-6 flex flex-col items-center">
        <TroveOrb size={40} state="idle" />
        <h1 className="mt-4 text-center text-[17px] font-semibold text-ink">
          {isLogin ? "Log in to Trove" : "Create your Trove account"}
        </h1>
      </div>

      {justVerified ? (
        <div className="mb-5 flex items-start gap-2 rounded-[8px] border border-positive/30 bg-positive/10 px-3 py-2.5">
          <Ico icon={FiCheck} motion="check" size={14} className="mt-0.5 shrink-0 text-positive" />
          <p className="text-[13px] text-ink-2">
            Email confirmed. Sign in to get started.
          </p>
        </div>
      ) : null}

      {googleEnabled ? (
        // A plain link, not a fetch: the OAuth redirect has to be a real
        // top-level navigation for Google to show its account chooser.
        <a
          href="/api/auth/google"
          className="flex h-12 w-full items-center justify-center gap-3 rounded-[8px] border border-line-strong bg-raised text-[14.5px] font-medium text-ink transition-colors hover:bg-hover"
        >
          <FcGoogle size={19} /> Continue with Google
        </a>
      ) : (
        <button
          type="button"
          className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-3 rounded-[8px] border border-line-strong bg-raised text-[14.5px] font-medium text-ink opacity-60"
          disabled
          title="Google sign-in is not configured on this deployment"
        >
          <FcGoogle size={19} /> Continue with Google
        </button>
      )}

      <div className="my-5 flex items-center gap-3 text-[12px] text-ink-3">
        <span className="h-px flex-1 bg-line-strong" />
        OR
        <span className="h-px flex-1 bg-line-strong" />
      </div>

      <p className="mb-4 text-center text-[15px] font-semibold text-ink">
        {isLogin ? "Log in with email" : "Sign up with email"}
      </p>

      <form action={action} className="space-y-3">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {!isLogin ? (
          <input
            className={field}
            name="name"
            placeholder="Full name"
            autoComplete="name"
            required
          />
        ) : null}

        <input
          className={field}
          name="email"
          type="email"
          placeholder="Email address"
          autoComplete="email"
          required
        />

        <PasswordField
          className={field}
          placeholder={isLogin ? "Password" : "Password (8+ characters)"}
          autoComplete={isLogin ? "current-password" : "new-password"}
          showStrength={!isLogin}
        />

        {error ? (
          <div className="flex items-start gap-2 rounded-[8px] border border-critical/30 bg-critical/10 px-3 py-2.5">
            <Ico icon={FiAlertCircle} motion="alert" size={14} className="mt-0.5 shrink-0 text-critical" />
            <p className="text-[13px] text-critical">{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] btn-grad text-[15px] font-semibold transition-colors disabled:opacity-60"
        >
          {pending ? <Ico icon={FiLoader} motion="spin" size={16} className="animate-spin" /> : null}
          {isLogin ? "Log In" : "Sign Up"}
        </button>
      </form>

      <p className="mt-5 text-center text-[13.5px] text-ink-3">
        {isLogin ? (
          <>
            New here?{" "}
            <Link href="/signup" className="text-accent hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-ink-4">
        Agree to{" "}
        <span className="text-ink-3 underline decoration-line-strong">
          Terms of Service
        </span>{" "}
        and{" "}
        <span className="text-ink-3 underline decoration-line-strong">
          Privacy Policy
        </span>
      </p>
    </div>
  );
}
