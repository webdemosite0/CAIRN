"use client";

import { useState } from "react";
import { FiArrowRight, FiCheck } from "react-icons/fi";
import { Ico } from "@/components/ui/ico";
import {
  EMPTY_BRIEF,
  FIDELITIES,
  PLATFORMS,
  SCREENS,
  type Brief,
} from "@/lib/design-brief";
import { cn } from "@/lib/utils";

/**
 * What to ask before designing anything.
 *
 * "Make a UI for an app" does not say the platform, the screens or the
 * fidelity, so the model picks all three silently and is wrong about at least
 * one. Asking costs a few seconds; regenerating costs a minute and the credits
 * with it.
 *
 * Every field has a default that is stated rather than blank, and the whole
 * form can be skipped. A question you can only answer is an interrogation; a
 * question you can decline is an offer.
 */

const MAX_WHAT = 400;

export function BriefForm({
  initial = EMPTY_BRIEF,
  busy = false,
  onSubmit,
}: {
  initial?: Brief;
  busy?: boolean;
  onSubmit: (brief: Brief) => void;
}) {
  const [brief, setBrief] = useState<Brief>(initial);

  const set = <K extends keyof Brief>(key: K, value: Brief[K]) =>
    setBrief((b) => ({ ...b, [key]: value }));

  function toggleScreen(name: (typeof SCREENS)[number]) {
    setBrief((b) => {
      const on = b.screens.includes(name);
      // At least one screen, or there is nothing to design and the submit
      // button would sit there enabled and do nothing.
      if (on && b.screens.length === 1) return b;
      return {
        ...b,
        screens: on ? b.screens.filter((s) => s !== name) : [...b.screens, name],
      };
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(brief);
      }}
      className="nx-in space-y-7 rounded-[14px] border border-line bg-rail p-6"
    >
      <header>
        <h2 className="text-[19px] font-semibold text-ink">
          A few questions before I design
        </h2>
        <p className="mt-1 text-[13.5px] text-ink-3">
          Skip anything — every one of these has a sensible default.
        </p>
      </header>

      {/* ---------------- what ---------------- */}
      <Field label="What's the app?" hint="What it does and who it's for">
        <div className="relative">
          <textarea
            value={brief.what}
            onChange={(e) => set("what", e.target.value.slice(0, MAX_WHAT))}
            rows={3}
            placeholder="e.g. a plant-care reminder app for apartment renters"
            className="block w-full resize-y rounded-[10px] border border-line bg-sunk px-3.5 py-3 pb-7 text-[14px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-accent"
          />
          <span className="pointer-events-none absolute bottom-2.5 right-3 text-[11.5px] tabular-nums text-ink-4">
            {brief.what.length} / {MAX_WHAT}
          </span>
        </div>
      </Field>

      {/* ---------------- platform ---------------- */}
      <Field label="Platform">
        <Segmented
          options={PLATFORMS}
          value={brief.platform}
          onChange={(v) => set("platform", v)}
        />
      </Field>

      {/* ---------------- screens ---------------- */}
      <Field
        label="Which screens should I build?"
        hint={`${brief.screens.length} selected — each one is designed separately`}
      >
        <div className="flex flex-wrap gap-2">
          {SCREENS.map((s) => {
            const on = brief.screens.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleScreen(s)}
                aria-pressed={on}
                className={cn(
                  "group flex items-center gap-1.5 rounded-[9px] border px-3 py-2 text-[13px] transition-colors",
                  on
                    ? "border-accent bg-accent/10 text-ink"
                    : "border-line text-ink-3 hover:border-line-strong hover:bg-hover hover:text-ink",
                )}
              >
                {on ? <Ico icon={FiCheck} motion="check" size={13} className="text-accent" /> : null}
                {s}
              </button>
            );
          })}
        </div>
      </Field>

      {/* ---------------- fidelity ---------------- */}
      <Field
        label="Fidelity"
        hint={
          brief.fidelity === "Wireframe"
            ? "Greyscale, layout only"
            : brief.fidelity === "Polished"
              ? "Real colour, type and copy"
              : "Polished, and the controls respond"
        }
      >
        <Segmented
          options={FIDELITIES}
          value={brief.fidelity}
          onChange={(v) => set("fidelity", v)}
        />
      </Field>

      {/* ---------------- style ---------------- */}
      <Field label="Visual direction" hint="Optional — a look to aim for">
        <input
          value={brief.style}
          onChange={(e) => set("style", e.target.value.slice(0, 300))}
          placeholder="e.g. warm and editorial, or dense like a trading terminal"
          className="block w-full rounded-[10px] border border-line bg-sunk px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-accent"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button
          type="button"
          onClick={() => onSubmit(EMPTY_BRIEF)}
          disabled={busy}
          className="text-[13px] text-ink-3 transition-colors hover:text-ink disabled:opacity-40"
        >
          Decide for me
        </button>

        <span className="flex-1" />

        <button
          type="submit"
          disabled={busy || !brief.screens.length}
          className="group flex h-11 items-center gap-2 rounded-[10px] btn-grad px-5 text-[14.5px] font-semibold disabled:opacity-50"
        >
          {busy
            ? "Designing…"
            : `Design ${brief.screens.length} screen${brief.screens.length === 1 ? "" : "s"}`}
          <Ico icon={FiArrowRight} motion="nudge" size={16} />
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[14px] font-medium text-ink">{label}</p>
      {hint ? <p className="mb-2.5 mt-0.5 text-[12.5px] text-ink-4">{hint}</p> : <div className="mb-2.5" />}
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      className="flex rounded-[10px] border border-line bg-sunk p-1"
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "flex-1 rounded-[7px] px-3 py-2 text-[13px] transition-colors",
            value === o
              ? "bg-raised font-medium text-ink shadow-[var(--elev)]"
              : "text-ink-3 hover:text-ink",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
