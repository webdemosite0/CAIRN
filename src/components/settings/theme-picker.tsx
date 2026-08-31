"use client";

import { FiCheck } from "react-icons/fi";

import { Panel } from "@/components/settings/panel";
import { THEME_OPTIONS, useTheme } from "@/components/shell/theme";
import { cn } from "@/lib/utils";

/**
 * The theme, chosen from three previews rather than a dropdown.
 *
 * A select saying "System" tells you the name of the setting; these tell you
 * what the screen will look like, which is the actual question. Each swatch is
 * painted with fixed colours rather than the live tokens — a preview of dark
 * mode that turns light when you are in light mode is not a preview.
 */
interface Paint {
  page: string;
  rail: string;
  line: string;
  ink: string;
}

const LIGHT: Paint = { page: "#f7f6f3", rail: "#ffffff", line: "#e4e2dd", ink: "#101014" };
const DARK: Paint = { page: "#0b0b0f", rail: "#16161c", line: "#2a2a33", ink: "#f2f2f5" };

/** A small drawing of the app: a rail, a header and two lines of content. */
function Mini({ paint, half }: { paint: Paint; half?: boolean }) {
  return (
    <span
      aria-hidden
      className="flex h-full w-full overflow-hidden"
      style={{ background: paint.page }}
    >
      <span
        className="block h-full w-[22%] shrink-0"
        style={{ background: paint.rail, borderRight: `1px solid ${paint.line}` }}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className="block h-[26%] w-full shrink-0"
          style={{ background: paint.rail, borderBottom: `1px solid ${paint.line}` }}
        />
        <span className="flex flex-1 flex-col justify-center gap-1 px-1.5">
          <span
            className="block h-[3px] rounded-full"
            style={{ background: paint.ink, opacity: 0.5, width: half ? "50%" : "62%" }}
          />
          <span
            className="block h-[3px] rounded-full"
            style={{ background: paint.ink, opacity: 0.25, width: half ? "70%" : "84%" }}
          />
        </span>
      </span>
    </span>
  );
}

export function ThemePicker() {
  const [theme, choose] = useTheme();

  return (
    <Panel
      title="Appearance"
      description="Applies to this browser. It is remembered on this device rather than on your account, so another machine can be set differently."
    >
      <div role="radiogroup" aria-label="Colour theme" className="grid gap-3 sm:grid-cols-3">
        {THEME_OPTIONS.map((o) => {
          const active = theme === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(o.value)}
              className={cn(
                "group rounded-[var(--r-card)] border p-2 text-left transition-[border-color,box-shadow]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                active
                  ? "border-accent shadow-[0_0_0_1px_var(--color-accent)]"
                  : "border-line hover:border-line-strong",
              )}
            >
              {/* System is drawn as two halves side by side rather than a
                  diagonal gradient. The gradient version read as a rendering
                  fault — a black triangle over the corner — instead of as
                  "whichever your machine is set to". */}
              <span
                aria-hidden
                className="flex h-[72px] overflow-hidden rounded-[var(--r-control)] border border-line"
              >
                {o.value === "system" ? (
                  <>
                    <span className="block h-full w-1/2 overflow-hidden">
                      <Mini paint={LIGHT} half />
                    </span>
                    <span className="block h-full w-1/2 overflow-hidden border-l border-line">
                      <Mini paint={DARK} half />
                    </span>
                  </>
                ) : (
                  <Mini paint={o.value === "dark" ? DARK : LIGHT} />
                )}
              </span>

              <span className="mt-2 flex items-center gap-1.5 px-0.5 pb-0.5">
                <o.icon size={14} className={active ? "text-accent" : "text-ink-4"} />
                <span
                  className={cn(
                    "text-[13px]",
                    active ? "font-medium text-ink" : "text-ink-2",
                  )}
                >
                  {o.label}
                </span>
                {active ? (
                  <FiCheck size={13} className="ml-auto text-accent" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
