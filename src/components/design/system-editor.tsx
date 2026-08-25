"use client";

import { useMemo, useState } from "react";
import { FiCheck, FiCopy, FiDownload, FiPlus, FiTrash2 } from "react-icons/fi";
import { Ico } from "@/components/ui/ico";
import {
  parseDesign,
  toCssVariables,
  toJsonTokens,
  type ColourToken,
  type DesignSystem,
  type TypeToken,
} from "@/lib/design-tokens";

/**
 * The design spec, as values you can change.
 *
 * The tool already produced a real palette, a real type scale and a real
 * rhythm — and buried all of them in prose. You could read the hex and retype
 * it somewhere else, which is not the same as having a design system.
 *
 * So the markdown is parsed once into tokens and every one becomes a control:
 * a colour is a swatch you can pick, a size is a number you can nudge. The
 * preview beneath is built from those same values, so changing one is visible
 * immediately rather than imagined.
 *
 * Export writes CSS custom properties or JSON — the two shapes that can be
 * pasted into a real project without a conversion step.
 */

const WEIGHTS = [100, 300, 400, 500, 600, 700, 800, 900];

export function SystemEditor({ markdown }: { markdown: string }) {
  const parsed = useMemo(() => parseDesign(markdown), [markdown]);
  const [system, setSystem] = useState<DesignSystem>(parsed);
  const [copied, setCopied] = useState<string | null>(null);

  /**
   * Re-seed when a different spec arrives, during render rather than in an
   * effect.
   *
   * An effect would render once with the previous system, commit, then render
   * again — a visible flash of the old palette under the new spec. Adjusting
   * here re-renders before anything is shown, which is the pattern React
   * documents for exactly this.
   *
   * Compared against the markdown, not the parse: parseDesign returns a new
   * object every call, so comparing that would reset on every render and no
   * edit would survive.
   */
  const [seededFrom, setSeededFrom] = useState(markdown);
  if (markdown !== seededFrom) {
    setSeededFrom(markdown);
    setSystem(parsed);
  }

  const empty =
    !system.colours.length && !system.type.length && !system.spacing.length;

  function patchColour(i: number, change: Partial<ColourToken>) {
    setSystem((s) => ({
      ...s,
      colours: s.colours.map((c, n) => (n === i ? { ...c, ...change } : c)),
    }));
  }

  function patchType(i: number, change: Partial<TypeToken>) {
    setSystem((s) => ({
      ...s,
      type: s.type.map((t, n) => (n === i ? { ...t, ...change } : t)),
    }));
  }

  async function copy(what: "css" | "json") {
    const text = what === "css" ? toCssVariables(system) : toJsonTokens(system);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard denied — the download below still works */
    }
  }

  function download(what: "css" | "json") {
    const text = what === "css" ? toCssVariables(system) : toJsonTokens(system);
    const blob = new Blob([text], {
      type: what === "css" ? "text/css" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = what === "css" ? "tokens.css" : "tokens.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (empty) {
    return (
      <p className="rounded-[10px] border border-line bg-rail px-4 py-3 text-[13px] text-ink-3">
        No colours, sizes or spacing were found in this spec, so there is
        nothing to edit here — the written version is below.
      </p>
    );
  }

  return (
    <section className="space-y-7">
      {/* ---------------- colours ---------------- */}
      {system.colours.length ? (
        <div>
          <Header
            title="Palette"
            count={system.colours.length}
            onAdd={() =>
              setSystem((s) => ({
                ...s,
                colours: [...s.colours, { name: "New colour", hex: "#4f46e5" }],
              }))
            }
          />
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {system.colours.map((c, i) => (
              <div
                key={i}
                className="group flex items-center gap-3 rounded-[10px] border border-line bg-raised p-2.5"
              >
                {/* The native picker. A hand-rolled one would be a worse
                    version of something every OS already does well. */}
                <label className="relative shrink-0 cursor-pointer">
                  <span className="sr-only">Colour value for {c.name}</span>
                  <span
                    aria-hidden
                    className="block size-11 rounded-[8px] border border-line-strong"
                    style={{ background: c.hex }}
                  />
                  <input
                    type="color"
                    value={c.hex}
                    onChange={(e) => patchColour(i, { hex: e.target.value })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>

                <div className="min-w-0 flex-1">
                  <input
                    value={c.name}
                    onChange={(e) => patchColour(i, { name: e.target.value })}
                    aria-label={`Name of colour ${i + 1}`}
                    className="w-full truncate bg-transparent text-[13px] font-medium text-ink outline-none"
                  />
                  <input
                    value={c.hex}
                    onChange={(e) => {
                      const v = e.target.value;
                      // Only accept a complete value — a half-typed "#4f4"
                      // would repaint the swatch to something nobody chose.
                      patchColour(i, {
                        hex: /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : v,
                      });
                    }}
                    aria-label={`Hex value of ${c.name}`}
                    spellCheck={false}
                    className="w-full bg-transparent font-mono text-[11.5px] text-ink-4 outline-none"
                  />
                </div>

                <button
                  onClick={() =>
                    setSystem((s) => ({
                      ...s,
                      colours: s.colours.filter((_, n) => n !== i),
                    }))
                  }
                  aria-label={`Remove ${c.name}`}
                  className="group/x grid size-7 shrink-0 place-items-center rounded-[6px] text-ink-4 opacity-0 transition hover:bg-critical/10 hover:text-critical focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Ico icon={FiTrash2} motion="shake" size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ---------------- type ---------------- */}
      {system.type.length ? (
        <div>
          <Header title="Type scale" count={system.type.length} />
          <div className="space-y-1.5">
            {system.type.map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-[10px] border border-line bg-raised px-3 py-2.5"
              >
                <input
                  value={t.name}
                  onChange={(e) => patchType(i, { name: e.target.value })}
                  aria-label={`Name of type step ${i + 1}`}
                  className="w-[104px] shrink-0 bg-transparent text-[13px] font-medium text-ink outline-none"
                />

                <input
                  type="number"
                  min={8}
                  max={200}
                  value={t.size}
                  onChange={(e) => patchType(i, { size: Number(e.target.value) || t.size })}
                  aria-label={`Size of ${t.name} in pixels`}
                  className="w-[62px] shrink-0 rounded-[6px] border border-line bg-sunk px-2 py-1 text-[12.5px] tabular-nums text-ink outline-none focus:border-accent"
                />

                <select
                  value={t.weight}
                  onChange={(e) => patchType(i, { weight: Number(e.target.value) })}
                  aria-label={`Weight of ${t.name}`}
                  className="shrink-0 cursor-pointer rounded-[6px] border border-line bg-sunk px-2 py-1 text-[12.5px] text-ink outline-none focus:border-accent"
                >
                  {WEIGHTS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>

                {/* The specimen. The point of a scale is how the sizes sit
                    against each other, which a list of numbers cannot show. */}
                <span
                  className="min-w-0 flex-1 truncate text-ink-2"
                  style={{ fontSize: Math.min(t.size, 34), fontWeight: t.weight }}
                >
                  {t.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ---------------- spacing ---------------- */}
      {system.spacing.length ? (
        <div>
          <Header title="Spacing" count={system.spacing.length} />
          <div className="flex flex-wrap items-end gap-2">
            {system.spacing.map((s) => (
              <div key={s.value} className="text-center">
                <span
                  aria-hidden
                  className="block rounded-[3px] bg-accent"
                  style={{ width: s.value, height: s.value, minWidth: 2 }}
                />
                <span className="mt-1 block text-[11px] tabular-nums text-ink-4">
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ---------------- export ---------------- */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
        {(["css", "json"] as const).map((what) => (
          <div key={what} className="flex items-center gap-1">
            <button
              onClick={() => copy(what)}
              className="chip group !px-3 !py-1.5 !text-[12.5px]"
            >
              {copied === what ? (
                <Ico icon={FiCheck} motion="check" size={13} className="text-positive" />
              ) : (
                <Ico icon={FiCopy} motion="copy" size={13} />
              )}
              {copied === what ? "Copied" : `Copy ${what.toUpperCase()}`}
            </button>
            <button
              onClick={() => download(what)}
              aria-label={`Download tokens.${what}`}
              className="chip group !px-2.5 !py-1.5 !text-[12.5px]"
            >
              <Ico icon={FiDownload} motion="down" size={13} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Header({
  title,
  count,
  onAdd,
}: {
  title: string;
  count: number;
  onAdd?: () => void;
}) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2">
      <h3 className="text-[13px] font-medium text-ink">{title}</h3>
      <span className="text-[11.5px] tabular-nums text-ink-4">{count}</span>
      <span className="flex-1" />
      {onAdd ? (
        <button
          onClick={onAdd}
          className="group flex items-center gap-1 text-[12px] text-ink-3 transition-colors hover:text-ink"
        >
          <Ico icon={FiPlus} motion="open" size={12} /> Add
        </button>
      ) : null}
    </div>
  );
}
