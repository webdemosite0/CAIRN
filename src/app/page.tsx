import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { FiArrowRight, FiDownload, FiCornerDownLeft } from "react-icons/fi";
import {
  TbRobot,
  TbUsers,
  TbFileText,
  TbTable,
  TbPresentation,
  TbCode,
  TbSearch,
} from "react-icons/tb";
import { Wordmark } from "@/components/brand/logo";
import { Backdrop } from "@/components/shell/backdrop";
import { ThemeToggle } from "@/components/shell/theme";
import { Ico } from "@/components/ui/ico";
import { PLANS } from "@/lib/credits";

/**
 * The landing page, for people who have not signed in.
 *
 * Deliberately outside the (shell) group so it carries no sidebar — this is a
 * page about the product, not a page of it. Anyone with a session is sent
 * straight to /chat instead; they have already read this.
 *
 * The layout is asymmetric on purpose. A centred column of text sitting above
 * three identical icon cards is the shape every generated landing page takes,
 * and it says nothing about what this particular product does. Here the hero
 * carries a picture of the actual output instead, and the grid is weighted so
 * the eye has somewhere to land first.
 */

/** The formats it really writes. Every one of these is a genuine file rather
 *  than a copy button, which is the one claim worth leading with. */
const FORMATS = [
  { ext: ".docx", label: "Word" },
  { ext: ".xlsx", label: "Excel" },
  { ext: ".pptx", label: "PowerPoint" },
  { ext: ".zip", label: "Site" },
];

const BENTO = [
  {
    icon: TbPresentation,
    name: "Slides",
    copy: "A deck you can present full screen, with speaker notes — then download as PowerPoint.",
    wide: true,
  },
  { icon: TbFileText, name: "Documents", copy: "Outline, word count, real Word export." },
  { icon: TbTable, name: "Spreadsheets", copy: "Sortable, editable, totals. Opens in Excel." },
  { icon: TbRobot, name: "Agents", copy: "Specialists with their own brief and chat page." },
  { icon: TbUsers, name: "Team", copy: "Four agents answer one task, each from their own discipline." },
  { icon: TbCode, name: "Code", copy: "Complete and runnable. No placeholders left behind." },
  { icon: TbSearch, name: "Research", copy: "Findings kept apart from what it could not verify." },
];

/**
 * A small picture of the product's output: a document page with a deck and a
 * sheet stacked behind it. Abstract on purpose — it stands for the artefacts
 * rather than pretending to be a screenshot of one.
 */
