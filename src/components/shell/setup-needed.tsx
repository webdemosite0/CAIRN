import { FiDatabase, FiExternalLink } from "react-icons/fi";

/**
 * Shown instead of a blank 500 when the database cannot be reached.
 *
 * A misconfigured deploy previously rendered Vercel's generic "This page
 * couldn't load", which says nothing actionable — the real cause only existed
 * in the function logs. Every page in the app reads the account and credit
 * balance, so one missing variable took the whole site down silently.
 */
export function SetupNeeded({ detail }: { detail: string }) {
  const steps = [
    "turso db create trove",
    "turso db show trove --url      # -> TURSO_DATABASE_URL",
    "turso db tokens create trove   # -> TURSO_AUTH_TOKEN",
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-[620px] flex-col justify-center px-5 py-16">
      <span className="grid h-14 w-14 place-items-center rounded-[16px] bg-caution/15 text-caution">
        <FiDatabase size={26} />
      </span>

      <h1 className="mt-6 text-[26px] font-semibold tracking-tight text-ink">
        Trove needs a database
      </h1>

      <p className="mt-3 text-[14.5px] leading-relaxed text-ink-3">
        The app is deployed and running, but it cannot reach a database — so
        there is nowhere to keep accounts, saved conversations or credits.
      </p>

      <pre className="mt-5 overflow-x-auto rounded-[12px] border border-line bg-sunk px-4 py-3 text-[12.5px] leading-relaxed text-ink-2">
        {detail}
      </pre>

      <p className="mt-6 text-[14px] font-medium text-ink">
        On a serverless host, create a free Turso database:
      </p>

      <pre className="mt-3 overflow-x-auto rounded-[12px] border border-line bg-sunk px-4 py-3 font-mono text-[12.5px] leading-[1.9] text-ink-2">
        {steps.join("\n")}
      </pre>

      <p className="mt-4 text-[14px] leading-relaxed text-ink-3">
        Add <code className="rounded-[5px] bg-sunk px-1.5 py-0.5 font-mono text-[13px] text-accent">TURSO_DATABASE_URL</code>{" "}
        and <code className="rounded-[5px] bg-sunk px-1.5 py-0.5 font-mono text-[13px] text-accent">TURSO_AUTH_TOKEN</code>{" "}
        to your environment variables, then redeploy — variables only apply to
        new builds.
      </p>

      <p className="mt-5 text-[13.5px] text-ink-4">
        Self-hosting with a volume instead? Set{" "}
        <code className="font-mono">TROVE_DATA_DIR</code> to a writable path.{" "}
        <a
          href="/api/health"
          className="inline-flex items-center gap-1 text-accent hover:underline"
        >
          Check /api/health <FiExternalLink size={11} />
        </a>
      </p>
    </div>
  );
}
