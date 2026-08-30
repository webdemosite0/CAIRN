import type { DayRow } from "@/lib/credits";

/**
 * Credits per day, as bars.
 *
 * No charting library and no client JavaScript: it is a row of divs whose
 * heights are a percentage of the busiest day. That keeps it server-rendered
 * and it is also the honest shape — the data is one number per day.
 *
 * The scale is the maximum in the window rather than the credit grant. Against
 * a 200-credit grant a normal day is a two-pixel stub and the chart says
 * nothing; against the busiest day the shape of the week is legible.
 */
export function UsageChart({ data }: { data: DayRow[] }) {
  const max = Math.max(1, ...data.map((d) => d.credits));
  const total = data.reduce((s, d) => s + d.credits, 0);

  if (total === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-ink-4">
        No credits spent in this window.
      </p>
    );
  }

  const fmt = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

  return (
    <figure className="m-0">
      <div className="flex h-[132px] items-end gap-[3px]" role="list">
        {data.map((d) => {
          const h = d.credits === 0 ? 0 : Math.max(3, (d.credits / max) * 100);
          return (
            <div
              key={d.day}
              role="listitem"
              // The title is the only affordance here, so it carries the whole
              // fact rather than just the number.
              title={`${fmt(d.day)}: ${d.credits.toLocaleString()} credit${d.credits === 1 ? "" : "s"}`}
              className="group relative flex h-full flex-1 items-end"
            >
              {/* A faint track behind every bar, so an empty day still reads as
                  a day rather than as a gap in the chart. */}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 top-0 rounded-[var(--r-tight)] bg-sunk"
              />
              <span
                aria-hidden
                className="relative w-full rounded-[var(--r-tight)] bg-accent/75 transition-colors group-hover:bg-accent"
                style={{ height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>

      <figcaption className="mt-2 flex items-baseline justify-between text-[11.5px] text-ink-4">
        <span>{fmt(data[0].day)}</span>
        <span className="tabular-nums">
          {total.toLocaleString()} credits over {data.length} days
        </span>
        <span>{fmt(data[data.length - 1].day)}</span>
      </figcaption>
    </figure>
  );
}
