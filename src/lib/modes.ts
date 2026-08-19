/**
 * Response modes.
 *
 * Each one maps to a real temperature that reaches Google's generationConfig,
 * so choosing a mode genuinely changes the output. This exists instead of a
 * model picker: every entry in the fallback chain is a Flash variant, so a
 * "model" dropdown would offer a choice with no consequence — a control that
 * looks like it does something and does not.
 */

export type ModeId = "precise" | "balanced" | "creative";

export interface Mode {
  id: ModeId;
  label: string;
  blurb: string;
  temperature: number;
}

export const MODES: Record<ModeId, Mode> = {
  precise: {
    id: "precise",
    label: "Precise",
    blurb: "Sticks close to the facts. Best for code and data.",
    temperature: 0.25,
  },
  balanced: {
    id: "balanced",
    label: "Balanced",
    blurb: "The default. Accurate, with room to phrase things well.",
    temperature: 0.7,
  },
  creative: {
    id: "creative",
    label: "Creative",
    blurb: "Looser and more varied. Best for copy and ideas.",
    temperature: 1.0,
  },
};

export const MODE_LIST = Object.values(MODES);

export const DEFAULT_MODE: ModeId = "balanced";

/** Resolves an untrusted value to a real temperature. */
export function temperatureFor(id: unknown): number {
  return MODES[id as ModeId]?.temperature ?? MODES[DEFAULT_MODE].temperature;
}

export function modeLabel(id: unknown): string {
  return MODES[id as ModeId]?.label ?? MODES[DEFAULT_MODE].label;
}
