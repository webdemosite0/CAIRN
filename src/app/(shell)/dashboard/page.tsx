import Link from "next/link";
import { FiZap, FiGlobe, FiLink, FiArrowRight } from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";
import { currentUser } from "@/lib/auth";
import { one, num } from "@/lib/db";
import { Bot } from "@/components/agents/bot";

export const metadata = { title: "Dashboard" };

async function count(sql: string, id: string) {
  const row = await one(sql, [id]);
  return num(row?.n);
}

export default async function MePage() {
  const user = await currentUser();

  if (!user) {
    return (
      <div className="nx-in mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center px-5 text-center">
        <Bot size={72} />
        <h1 className="mt-6 text-[22px] font-semibold text-ink">Dashboard</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-3">
          Your crew, your artefacts, your connections.
        </p>
        <Link
          href="/login"
          className="mt-7 rounded-[var(--r-control)] btn-grad px-5 py-2.5 text-[14px] font-medium transition-transform hover:scale-105"
        >
          Log in
        </Link>
      </div>
    );
  }

  // One round trip each, so run them together rather than in series.
  const [agents, sites, integrations] = await Promise.all([
    count(`SELECT COUNT(*) AS n FROM agents WHERE user_id = ?`, user.id),
    count(`SELECT COUNT(*) AS n FROM sites WHERE user_id = ?`, user.id),
    count(`SELECT COUNT(*) AS n FROM integrations WHERE user_id = ?`, user.id),
  ]);

  const cards = [
    { label: "Agents", value: agents, href: "/agents", icon: FiZap, accent: "#3b82f6" },
    { label: "Sites", value: sites, href: "/websites", icon: FiGlobe, accent: "#a78bfa" },
    { label: "Integrations", value: integrations, href: "/integrations", icon: FiLink, accent: "#34d399" },
  ];

  return (
    <div className="nx-in mx-auto min-h-screen max-w-[880px] px-5 py-10 lg:px-8">
      <div className="mb-8 flex items-center gap-4">
        {/* Violet letter on a violet tint measured 3.65:1 in light mode.
            The tint carries the colour; the letter stays ink. */}
        <span className="grid h-14 w-14 place-items-center rounded-full bg-violet/25 text-[20px] font-semibold text-ink">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h1 className="text-[24px] font-semibold text-ink">{user.name}</h1>
          <p className="text-[13.5px] text-ink-3">{user.email}</p>
        </div>
        <Link
          href="/plans"
          className="ml-auto flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2 text-[13px] font-medium capitalize text-accent"
        >
          <HiOutlineSparkles size={14} />
          {user.plan} plan
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c, i) => (
          <Link
            key={c.label}
            href={c.href}
            className="nx-in group rounded-[var(--r-panel)] border border-line bg-rail p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
          >
            <span
              className="grid h-10 w-10 place-items-center rounded-[var(--r-control)]"
              style={{ background: `${c.accent}1f`, color: c.accent }}
            >
              <c.icon size={18} />
            </span>
            <p className="mt-4 text-[28px] font-semibold text-ink">{c.value}</p>
            <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
              {c.label}
              <FiArrowRight
                size={13}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </p>
          </Link>
        ))}
      </div>

      <section className="mt-8 rounded-[var(--r-panel)] border border-line bg-rail p-6">
        <h2 className="mb-1.5 text-[15px] font-semibold text-ink">Start something</h2>
        <p className="mb-5 text-[13.5px] text-ink-3">
          Every tool here produces real output you can use.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {[
            { href: "/websites", label: "Build a website" },
            { href: "/agents", label: "Create an agent" },
            { href: "/team", label: "Run the crew" },
            { href: "/documents", label: "Write a doc" },
            { href: "/code", label: "Write code" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="chip">
              {a.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
