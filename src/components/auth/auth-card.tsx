"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FiAlertCircle, FiLoader } from "react-icons/fi";
import { logIn, signUp, type AuthState } from "@/app/actions/auth";
import { TroveOrb } from "@/components/brand/orb";

const field =
  "h-12 w-full rounded-[8px] border border-line-strong bg-sunk px-3.5 text-[14.5px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-accent";

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const isLogin = mode === "login";
  const [state, action, pending] = useActionState<AuthState, FormData>(
    isLogin ? logIn : signUp,
    {},
  );

  return (
    <div className="nx-in w-full max-w-[420px] rounded-[12px] border border-line bg-rail p-7 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.85)]">
      <div className="mb-6 flex flex-col items-center">
        <TroveOrb size={40} state="idle" />
        <h1 className="mt-4 text-[17px] font-semibold text-ink">
          {isLogin ? "Log in to Trove" : "Create your Trove account"}
        </h1>
      </div>

      <button
        type="button"
        className="flex h-12 w-full items-center justify-center gap-3 rounded-[8px] border border-line-strong bg-raised text-[14.5px] font-medium text-ink transition-colors hover:bg-hover"
        disabled
        title="Coming soon"
      >
        <FcGoogle size={19} /> Continue with Google
        <span className="ml-1 rounded-full border border-line px-2 py-0.5 text-[10.5px] text-ink-4">Soon</span>
      </button>

      <div className="my-5 flex items-center gap-3 text-[12px] text-ink-3">
        <span className="h-px flex-1 bg-line-strong" />
        OR
        <span className="h-px flex-1 bg-line-strong" />
      </div>

      <p className="mb-4 text-center text-[15px] font-semibold text-ink">
        {isLogin ? "Log in with email" : "Sign up with email"}
      </p>

      <form action={action} className="space-y-3">
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

        <input
          className={field}
          name="password"
          type="password"
          placeholder={isLogin ? "Password" : "Password (8+ characters)"}
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={8}
          required
        />

        {state.error ? (
          <div className="flex items-start gap-2 rounded-[8px] border border-critical/30 bg-critical/10 px-3 py-2.5">
            <FiAlertCircle size={14} className="mt-0.5 shrink-0 text-critical" />
            <p className="text-[13px] text-critical">{state.error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] btn-grad text-[15px] font-semibold transition-colors disabled:opacity-60"
        >
          {pending ? <FiLoader size={16} className="animate-spin" /> : null}
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
