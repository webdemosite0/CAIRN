import { SectionHead } from "@/components/landing/sections";

export interface Quote {
  text: string;
  name: string;
  role: string;
}

/**
 * Social proof, when there is any.
 *
 * Renders nothing while `quotes` is empty, which is the current state — there
 * are no real customers yet. The alternative was a section of "[Customer
 * Name] · [Role]" placeholders, and a visitor reading those learns two things:
 * that the quotes are fake, and that the page was shipped unfinished. An
 * absent section costs nothing; an obviously invented one costs trust.
 *
 * To turn it on, pass real quotes:
 *
 *   <Testimonials quotes={[
 *     { text: "…", name: "Real Person", role: "Role, Company" },
 *   ]} />
 */
export function Testimonials({ quotes = [] }: { quotes?: Quote[] }) {
  if (!quotes.length) return null;

  return (
    <section className="mx-auto max-w-[1140px] px-5 py-20 lg:px-8 lg:py-28">
      <SectionHead title="What people are building" />

      <div className="nx-stagger mx-auto mt-12 grid max-w-[900px] gap-4 md:grid-cols-2">
        {quotes.slice(0, 3).map((q) => (
          <figure
            key={q.name}
            className="rounded-[12px] border border-line bg-canvas p-6 shadow-[var(--sh-1)]"
          >
            <blockquote className="text-[15.5px] leading-relaxed text-ink-2">
              &ldquo;{q.text}&rdquo;
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
                {q.name.slice(0, 1).toUpperCase()}
              </span>
              <span>
                <span className="block text-[13px] font-medium text-ink">{q.name}</span>
                <span className="block text-[12px] text-ink-4">{q.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
