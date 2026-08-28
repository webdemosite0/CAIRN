"use client";

import { useState } from "react";
import { FiFileText, FiDatabase, FiCheck } from "react-icons/fi";
import { TbPalette } from "react-icons/tb";
import type { BuildPlan } from "@/lib/builder";
import { skillLabel } from "@/lib/skills";
import { cn } from "@/lib/utils";

type Tab = "requirements" | "style" | "backend";

const TABS: { id: Tab; label: string; icon: typeof FiFileText }[] = [
  { id: "requirements", label: "Requirements", icon: FiFileText },
  { id: "style", label: "Style", icon: TbPalette },
  { id: "backend", label: "Backend", icon: FiDatabase },
];

/**
 * The plan, before anything is built.
 *
 * Shown so the build can be corrected while it is still cheap — once steps
 * start running they cost credits, and a wrong assumption caught here saves
 * the whole run.
 */
export function PlanPanel({
  plan,
  storage,
  onStorage,
  onGenerate,
  busy,
}: {
  plan: BuildPlan;
  storage: "local" | "none";
  onStorage: (s: "local" | "none") => void;
  onGenerate: () => void;
  busy: boolean;
}) {
  const [tab, setTab] = useState<Tab>("requirements");

  return (
    <div className="bezel overflow-hidden">
      <div className="flex gap-1 border-b border-line bg-rail/60 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-[var(--r-chip)] px-2.5 py-1.5 text-[12.5px] transition-colors",
              tab === t.id
                ? "bg-raised text-ink shadow-[var(--elev)]"
                : "text-ink-3 hover:text-ink-2",
            )}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-h-[42vh] overflow-auto p-4">
        {tab === "requirements" ? (
          <div className="space-y-4">
            {plan.requirements.overview ? (
              <p className="text-[13.5px] leading-relaxed text-ink-2">
                {plan.requirements.overview}
              </p>
            ) : null}

            {plan.requirements.features.length ? (
              <section>
                <p className="meta mb-2">Features</p>
                <ul className="space-y-1.5">
                  {plan.requirements.features.map((f) => (
                    <li key={f} className="flex gap-2 text-[13px] text-ink-2">
                      <FiCheck size={13} className="mt-0.5 shrink-0 text-positive" />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {plan.requirements.pages.length ? (
              <section>
                <p className="meta mb-2">Pages</p>
                <ul className="space-y-1">
                  {plan.requirements.pages.map((p) => (
                    <li key={p.name} className="text-[13px] text-ink-3">
                      <span className="text-ink-2">{p.name}</span>
                      {p.purpose ? ` — ${p.purpose}` : ""}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {plan.requirements.rules.length ? (
              <section>
                <p className="meta mb-2">Rules and edge cases</p>
                <ul className="space-y-1">
                  {plan.requirements.rules.map((r) => (
                    <li key={r} className="text-[13px] text-ink-3">
                      • {r}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === "style" ? (
          <div className="space-y-4">
            <div>
              <p className="text-[15px] font-semibold text-ink">{plan.style.name}</p>
              {plan.style.mood ? (
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
                  {plan.style.mood}
                </p>
              ) : null}
            </div>

            {plan.style.palette.length ? (
              <section>
                <p className="meta mb-2">Palette</p>
                <div className="flex flex-wrap gap-2">
                  {plan.style.palette.map((c) => (
                    <div key={c} className="text-center">
                      <span
                        className="block h-11 w-11 rounded-[var(--r-control)] border border-line"
                        style={{ background: c }}
                      />
                      <span className="mt-1 block font-mono text-[10.5px] text-ink-4">
                        {c}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <p className="meta mb-1.5">Type</p>
              <p className="text-[13px] text-ink-3">{plan.style.type}</p>
            </section>
          </div>
        ) : null}

        {tab === "backend" ? (
          <div className="space-y-3">
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              What gets built is a folder of files that runs anywhere — no server
              is created and none is required.
            </p>

            {(
              [
                {
                  id: "local" as const,
                  name: "Browser storage",
                  desc: "Products, carts and records persist in the visitor's own browser via localStorage. Real and working, but per-device — nothing is shared between visitors.",
                  tags: ["Works offline", "No setup", "Per-device"],
                },
                {
                  id: "none" as const,
                  name: "Static only",
                  desc: "No persistence at all. Every reload starts fresh. Right for a brochure or landing page.",
                  tags: ["Simplest", "Fastest"],
                },
              ]
            ).map((o) => (
              <button
                key={o.id}
                onClick={() => onStorage(o.id)}
                className={cn(
                  "block w-full rounded-[var(--r-control)] border p-3.5 text-left transition-colors",
                  storage === o.id
                    ? "border-accent bg-accent/5"
                    : "border-line hover:bg-hover",
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid h-3.5 w-3.5 place-items-center rounded-full border",
                      storage === o.id ? "border-accent" : "border-line-strong",
                    )}
                  >
                    {storage === o.id ? (
                      <span className="block h-1.5 w-1.5 rounded-full bg-accent" />
                    ) : null}
                  </span>
                  <span className="text-[13.5px] font-medium text-ink">{o.name}</span>
                </span>
                <span className="mt-1.5 block text-[12.5px] leading-relaxed text-ink-3">
                  {o.desc}
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {o.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-[var(--r-chip)] bg-sunk px-1.5 py-0.5 text-[11px] text-ink-4"
                    >
                      {t}
                    </span>
                  ))}
                </span>
              </button>
            ))}

            <p className="text-[12px] leading-relaxed text-ink-4">
              A hosted database, sign-in that actually verifies a password, email
              and payments all need a server. Those are not offered here rather
              than being faked with a screen that looks like they work.
            </p>
          </div>
        ) : null}
      </div>

      <div className="border-t border-line bg-rail/60 p-3">
        <p className="meta mb-2">
          {plan.steps.length} steps
          {plan.steps.some((s) => s.skills.length)
            ? ` · ${[...new Set(plan.steps.flatMap((s) => s.skills))]
                .map(skillLabel)
                .join(", ")}`
            : ""}
        </p>
        <button
          onClick={onGenerate}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--r-control)] btn-grad px-4 py-2.5 text-[14px] font-medium transition-[filter,transform] active:scale-[0.99] disabled:opacity-50"
        >
          Generate App
        </button>
      </div>
    </div>
  );
}
