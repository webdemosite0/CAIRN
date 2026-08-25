/**
 * Pulls a usable design system out of the prose the model writes.
 *
 * The design tool asks for "a specific colour palette with hex values, a type
 * scale with sizes and weights, spacing rhythm". It gets them — as a document
 * you can read and nothing else. Every value in it is real, and all of them
 * are trapped in a paragraph.
 *
 * This finds them so they can be edited and exported. It is deliberately
 * lenient: models format the same spec as a table one time, a bullet list the
 * next, and "Primary — #4F46E5" the time after that. Parsing loosely here is
 * far cheaper than trying to pin the output format, and a drift in phrasing
 * degrades to fewer tokens rather than none.
 *
 * Pure and dependency-free, so it can be tested directly.
 */

export interface ColourToken {
  name: string;
  hex: string;
}

export interface TypeToken {
  name: string;
  /** px. Models write rem sometimes; that is converted on the way in. */
  size: number;
  weight: number;
}

export interface SpaceToken {
  name: string;
  value: number;
}

export interface DesignSystem {
  colours: ColourToken[];
  type: TypeToken[];
  spacing: SpaceToken[];
}

const WEIGHT_WORDS: Record<string, number> = {
  thin: 100,
  light: 300,
  regular: 400,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

/**
 * The list marker, emphasis, table pipes and box-drawing a model wraps a label
 * in.
 *
 * The box characters are not decoration to ignore later — models draw whole
 * palettes as ASCII tables, and without stripping them every name arrives with
 * a │ attached.
 */
function stripMarkers(line: string): string {
  return line
    .replace(/[│┌┐└┘├┤┬┴┼─═║╔╗╚╝]/g, " ")
    .replace(/^\s*[-*•]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .replace(/[*`_#|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trailing punctuation a label carries when it precedes a value. */
function trimJoiner(s: string): string {
  return s.replace(/[:\-–—=(/]+\s*$/, "").trim();
}

/**
 * Words that are never a token's name.
 *
 * A label is a noun someone chose — "Primary", "Display", "warm neutral". The
 * words here are the scaffolding a sentence puts around one, and keeping them
 * produced names like "sits warm neutral" and "Headings are set at".
 */
const GRAMMAR =
  /^(the|a|an|of|on|in|at|by|with|for|and|or|to|is|are|be|as|its|it|this|that|uses?|set|sits?|using|from|has|have)$/i;

/**
 * Labels that mean a measurement rather than a type step.
 *
 * "Page Margin 32px" and "Border Radius 8px" have exactly the shape of a scale
 * entry — a short label, then px — and both were landing in the type scale
 * beside Body and Caption.
 */
const NOT_TYPE =
  /\b(margin|padding|gap|gutter|radius|border|stroke|width|height|inset|offset|spacing|shadow|blur|icon|grid|column|row)\b/i;

/* --------------------------------------------------------------- colours */

/** #abc and #aabbcc, normalised to six digits. */
const HEX = /#([0-9a-f]{6}|[0-9a-f]{3})\b/gi;

function expand(hex: string): string {
  const h = hex.replace("#", "").toLowerCase();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return `#${full}`;
}

/**
 * The label for a colour: what sits immediately before the value.
 *
 * Capped at three words. In prose a model writes "the interface sits on a warm
 * neutral (#F7F6F3)", and taking the whole clause gave names like "on a warm
 * neutral" — so the last word or two, which is where the actual noun is.
 */
function labelBefore(text: string, at: number): string {
  let line = text.slice(Math.max(0, at - 90), at).split("\n").pop() ?? "";

  // Stop at the previous value. Without this, "(#F7F6F3) with indigo (#4F46E5)"
  // gave the second colour the name "( F7F6F3) indigo" — the tail of the first
  // one leaking into the second.
  const lastClose = Math.max(line.lastIndexOf(")"), line.lastIndexOf("#"));
  if (lastClose >= 0) line = line.slice(lastClose + 1);

  const cleaned = trimJoiner(stripMarkers(line));
  if (!cleaned) return "";

  // Grammar words are never the label, so anything left after dropping them is
  // the noun the writer used.
  const words = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !GRAMMAR.test(w));

  const name = words.slice(-3).join(" ").trim();
  return name.length > 1 && name.length <= 40 ? name : "";
}

/**
 * The label when it follows the value instead of preceding it.
 *
 * Models routinely draw a palette as an ASCII table with the hex in the first
 * column: "│ #090A0F  Background (Canvas) │". Looking only backwards named
 * every one of those "Colour 1", "Colour 2" — the values were right and the
 * vocabulary was gone.
 *
 * Stops at an opening bracket, because the parenthetical is a gloss rather
 * than the name: "Background (Canvas)" is Background.
 */
function labelAfter(text: string, endsAt: number): string {
  const line = text.slice(endsAt, endsAt + 90).split("\n")[0] ?? "";
  const cleaned = stripMarkers(line.split("(")[0])
    .replace(/^[:\-–—=]+\s*/, "")
    .trim();
  if (!cleaned) return "";

  const words = cleaned.split(/\s+/).filter(Boolean).filter((w) => !GRAMMAR.test(w));
  const name = words.slice(0, 3).join(" ").trim();
  return name.length > 1 && name.length <= 40 ? name : "";
}

export function parseColours(markdown: string): ColourToken[] {
  const out: ColourToken[] = [];
  const seen = new Set<string>();

  for (const m of markdown.matchAll(HEX)) {
    const hex = expand(m[0]);
    if (seen.has(hex)) continue;
    seen.add(hex);

    const at = m.index ?? 0;
    const name =
      labelBefore(markdown, at) ||
      labelAfter(markdown, at + m[0].length) ||
      `Colour ${out.length + 1}`;

    out.push({ name, hex });
  }

  return out;
}

/* ------------------------------------------------------------------ type */

/**
 * The weight on a type line, wherever it sits.
 *
 * Searched separately rather than as an optional group in one large pattern.
 * Inside the pattern the lazy quantifiers preferred to match it empty, so
 * every size came back 400 — including ones plainly written "/ 700".
 */
function weightOn(line: string): number {
  const numeric = line.match(/\b([1-9]00)\b/);
  if (numeric) return Number(numeric[1]);
  const word = line.match(
    /\b(thin|light|regular|normal|medium|semibold|bold|extrabold|black)\b/i,
  );
  return word ? WEIGHT_WORDS[word[1].toLowerCase()] : 400;
}

export function parseType(markdown: string): TypeToken[] {
  const out: TypeToken[] = [];
  const seen = new Set<number>();

  for (const raw of markdown.split("\n")) {
    const size = raw.match(/(\d+(?:\.\d+)?)\s*(px|rem)\b/i);
    if (!size) continue;

    const value = Number(size[1]);
    const px = size[2].toLowerCase() === "rem" ? Math.round(value * 16) : value;
    // A type scale holds neither a 2px hairline nor a 400px canvas.
    if (!Number.isFinite(px) || px < 9 || px > 200 || seen.has(px)) continue;

    /**
     * The label is whatever precedes the size, once markers are gone.
     *
     * This used to split the whole line on a character class containing "-",
     * which on a bullet line took the empty string before the bullet — so
     * every name fell through to "Size 48" and the scale lost its vocabulary.
     */
    const label = trimJoiner(stripMarkers(raw.slice(0, size.index ?? 0)));
    if (!label) continue;

    /**
     * A line that merely mentions a size has a sentence in front of it, not a
     * label — "Headings are set at 32px". Two signals separate the two: a
     * scale entry is short, and it does not trail off in a grammar word.
     * Without the second test that sentence passed on length alone and put a
     * junk entry in the scale.
     */
    const words = label.split(/\s+/);
    if (words.length > 3) continue;
    if (GRAMMAR.test(words[words.length - 1])) continue;

    // A measurement is not a type size. "Page Margin 32px" and "Border Radius
    // 8px" are both a short label followed by px, and both were landing in the
    // scale beside Body and Caption.
    if (NOT_TYPE.test(label)) continue;

    seen.add(px);
    out.push({ name: label.slice(0, 40), size: px, weight: weightOn(raw) });
  }

  return out.sort((a, b) => b.size - a.size);
}

/* --------------------------------------------------------------- spacing */

/**
 * The spacing rhythm, taken from the lines that name it.
 *
 * Scanning the whole document returned the type scale instead — 13, 16, 28,
 * 48 rather than 4, 8, 12, 16, 24, 32 — because those are px values too.
 */
export function parseSpacing(markdown: string): SpaceToken[] {
  const lines = markdown.split("\n");
  let source = "";

  for (let i = 0; i < lines.length; i++) {
    if (!/\b(spacing|rhythm|grid|gutter|increments?)\b/i.test(lines[i])) continue;
    // The heading itself rarely carries numbers; the lines under it do.
    const window = lines.slice(i, i + 4).join(" ");
    if (/\d+\s*px/i.test(window)) {
      source = window;
      break;
    }
  }
  if (!source) return [];

  const values = new Set<number>();
  for (const m of source.matchAll(/\b(\d{1,3})\s*px\b/gi)) {
    const n = Number(m[1]);
    if (n >= 2 && n <= 160) values.add(n);
  }

  return [...values]
    .sort((a, b) => a - b)
    .slice(0, 10)
    .map((value) => ({ name: String(value), value }));
}

export function parseDesign(markdown: string): DesignSystem {
  return {
    colours: parseColours(markdown).slice(0, 16),
    type: parseType(markdown).slice(0, 10),
    spacing: parseSpacing(markdown),
  };
}

/* ---------------------------------------------------------------- export */

/** A name a CSS variable can carry, and never an empty one. */
export function slug(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "token";
}

/** Makes every slug unique, so two tokens cannot claim one variable. */
function uniqueSlugs<T>(items: T[], nameOf: (item: T) => string): string[] {
  const used = new Map<string, number>();
  return items.map((item) => {
    const base = slug(nameOf(item));
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    return n === 0 ? base : `${base}-${n + 1}`;
  });
}

export function toCssVariables(system: DesignSystem): string {
  const lines = [":root {"];

  const colourNames = uniqueSlugs(system.colours, (c) => c.name);
  system.colours.forEach((c, i) => lines.push(`  --color-${colourNames[i]}: ${c.hex};`));

  if (system.colours.length && system.type.length) lines.push("");
  const typeNames = uniqueSlugs(system.type, (t) => t.name);
  system.type.forEach((t, i) => {
    lines.push(`  --text-${typeNames[i]}: ${t.size}px;`);
    lines.push(`  --text-${typeNames[i]}-weight: ${t.weight};`);
  });

  if (system.spacing.length) lines.push("");
  for (const s of system.spacing) lines.push(`  --space-${s.name}: ${s.value}px;`);

  lines.push("}");
  return lines.join("\n") + "\n";
}

export function toJsonTokens(system: DesignSystem): string {
  const colourNames = uniqueSlugs(system.colours, (c) => c.name);
  const typeNames = uniqueSlugs(system.type, (t) => t.name);

  return (
    JSON.stringify(
      {
        color: Object.fromEntries(system.colours.map((c, i) => [colourNames[i], c.hex])),
        fontSize: Object.fromEntries(
          system.type.map((t, i) => [typeNames[i], { size: `${t.size}px`, weight: t.weight }]),
        ),
        spacing: Object.fromEntries(system.spacing.map((s) => [s.name, `${s.value}px`])),
      },
      null,
      2,
    ) + "\n"
  );
}
