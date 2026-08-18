/**
 * Turns the deck outline the model writes into structured slides.
 *
 * The prompt asks for "## Slide N — Title", bullets, then a "Note:" line, but
 * models drift: they use plain "## Title", numbered bullets, an em dash or a
 * hyphen, or bold the note. Parsing leniently here is much cheaper than trying
 * to force exact output, and it keeps a stray format change from producing an
 * empty deck.
 */

export type Slide = {
  title: string;
  bullets: string[];
  /** Speaker note, if the model wrote one. */
  note: string;
};

/** Matched against emphasis-stripped text, so "**Note:**" and "Note —" agree. */
const NOTE = /^note\s*[:—–-]\s*(.+)$/i;
const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/;

/** Strips the markdown emphasis the model sprinkles in; slides render plain. */
function clean(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<!\*)\*(?!\s)([^*]+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim();
}

/** Drops a leading "Slide 3 —" / "Slide 3:" so it doesn't render twice. */
function stripSlideLabel(s: string): string {
  return s.replace(/^slide\s*\d+\s*[—–:.-]?\s*/i, "").trim();
}

export function parseDeck(markdown: string): Slide[] {
  const slides: Slide[] = [];
  let current: Slide | null = null;

  const push = () => {
    if (current && (current.title || current.bullets.length)) slides.push(current);
  };

  let inCode = false;

  for (const raw of markdown.split("\n")) {
    if (/^\s*```/.test(raw)) {
      inCode = !inCode;
      continue;
    }
    // Fenced blocks are not slide structure; keep their lines as bullets so
    // nothing silently vanishes from the deck.
    if (inCode) {
      if (current && raw.trim()) current.bullets.push(raw.trim());
      continue;
    }

    const heading = raw.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const title = stripSlideLabel(clean(heading[2]));
      // A lone H1 at the very top is the deck title, not a slide.
      if (heading[1].length === 1 && !slides.length && !current) {
        current = { title, bullets: [], note: "" };
        continue;
      }
      push();
      current = { title, bullets: [], note: "" };
      continue;
    }

    const bullet = raw.match(BULLET);

    // Bullets that arrive before any heading still deserve a slide — dropping
    // them would render a whole deck as blank just because the model skipped
    // its headings. Bare prose before the first heading is preamble, so it is
    // left out.
    if (!current) {
      if (!bullet) continue;
      current = { title: "", bullets: [], note: "" };
    }

    const note = clean(raw).match(NOTE);
    if (note) {
      // Later notes append rather than overwrite, so a two-line note survives.
      current.note = current.note ? `${current.note} ${note[1]}` : note[1];
      continue;
    }

    if (bullet) {
      const text = clean(bullet[1]);
      if (text) current.bullets.push(text);
      continue;
    }

    // A bare prose line under a heading is still content worth showing.
    const prose = clean(raw);
    if (prose) current.bullets.push(prose);
  }

  push();
  return slides;
}

/** A filename-safe stem derived from the deck's first title. */
export function deckFilename(slides: Slide[], fallback: string): string {
  const base = slides[0]?.title || fallback || "deck";
  return (
    base
      .slice(0, 48)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "deck"
  );
}