function ArtifactStack() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[420px]">
      {/* sheet, furthest back */}
      <div className="bezel absolute -right-3 top-7 hidden w-[72%] rotate-[3deg] p-3 sm:block">
        <div className="mb-2 flex gap-1">
          {[36, 22, 28].map((w, i) => (
            <span key={i} className="h-2 rounded-[3px] bg-ink-4/25" style={{ width: w }} />
          ))}
        </div>
        <div className="space-y-1.5">
          {[0, 1, 2, 3].map((r) => (
            <div key={r} className="flex gap-1">
              {[40, 26, 30].map((w, c) => (
                <span
                  key={c}
                  className="h-2 rounded-[3px]"
                  style={{
                    width: w,
                    background:
                      c === 2
                        ? "color-mix(in oklab, var(--color-accent) 30%, transparent)"
                        : "var(--color-hover)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* deck, middle */}
      <div className="bezel absolute -left-4 top-3 hidden w-[64%] -rotate-[4deg] p-3 sm:block">
        <span className="mb-2 block h-1.5 w-8 rounded-full bg-accent" />
        <span className="mb-2.5 block h-2.5 w-[70%] rounded-[3px] bg-ink-4/35" />
        <div className="space-y-1.5">
          {[86, 64, 72].map((w, i) => (
            <span
              key={i}
              className="block h-1.5 rounded-[3px] bg-ink-4/20"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </div>

      {/* document, front */}
      <div className="bezel relative z-10 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="meta">document.docx</span>
          <span className="grid h-6 w-6 place-items-center rounded-[6px] bg-accent/12 text-accent">
            <FiDownload size={12} />
          </span>
        </div>
        <span className="mb-3 block h-3.5 w-[72%] rounded-[4px] bg-ink/70" />
        <div className="space-y-2">
          {[100, 94, 88, 97, 62].map((w, i) => (
            <span
              key={i}
              className="block h-2 rounded-[3px] bg-ink-4/22"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
        <span className="mb-2.5 mt-5 block h-2.5 w-[44%] rounded-[4px] bg-ink/45" />
        <div className="space-y-2">
          {[96, 82].map((w, i) => (
            <span
              key={i}
              className="block h-2 rounded-[3px] bg-ink-4/22"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function Landing() {
  // The middleware hands everyone a guest id, so a session cookie — not the
  // presence of an identity — is what distinguishes a returning user.
  const jar = await cookies();
  if (jar.has("nx_session")) redirect("/chat");

  const free = PLANS[0];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Backdrop />

      <header className="sticky top-0 z-30 border-b border-line bg-canvas/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1140px] items-center justify-between px-5 py-3.5 lg:px-8">
          <Wordmark size={20} sweep={false} className="text-ink" />
          <div className="flex items-center gap-1.5">
            <Link
              href="/plans"
              className="hidden rounded-[6px] px-3 py-2 text-[13.5px] text-ink-3 transition-colors hover:bg-hover hover:text-ink sm:block"
            >
              Pricing
            </Link>
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-[6px] px-3 py-2 text-[13.5px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1140px] px-5 pb-24 lg:px-8">
        <div className="spotlight" />

        {/* Hero — words on the left, what they produce on the right. */}
        <section className="relative grid items-center gap-12 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pt-24">
          <div className="nx-rise">
            <span className="meta inline-flex items-center gap-2 rounded-full border border-line bg-rail px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" />
              Free to try, no card
            </span>

            <h1 className="mt-5 text-[40px] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[52px]">
              Describe it once.
              <br />
              <span className="text-ink-3">Keep the file.</span>
            </h1>

            <p className="mt-5 max-w-[46ch] text-[16.5px] leading-relaxed text-ink-2">
              Trove is an AI workspace that finishes things. Documents, decks,
              spreadsheets and code come out as real files you can open in Word,
              Excel and PowerPoint — and every thread is saved exactly as you
              left it.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/chat"
                className="group flex items-center gap-2 rounded-[8px] btn-grad px-6 py-3 text-[14.5px] font-medium transition-[filter,transform] active:scale-[0.99]"
              >
                Start without an account
                <FiArrowRight
                  size={15}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/signup"
                className="rounded-[8px] border border-line-strong px-6 py-3 text-[14.5px] font-medium text-ink transition-colors hover:bg-hover"
              >
                Create an account
              </Link>
            </div>

            <p className="mt-4 text-[13px] text-ink-4">
              {free.monthly} credits a month on the free plan.
            </p>
          </div>

          <div
            className="nx-rise relative"
            style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
          >
            <ArtifactStack />
          </div>
        </section>

        {/* What it writes. Concrete, and the actual reason to choose it. */}
        <section className="bezel hairline-top mt-24 flex flex-wrap items-center justify-between gap-6 px-6 py-5">
          <p className="text-[14px] text-ink-2">
            Everything it makes leaves as a real file
          </p>
          <ul className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <li
                key={f.ext}
                className="flex items-center gap-2 rounded-[8px] border border-line bg-sunk px-3 py-1.5"
              >
                <span className="font-mono text-[12.5px] font-medium text-accent">
                  {f.ext}
                </span>
                <span className="text-[12.5px] text-ink-4">{f.label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Bento — the first tile is wide, so the grid has a first read. */}
        <section className="nx-stagger mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BENTO.map((t, i) => (
            <article
              key={t.name}
              className={`bezel panel-hover nx-in p-5 ${t.wide ? "sm:col-span-2" : ""}`}
              style={{ animationDelay: `${i * 55}ms`, animationFillMode: "backwards" }}
            >
              <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-accent/10 text-accent">
                <Ico icon={t.icon} motion="pop" size={18} />
              </span>
              <h2 className="mt-4 text-[15px] font-semibold text-ink">{t.name}</h2>
              <p className="mt-1.5 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-3">
                {t.copy}
              </p>
            </article>
          ))}
        </section>

        {/* Persistence — the quiet feature people only notice once it is gone. */}
        <section className="bezel mt-6 grid items-center gap-8 px-6 py-9 sm:px-10 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-[24px] font-semibold tracking-tight text-ink">
              Your work stays where you left it
            </h2>
            <p className="mt-3 max-w-[56ch] text-[14.5px] leading-relaxed text-ink-3">
              Ask a model the same question twice and you get two different
              answers. So Trove saves the exchange, not the prompt — reopen a
              thread and it is the reply you came back for, not a new one.
            </p>
            <Link
              href="/chat"
              className="group mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-accent"
            >
              Try it now
              <FiArrowRight
                size={14}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          <div
            aria-hidden
            className="w-full max-w-[280px] rounded-[10px] border border-line bg-sunk p-3.5"
          >
            <span className="meta">Recents</span>
            <ul className="mt-2.5 space-y-1.5">
              {["Q4 pricing brief", "Sprint capacity planner", "Onboarding runbook"].map(
                (r, i) => (
                  <li
                    key={r}
                    className="flex items-center gap-2 rounded-[6px] bg-raised px-2.5 py-2 text-[12.5px] text-ink-2"
                    style={{ opacity: 1 - i * 0.16 }}
                  >
                    <FiCornerDownLeft size={11} className="shrink-0 text-ink-4" />
                    <span className="truncate">{r}</span>
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-line">
        <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[13px] text-ink-4 lg:px-8">
          <span>Trove — everything you make, kept in one place.</span>
          <nav className="flex gap-4">
            <Link href="/plans" className="transition-colors hover:text-ink-2">
              Pricing
            </Link>
            <Link href="/login" className="transition-colors hover:text-ink-2">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
