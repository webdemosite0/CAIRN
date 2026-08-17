import type { IconType } from "react-icons";
import { Ico, type Motion } from "@/components/ui/ico";

/**
 * The screen a feature shows while it is switched off. Deliberately calm and
 * finished-looking rather than an error state — nothing here is broken.
 */
export function ComingSoon({
  title,
  blurb,
  icon,
  motion = "pop",
  tint = "var(--color-accent)",
  points,
}: {
  title: string;
  blurb: string;
  icon: IconType;
  motion?: Motion;
  tint?: string;
  /** What it will do, once it is on. Keep to three. */
  points?: string[];
}) {
  // Callers pass dark-mode neons; --tint-darken mixes black in on light so the
  // badge does not sit at ~1.6:1 on a white page.
  const hue = `color-mix(in oklab, ${tint}, #000 var(--tint-darken))`;

  return (
    <div className="nx-in mx-auto flex min-h-screen max-w-[560px] flex-col items-center justify-center px-5 py-16 text-center">
      <span
        className="grid h-16 w-16 place-items-center rounded-[20px]"
        style={{ background: `color-mix(in oklab, ${hue} 16%, transparent)`, color: hue }}
      >
        <Ico icon={icon} motion={motion} size={30} live />
      </span>

      <h1 className="mt-6 text-[26px] font-semibold tracking-tight text-ink">
        {title}
      </h1>

      <span
        className="mt-3 rounded-full px-3 py-1 text-[12px] font-medium uppercase tracking-[0.12em]"
        style={{
          background: `color-mix(in oklab, ${hue} 14%, transparent)`,
          color: hue,
        }}
      >
        Coming soon
      </span>

      <p className="mt-5 max-w-[42ch] text-[14.5px] leading-relaxed text-ink-3">
        {blurb}
      </p>

      {points?.length ? (
        <ul className="mt-8 w-full space-y-2 text-left">
          {points.map((p, i) => (
            <li
              key={p}
              className="nx-in flex items-center gap-3 rounded-[12px] border border-line bg-rail px-4 py-3 text-[13.5px] text-ink-2"
              style={{ animationDelay: `${120 + i * 70}ms`, animationFillMode: "backwards" }}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: hue }}
              />
              {p}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
