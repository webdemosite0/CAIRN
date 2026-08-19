import Link from "next/link";
import { redirect } from "next/navigation";
import { FiAlertCircle } from "react-icons/fi";
import { consumeToken, markVerified } from "@/lib/auth";
import { TroveOrb } from "@/components/brand/orb";

export const metadata = { title: "Confirming your email" };
export const dynamic = "force-dynamic";

/**
 * Where the emailed link lands.
 *
 * Redeeming does not require a session: people open confirmation links in
 * whichever browser their mail client hands them, which is routinely not the
 * one they signed up in. The token itself is the proof.
 *
 * It does not start a session either — proving the address is not the same as
 * proving possession of the account, and a link sitting in an inbox should not
 * be a way in. Verified, then sign in.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (token) {
    const result = await consumeToken(token, "verify-email");
    if ("userId" in result) {
      await markVerified(result.userId);
      redirect("/login?verified=1");
    }
  }

  const reason = !token
    ? "That link is missing its token."
    : "That link has already been used, or it expired.";

  return (
    <div className="nx-in w-full max-w-[420px] rounded-[12px] border border-line bg-rail p-6 text-center shadow-[0_24px_70px_-20px_rgba(0,0,0,0.85)] sm:p-7">
      <div className="mb-5 flex flex-col items-center">
        <TroveOrb size={40} state="error" />
        <h1 className="mt-4 text-[17px] font-semibold text-ink">
          Could not confirm that link
        </h1>
      </div>

      <div className="flex items-start gap-2 rounded-[8px] border border-critical/30 bg-critical/10 px-3 py-2.5 text-left">
        <FiAlertCircle size={14} className="mt-0.5 shrink-0 text-critical" />
        <p className="text-[13px] text-critical">{reason}</p>
      </div>

      <p className="mt-4 text-[13.5px] leading-relaxed text-ink-3">
        Sign in and we will send you a fresh one.
      </p>

      <Link
        href="/login"
        className="mt-5 flex h-11 w-full items-center justify-center rounded-[8px] btn-grad text-[14.5px] font-semibold"
      >
        Go to sign in
      </Link>
    </div>
  );
}
