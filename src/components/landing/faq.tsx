import { FiPlus } from "react-icons/fi";
import { SectionHead } from "@/components/landing/sections";

/**
 * The questions someone actually has before signing up, answered truthfully.
 *
 * Built on <details>, so it works with no JavaScript, is keyboard operable and
 * announces its state to a screen reader for free. The open/close animation is
 * on the marker only — animating the panel height would force layout on every
 * frame for no gain.
 */
const QA: { q: string; a: string }[] = [
  {
    q: "What is Trove?",
    a: "An AI workspace. You describe what you need and Trove plans it, builds it and keeps it — websites, documents, spreadsheets, decks, code, research and agents, from one place.",
  },
  {
    q: "What can I build with it?",
    a: "A complete static website, a Vite + React app, an Express or FastAPI service, Word documents, Excel workbooks, PowerPoint decks, runnable code, research write-ups, and agents that carry out multi-step work.",
  },
  {
    q: "Do I need an account?",
    a: "No. You can start without one and everything works. An account is what makes your work persist across devices and browsers.",
  },
  {
    q: "How do credits work?",
    a: "Credits are metered on the tokens a request actually uses, so a short answer costs less than a long one. The free plan includes 200 credits a month, which is roughly 200k tokens.",
  },
  {
    q: "Can Trove create real files?",
    a: "Yes — genuine .docx, .xlsx, .pptx and .zip files, generated in your browser and downloaded directly. They are real Office files, not a copy button, and open in Word, Excel and PowerPoint.",
  },
  {
    q: "Can I create AI agents?",
    a: "Yes. Each agent gets its own brief, its own chat page and its own saved history. You can also put a team of four specialists on a single task and get an answer from each discipline.",
  },
  {
    q: "Can I cancel anytime?",
    a: "The free plan needs no card at all, so there is nothing to cancel. Paid plans are monthly.",
  },
];

export function Faq() {
  return (
    <section className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-28">
      <SectionHead title="Frequently asked questions" />

      <div className="mx-auto mt-12 max-w-[720px] divide-y divide-line border-y border-line">
        {QA.map((item) => (
          <details key={item.q} className="group py-1">
            <summary
              className={[
                "flex cursor-pointer list-none items-center gap-4 py-4",
                "text-[15px] font-medium text-ink transition-colors hover:text-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              ].join(" ")}
            >
              <span className="flex-1">{item.q}</span>
              <FiPlus
                size={17}
                className="shrink-0 text-ink-4 transition-transform duration-[var(--t-hover)] group-open:rotate-45"
              />
            </summary>
            <p className="pb-5 pr-10 text-[14.5px] leading-relaxed text-ink-3">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
