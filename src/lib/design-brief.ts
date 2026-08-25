/**
 * The questions asked before a design is made, and the prompt they build.
 *
 * The design tool used to take a sentence and answer with a written spec. A
 * sentence is not enough to design from — "make a UI for an app" leaves the
 * platform, the screens and the fidelity all unstated, so the model picks
 * silently and is wrong about at least one of them.
 *
 * Asking first is cheaper than regenerating. Every field here changes what
 * gets built, and every one can be skipped: an unanswered question becomes a
 * stated default in the prompt rather than a blank the model has to guess at.
 *
 * Pure and dependency-free, so the prompt can be tested without a model.
 */

export const PLATFORMS = ["Mobile", "Desktop web", "Tablet"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const FIDELITIES = ["Wireframe", "Polished", "Clickable prototype"] as const;
export type Fidelity = (typeof FIDELITIES)[number];

export const SCREENS = [
  "Home / feed",
  "Onboarding",
  "Detail view",
  "List / browse",
  "Search",
  "Profile",
  "Settings",
  "Create / add flow",
  "Dashboard with data",
] as const;
export type ScreenName = (typeof SCREENS)[number];

export interface Brief {
  /** What the app is and who it is for. */
  what: string;
  platform: Platform;
  screens: ScreenName[];
  fidelity: Fidelity;
  /** Notes on an existing look to match, or a system to follow. */
  style: string;
}

export const EMPTY_BRIEF: Brief = {
  what: "",
  platform: "Mobile",
  screens: ["Home / feed"],
  fidelity: "Polished",
  style: "",
};

/** The viewport each platform is designed against. */
export const FRAME: Record<Platform, { width: number; height: number; label: string }> = {
  Mobile: { width: 390, height: 844, label: "390 × 844" },
  Tablet: { width: 834, height: 1112, label: "834 × 1112" },
  "Desktop web": { width: 1280, height: 900, label: "1280 × 900" },
};

/**
 * How much visual finish to ask for.
 *
 * Split out because it is the field people most often get wrong by omission:
 * a wireframe rendered in full colour is not a wireframe, and a polished
 * screen drawn in grey boxes is not worth looking at.
 */
const FIDELITY_RULES: Record<Fidelity, string> = {
  Wireframe:
    "Wireframe fidelity. Greyscale only — no brand colour, no photography, no " +
    "gradients. Boxes with labels where images would go. The point is layout " +
    "and hierarchy, so spend the effort on spacing and proportion.",
  Polished:
    "Production fidelity. Real colour, real type, real spacing, real copy — no " +
    "lorem ipsum and no placeholder rectangles. It should look like a screenshot " +
    "of a shipped product, not a mockup of one.",
  "Clickable prototype":
    "Production fidelity, and interactive. Buttons, tabs and inputs respond: use " +
    "CSS :hover and :active throughout, and a small amount of vanilla JavaScript " +
    "where a control genuinely changes state — tabs that switch, a menu that " +
    "opens. No framework, no build step.",
};

/**
 * The instruction sent to the model for one screen.
 *
 * One screen per request rather than a whole set in one. A single response
 * holding six screens hits the output ceiling and truncates the last of them
 * mid-element, and a truncated screen renders as a blank frame.
 */
export function screenPrompt(brief: Brief, screen: string): string {
  const frame = FRAME[brief.platform];

  return [
    `Design the "${screen}" screen.`,
    "",
    `The product: ${brief.what.trim() || "a general-purpose consumer app"}`,
    `Platform: ${brief.platform}, designed at ${frame.width}×${frame.height}.`,
    "",
    FIDELITY_RULES[brief.fidelity],
    brief.style.trim() ? `\nVisual direction: ${brief.style.trim()}` : "",
    "",
    "Return ONE complete HTML document and nothing else — no explanation, no",
    "markdown fence. It must:",
    "",
    `- open with <!DOCTYPE html> and set the viewport to ${frame.width}px wide`,
    "- carry all CSS in a single <style> block; no external stylesheets or fonts",
    "- draw every icon as inline SVG; never reference an icon font or an image URL",
    "- fill the full height of the frame, with nothing cut off",
    "- use real, specific copy for this product — names, numbers, labels someone",
    "  would actually see, not 'Title' and 'Subtitle'",
    "",
    "It will be rendered in an iframe with no network access, so anything fetched",
    "from outside the document is a blank space where a design should be.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** A one-line summary of the brief, for the header and for saved history. */
export function briefSummary(brief: Brief): string {
  const what = brief.what.trim() || "Untitled app";
  return `${what} · ${brief.platform} · ${brief.screens.length} screen${
    brief.screens.length === 1 ? "" : "s"
  } · ${brief.fidelity}`;
}
