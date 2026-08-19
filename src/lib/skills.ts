/**
 * Skills the builder can invoke.
 *
 * A skill is a real prompt module, not a label: when a build step declares one,
 * its `prompt` is appended to the system prompt for that step and genuinely
 * changes the code that comes out. The task feed shows which ones ran, so what
 * is on screen matches what actually happened.
 *
 * Anything that would need a server we do not have — provisioning a database,
 * sending mail, taking a payment — is deliberately absent. A skill that cannot
 * do the thing it names would be a lie told in a nice font.
 */

export type SkillId =
  | "ui-design"
  | "layout"
  | "content"
  | "login"
  | "store"
  | "image-upload"
  | "motion"
  | "seo"
  | "a11y"
  | "admin";

export interface Skill {
  id: SkillId;
  label: string;
  /** One line, shown in the picker and the task feed. */
  blurb: string;
  /** Appended to the system prompt when this skill runs. */
  prompt: string;
}

export const SKILLS: Record<SkillId, Skill> = {
  "ui-design": {
    id: "ui-design",
    label: "UI Design",
    blurb: "A design system: palette, type scale, spacing, states.",
    prompt: `DESIGN SYSTEM. Define :root custom properties first and use them
everywhere — never hard-code a colour twice. Include: a background, a raised
surface, a border, three text weights (strong/normal/muted), one accent and one
accent-contrast. Set a type scale with no more than five sizes. Use an 8px
spacing rhythm. Every interactive element needs :hover and :focus-visible
states. Body text must reach at least 4.5:1 against its background.`,
  },

  layout: {
    id: "layout",
    label: "Layout",
    blurb: "Responsive structure down to 360px.",
    prompt: `LAYOUT. Use CSS grid and flexbox, never absolute positioning for
page structure. Must be usable at 360px with no horizontal scroll. Use
clamp() for fluid type. Any wide element (table, code, card row) scrolls inside
its own container rather than pushing the page sideways.`,
  },

  content: {
    id: "content",
    label: "Content",
    blurb: "Real, specific copy — never lorem ipsum.",
    prompt: `CONTENT. Write real copy for this specific business: concrete
product names, believable prices, actual sentences. Never lorem ipsum, never
"Your text here", never a placeholder image box with the word "image" in it.
Prices, names and dates must be internally consistent across the whole site.`,
  },

  login: {
    id: "login",
    label: "Login",
    blurb: "Sign-in and sign-up screens, validated client-side.",
    prompt: `AUTH UI. Build sign-in and sign-up forms with real client-side
validation: required fields, email shape, minimum password length, and inline
error messages tied to inputs with aria-describedby. Session state is kept in
localStorage under a single namespaced key.

State plainly in a code comment that this is UI and client-side state only —
there is no server verifying anything, so it must never be presented to an end
user as real security.`,
  },

  store: {
    id: "store",
    label: "Data Store",
    blurb: "Products, cart and orders persisted in localStorage.",
    prompt: `DATA LAYER. Implement a small store module with clear functions
(list, get, add, update, remove) over localStorage, namespaced under one key,
JSON-encoded, wrapped in try/catch so a quota error or private-browsing block
degrades to in-memory rather than throwing. Seed it with realistic starting
data on first run. Every read must tolerate the key being absent or corrupt.`,
  },

  "image-upload": {
    id: "image-upload",
    label: "Image Upload",
    blurb: "Pick an image, preview it, keep it as a data URL.",
    prompt: `IMAGE UPLOAD. Use an <input type="file" accept="image/*"> read via
FileReader into a data URL, shown as an immediate preview. Reject files over
2MB with a visible message rather than silently failing. Store the data URL
with the record it belongs to. No network upload — there is no server.`,
  },

  motion: {
    id: "motion",
    label: "Motion",
    blurb: "Restrained animation on transform and opacity only.",
    prompt: `MOTION. Animate transform and opacity only — never width, height,
top or left, which force layout on every frame. Keep durations between 120ms
and 320ms. Add a scroll reveal using IntersectionObserver. Wrap every animation
in @media (prefers-reduced-motion: no-preference) so it is opt-out by default.`,
  },

  seo: {
    id: "seo",
    label: "SEO",
    blurb: "Title, description, Open Graph, semantic landmarks.",
    prompt: `SEO. Include a specific <title> and meta description, Open Graph
and Twitter card tags, lang on <html>, and one <h1> per page. Use real landmark
elements — header, nav, main, footer — not a pile of divs.`,
  },

  a11y: {
    id: "a11y",
    label: "Accessibility",
    blurb: "Keyboard reachable, labelled, announced.",
    prompt: `ACCESSIBILITY. Every control reachable and operable by keyboard,
with a visible :focus-visible ring. Every input has a real <label>. Icon-only
buttons carry aria-label. Modals trap focus and close on Escape. Anything that
updates without a page load announces via aria-live.`,
  },

  admin: {
    id: "admin",
    label: "Admin Panel",
    blurb: "A private screen to manage the underlying records.",
    prompt: `ADMIN. Build a separate admin view that lists records in a table
with add, edit and delete. Deleting asks for confirmation first. Form errors
appear inline. It reads and writes through the same store module as the rest of
the site — never its own duplicate copy of the data.`,
  },
};

export const SKILL_LIST = Object.values(SKILLS);

/** Joins the prompts for a set of skills, skipping unknown ids. */
export function skillPrompts(ids: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const s = SKILLS[id as SkillId];
    if (s) out.push(s.prompt);
  }
  return out.join("\n\n");
}

/** Label for a skill id, falling back to the raw id so the feed never blanks. */
export function skillLabel(id: string): string {
  return SKILLS[id as SkillId]?.label ?? id;
}
