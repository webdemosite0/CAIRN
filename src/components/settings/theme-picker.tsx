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
const SWATCH: Record<string, { page: string; bar: string; ink: string }> = {
  light: { page: "#f7f6f3", bar: "#ffffff", ink: "#101014" },
  dark: { page: "#0b0b0f", bar: "#16161c", ink: "#f2f2f5" },
  system: { page: "linear-gradient(135deg,#f7f6f3 50%,#0b0b0f 50%)", bar: "#ffffff", ink: "#101014" },
};

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
          const s = SWATCH[o.value];
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
              {/* A tiny drawing of the app: a bar, a rail and two lines. */}
              <span
                aria-hidden
                className="block h-[72px] overflow-hidden rounded-[var(--r-control)] border border-line"
                style={{ background: s.page }}
              >
                <span className="block h-3 w-full" style={{ background: s.bar }} />
                <span className="flex h-[calc(100%-0.75rem)] gap-1 p-1.5">
                  <span
                    className="block w-3 shrink-0 rounded-[var(--r-tight)]"
                    style={{ background: s.bar }}
                  />
                  <span className="flex flex-1 flex-col gap-1 pt-0.5">
                    <span
                      className="block h-1 w-3/5 rounded-full"
                      style={{ background: s.ink, opacity: 0.55 }}
                    />
                    <span
                      className="block h-1 w-4/5 rounded-full"
                      style={{ background: s.ink, opacity: 0.28 }}
                    />
                  </span>
                </span>
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
