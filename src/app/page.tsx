import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { FiArrowRight } from "react-icons/fi";
import {
  TbRobot,
  TbUsers,
  TbFileText,
  TbTable,
  TbCode,
  TbSearch,
} from "react-icons/tb";
import { Wordmark } from "@/components/brand/logo";
import { Backdrop } from "@/components/shell/backdrop";
import { Aurora } from "@/components/shell/aurora";
import { ThemeToggle } from "@/components/shell/theme";
import { Ico } from "@/components/ui/ico";
import { PLANS } from "@/lib/credits";

/**
 * The landing page, for people who have not signed in.
 *
 * Deliberately outside the (shell) group so it carries no sidebar — this is a
 * page about the product, not a page of it. Anyone with a session is sent
 * straight to /chat instead; they have already read this.
 */

const TOOLS = [
  { icon: TbRobot, name: "AI agents", copy: "Specialists with their own brief, memory and chat page." },
  { icon: TbUsers, name: "AI team", copy: "Four agents take one task and each answer for their own discipline." },
  { icon: TbFileText, name: "Documents", copy: "A written document you download as real Word .docx." },
  { icon: TbTable, name: "Spreadsheets", copy: "An editable grid you export as real Excel .xlsx." },
  { icon: TbCode, name: "Code", copy: "Complete, runnable code — no placeholders left behind." },
  { icon: TbSearch, name: "Research", copy: "Findings separated from what could not be verified." },
];

export default async function Landing() {
  // The middleware hands everyone a guest id, so a session cookie — not the
  // presence of an identity — is what distinguishes a returning user.
  const jar = await cookies();
  if (jar.has("nx_session")) redirect("/chat");

  const free = PLANS[0];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Backdrop />
      <Aurora />

      <header className="relative mx-auto flex max-w-[1080px] items-center justify-between px-5 py-5 lg:px-8">
        <Wordmark size={22} sweep={false} className="text-ink" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-[8px] px-3 py-2 text-[13.5px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1080px] px-5 pb-24 lg:px-8">
        <section className="nx-rise pt-16 text-center sm:pt-24">
          <Wordmark className="mx-auto" size={64} />
          <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
            An AI workspace that builds real things and keeps them. Chat,
            agents, documents you can open in Word, spreadsheets you can open in
            Excel — and every conversation saved exactly as you left it.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/chat"
              className="group flex items-center gap-2 rounded-[10px] bg-accent px-6 py-3 text-[14.5px] font-medium text-white shadow-[var(--elev)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.99]"
            >
              Start without an account
              <FiArrowRight
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/signup"
              className="rounded-[10px] border border-line-strong px-6 py-3 text-[14.5px] font-medium text-ink transition-colors hover:bg-hover"
            >
              Create an account
            </Link>
          </div>

          <p className="mt-4 text-[13px] text-ink-4">
            No card. {free.monthly} credits a month on the free plan.
          </p>
        </section>

        <section className="mt-24 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t, i) => (
            <article
              key={t.name}
              className="panel nx-in p-5"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
            >
              <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-accent/10 text-accent">
                <Ico icon={t.icon} motion="pop" size={19} />
              </span>
              <h2 className="mt-4 text-[15px] font-semibold text-ink">{t.name}</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">{t.copy}</p>
            </article>
          ))}
        </section>

        <section className="panel mt-20 px-8 py-10 text-center">
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">
            Your work stays where you left it
          </h2>
          <p className="mx-auto mt-3 max-w-[54ch] text-[14.5px] leading-relaxed text-ink-3">
            Ask the same question twice and a model gives two different answers.
            So CAIRN stores the exchange, not the prompt — reopen a thread and
            it is the reply you came back for, not a new one.
          </p>
          <Link
            href="/chat"
            className="mt-7 inline-flex items-center gap-2 rounded-[10px] bg-accent px-6 py-3 text-[14.5px] font-medium text-white transition-[filter] hover:brightness-110"
          >
            Try it now
            <FiArrowRight size={15} />
          </Link>
        </section>
      </main>

      <footer className="relative border-t border-line">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[13px] text-ink-4 lg:px-8">
          <span>CAIRN — a marker for the way back.</span>
          <nav className="flex gap-4">
            <Link href="/plans" className="transition-colors hover:text-ink-2">Pricing</Link>
            <Link href="/login" className="transition-colors hover:text-ink-2">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
