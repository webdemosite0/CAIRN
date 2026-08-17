import Link from "next/link";
import { FiLogOut, FiExternalLink } from "react-icons/fi";
import { currentUser } from "@/lib/auth";
import { logOut } from "@/app/actions/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await currentUser();

  if (!user) {
    return (
      <div className="nx-in mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center px-5 text-center">
        <h1 className="text-[20px] font-semibold text-ink">Settings</h1>
        <p className="mt-2 text-[14px] text-ink-3">Log in to manage your account.</p>
        <Link
          href="/login"
          className="mt-6 rounded-[10px] bg-accent px-5 py-2.5 text-[14px] font-medium text-white"
        >
          Log in
        </Link>
      </div>
    );
  }

  const row = db()
    .prepare(`SELECT created_at FROM users WHERE id = ?`)
    .get(user.id) as { created_at: number } | undefined;

  const joined = row
    ? new Date(row.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="nx-in mx-auto min-h-screen max-w-[680px] px-5 py-10 lg:px-8">
      <h1 className="text-[24px] font-semibold text-ink">Settings</h1>

      <section className="mt-7 rounded-[14px] border border-line bg-rail">
        <h2 className="border-b border-line px-5 py-3.5 text-[13px] font-medium uppercase tracking-[0.06em] text-ink-3">
          Account
        </h2>
        <dl className="divide-y divide-line">
          {[
            { k: "Name", v: user.name },
            { k: "Email", v: user.email },
            { k: "Plan", v: user.plan, capitalize: true },
            { k: "Member since", v: joined },
          ].map((r) => (
            <div key={r.k} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <dt className="text-[13.5px] text-ink-3">{r.k}</dt>
              <dd
                className={`text-[13.5px] text-ink ${r.capitalize ? "capitalize" : ""}`}
              >
                {r.v}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-4 rounded-[14px] border border-line bg-rail">
        <h2 className="border-b border-line px-5 py-3.5 text-[13px] font-medium uppercase tracking-[0.06em] text-ink-3">
          Workspace
        </h2>
        <div className="divide-y divide-line">
          {[
            { href: "/integrations", label: "Integrations", hint: "Connect services" },
            { href: "/plans", label: "Plan and billing", hint: "Change your tier" },
            { href: "/agents", label: "Agents", hint: "Manage your specialists" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-hover"
            >
              <span>
                <span className="block text-[13.5px] text-ink">{l.label}</span>
                <span className="block text-[12px] text-ink-4">{l.hint}</span>
              </span>
              <FiExternalLink size={14} className="text-ink-4" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-[14px] border border-critical/25 bg-critical/6 p-5">
        <h2 className="text-[14px] font-medium text-ink">Session</h2>
        <p className="mt-1 text-[13px] text-ink-3">
          Signs you out on this device.
        </p>
        <form action={logOut} className="mt-4">
          <button className="flex items-center gap-2 rounded-[9px] border border-critical/35 px-4 py-2 text-[13.5px] text-critical transition-colors hover:bg-critical/10">
            <FiLogOut size={14} /> Log out
          </button>
        </form>
      </section>
    </div>
  );
}
