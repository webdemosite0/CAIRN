/**
 * Response modes.
 *
 * Every mode changes something the model actually receives: a temperature that
 * reaches Google's generationConfig, and a line appended to the system prompt.
 * Nothing here is decorative — a control that looks like it does something and
 * does not is worse than no control, because it teaches people the product
 * lies to them.
 *
 * This is deliberately not a model picker. Every entry in the fallback chain is
 * a Flash variant, so a dropdown of model names would be exactly that empty
 * control. "Fast" and "Deep" are honest about what they are: instructions about
 * length and thoroughness, not different engines.
 */

export type ModeId = "fast" | "balanced" | "deep" | "creative";

export interface Mode {
  id: ModeId;
  label: string;
  blurb: string;
  temperature: number;
  /** Appended to the system prompt. Empty for the default. */
  hint: string;
}

export const MODES: Record<ModeId, Mode> = {
  fast: {
    id: "fast",
    label: "Fast",
    blurb: "Short, direct answers.",
    temperature: 0.3,
    hint:
      "Answer as briefly as the question allows. Lead with the answer, skip " +
      "preamble and restatement, and stop once it is answered.",
  },
  balanced: {
    id: "balanced",
    label: "Balanced",
    blurb: "The default. Accurate, well phrased.",
    temperature: 0.7,
    hint: "",
  },
  deep: {
    id: "deep",
    label: "Deep",
    blurb: "Thorough. Works through the reasoning.",
    temperature: 0.5,
    hint:
      "Work the problem through before answering. Consider the cases that " +
      "could make the obvious answer wrong, say which assumptions you are " +
      "making, and show the reasoning that matters rather than only the " +
      "conclusion.",
  },
  creative: {
    id: "creative",
    label: "Creative",
    blurb: "Looser and more varied. Best for copy.",
    temperature: 1.0,
    hint:
      "Favour range over safety. Offer more than one direction where that is " +
      "useful, and prefer a distinctive phrasing to a predictable one.",
  },
};

export const MODE_LIST = Object.values(MODES);

export const DEFAULT_MODE: ModeId = "balanced";

/** Resolves an untrusted value to a real mode, never undefined. */
export function modeFor(id: unknown): Mode {
  return MODES[id as ModeId] ?? MODES[DEFAULT_MODE];
}

/** Resolves an untrusted value to a real temperature. */
export function temperatureFor(id: unknown): number {
  return modeFor(id).temperature;
}

/** The system-prompt line for a mode, or "" when it has nothing to add. */
export function hintFor(id: unknown): string {
  return modeFor(id).hint;
}

export function modeLabel(id: unknown): string {
  return modeFor(id).label;
}
