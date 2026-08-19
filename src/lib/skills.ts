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
    prompt: `DESIGN SYSTEM — do this before any markup.

Define these on :root and use them everywhere; never repeat a raw colour:
  --bg, --surface, --surface-2, --line, --ink, --ink-2, --ink-3,
  --accent, --accent-ink, --radius, --shadow, --max-width

Type scale: exactly five sizes using clamp() so it is fluid, e.g.
  --fs-1: clamp(2rem, 5vw, 3.25rem)  down to  --fs-5: 0.8125rem
Set line-height 1.15 on headings and 1.6 on body. One font stack for headings
and one for body, both system stacks.

Spacing: an 8px rhythm exposed as --sp-1 .. --sp-8. Never a magic number.

Every interactive element defines :hover, :active, :focus-visible and
:disabled. The focus ring is 2px, offset 2px, in --accent, and must be visible
against both --bg and --surface.

Contrast: body text at least 4.5:1 against the surface behind it, large text
at least 3:1. Muted text is the usual failure — check --ink-3 specifically.

Include a @media (prefers-reduced-motion: reduce) block that disables
transitions and animations.`,
  },

  layout: {
    id: "layout",
    label: "Layout",
    blurb: "Responsive structure down to 360px.",
    prompt: `LAYOUT.

Structure with grid and flexbox only — absolute positioning is for decoration,
never for the page skeleton.

A single content container: width min(100% - 2rem, var(--max-width)), centred
with margin-inline auto. Every section uses it, so the left edge of all text
lines up down the whole page.

Responsive: usable at 360px with NO horizontal scroll anywhere. Prefer
grid-template-columns: repeat(auto-fit, minmax(Npx, 1fr)) over breakpoints so
it reflows without media queries. Where breakpoints are needed use min-width,
mobile first.

Any element that can exceed its column — a table, a code block, a card row —
scrolls inside its own overflow-x:auto wrapper. The page body must never
scroll sideways.

Images: always width:100%, height:auto, display:block, and an explicit
aspect-ratio so nothing jumps as the page settles.`,
  },

  content: {
    id: "content",
    label: "Content",
    blurb: "Real, specific copy — never lorem ipsum.",
    prompt: `CONTENT.

Write real copy for this specific business. Invent the specifics and commit to
them: product names, prices with a consistent currency, opening hours, a
plausible street address, staff first names, believable review text.

Never lorem ipsum. Never "Your text here", "Lorem", "Product 1", or a grey box
containing the word "image". Never a bracketed placeholder.

Headlines say something concrete — "Roasted in small batches every Tuesday",
not "Welcome to our website". Buttons name their action — "Reserve a table",
not "Click here".

Consistency is checked: a price on the card matches the price in the cart, a
name in the header matches the one in the footer and the <title>, and any
count stated in prose matches the number of items actually rendered.

Where an image belongs, use an inline SVG or a CSS gradient placeholder that
looks deliberate — never a broken external URL.`,
  },

  login: {
    id: "login",
    label: "Login",
    blurb: "Sign-in and sign-up screens, validated client-side.",
    prompt: `AUTH UI.

Build sign-in and sign-up as real forms with working client-side validation:
  - required fields flagged on blur, not only on submit
  - email checked for shape, password for a minimum length
  - errors rendered inline next to the field, wired with aria-describedby
  - the submit button disabled while the form is invalid
  - a single "signed in as X" state in the header once accepted

Session state lives in localStorage under one namespaced key, and the header
reflects it on load so a refresh does not appear to sign the user out.

IMPORTANT — put this in a comment at the top of the auth code, in these words:
nothing here verifies anything. There is no server, no password is checked
against any record, and localStorage is fully editable by the visitor. This is
the shape of a sign-in flow, not security. Never present it to an end user as
though their account is protected.`,
  },

  store: {
    id: "store",
    label: "Data Store",
    blurb: "Products, cart and orders persisted in localStorage.",
    prompt: `DATA LAYER — this is the backend, and it runs in the browser.

Write ONE store module that everything else goes through. No other file may
touch localStorage directly.

API: list(), get(id), add(record), update(id, patch), remove(id), and a
subscribe(fn) that notifies on change so views re-render.

Persistence rules that matter:
  - one namespaced key, JSON encoded
  - EVERY read wrapped in try/catch and validated after parse. The key may be
    absent, may hold "undefined", may hold JSON of the wrong shape from an
    older version. Any of those falls back to the seed rather than throwing.
  - EVERY write wrapped in try/catch. Private browsing and a full quota both
    throw on setItem; catch it, keep working from memory, and surface one
    non-blocking notice instead of dying.
  - ids from crypto.randomUUID() where available, else a counter
  - seed realistic starting records on first run only, never overwriting data
    that already exists

State plainly in a comment: this is per-browser storage. Two visitors do not
see the same data, and clearing site data erases it. Real persistence, but not
a shared database.`,
  },

  "image-upload": {
    id: "image-upload",
    label: "Image Upload",
    blurb: "Pick an image, preview it, keep it as a data URL.",
    prompt: `IMAGE UPLOAD.

<input type="file" accept="image/*"> read through FileReader into a data URL,
previewed immediately in an <img> with a fixed aspect-ratio so the layout does
not jump.

Guard rails, each with a visible message rather than silent failure:
  - reject anything over 2MB, naming the actual size
  - reject a file whose type does not start with "image/"
  - handle reader.onerror, so a corrupt file does not leave a dead spinner
  - offer a way to remove a chosen image

Store the data URL on the record it belongs to, through the store module.
Note in a comment that data URLs run about a third larger than the file and
localStorage caps out near 5MB, so this suits a handful of images and not a
gallery. Nothing is uploaded anywhere — there is no server.`,
  },

  motion: {
    id: "motion",
    label: "Motion",
    blurb: "Restrained animation on transform and opacity only.",
    prompt: `MOTION.

Animate transform and opacity ONLY. Never width, height, top, left, margin or
padding — those force layout every frame and turn a smooth animation into a
stutter on a mid-range phone.

Durations 120-320ms. cubic-bezier(0.22, 1, 0.36, 1) for entrances, ease-out
for exits. Nothing bounces more than once.

Scroll reveal with IntersectionObserver rather than a scroll listener: observe
once, unobserve after revealing, and stagger siblings by about 60ms through a
CSS custom property so a grid arrives in sequence instead of all at once.

Cards lift by translateY(-2px) on hover with a deeper shadow. Buttons take
scale(0.99) on :active so a press feels physical.

Wrap all of it in @media (prefers-reduced-motion: no-preference), and make the
reduced path a plain instant state — never merely a faster animation.`,
  },

  seo: {
    id: "seo",
    label: "SEO",
    blurb: "Title, description, Open Graph, semantic landmarks.",
    prompt: `SEO.

In <head>: a specific <title> naming the business and what it does, a meta
description under 155 characters, meta viewport, lang on <html>, theme-color,
and Open Graph plus Twitter card tags.

Structure: exactly one <h1> per page, headings in order with no level skipped,
and real landmarks — header, nav, main, footer — with each <section> carrying
aria-labelledby pointing at its own heading.

Add JSON-LD in <script type="application/ld+json"> matching what the site
actually is (LocalBusiness, Restaurant, Store, Person), with name, description
and address consistent with the visible copy.

Every link has meaningful text — never "click here". Every image has alt that
describes it, or alt="" when purely decorative.`,
  },

  a11y: {
    id: "a11y",
    label: "Accessibility",
    blurb: "Keyboard reachable, labelled, announced.",
    prompt: `ACCESSIBILITY.

Keyboard: every control reachable by Tab in a sensible order, operable with
Enter and Space, with a visible :focus-visible ring. Nothing takes a positive
tabindex. A "skip to content" link is the first focusable element.

Labels: every input has a real <label for>. Icon-only buttons carry aria-label.
Radio and checkbox groups sit in a fieldset with a legend.

Dialogs and menus: focus moves in on open and returns to the trigger on close,
Escape closes, focus is trapped while open, and the trigger carries
aria-expanded.

Live regions: anything that changes without a page load — a cart count, a
filter result, a form error — announces through aria-live="polite", and errors
use role="alert".

Never convey meaning by colour alone. Touch targets at least 44x44px.`,
  },

  admin: {
    id: "admin",
    label: "Admin Panel",
    blurb: "A private screen to manage the underlying records.",
    prompt: `ADMIN.

A separate view listing records in a table with add, edit and delete.

Requirements:
  - the table scrolls inside its own overflow-x wrapper on narrow screens
  - add and edit share one form, prefilled when editing
  - validation inline, submit disabled while invalid
  - delete confirms first, naming the record, and stays undoable for a few
    seconds through a toast rather than being instant and final
  - an empty state explaining how to add the first record
  - a visible count matching the rows actually rendered

It reads and writes exclusively through the store module — never its own copy
of the data, or the two views drift apart the moment one of them writes.

Note in a comment that this screen is not protected: anyone who can open the
page can use it, because there is no server to check a session against.`,
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
