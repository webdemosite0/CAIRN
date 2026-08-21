/**
 * What the model is told about *now*.
 *
 * A language model has no clock. Without being told, it answers "what is
 * today's date" from whenever its training data ended, and — worse — answers
 * "what is X's net worth" or "who runs Y" with equal confidence from the same
 * stale snapshot, because nothing in the prompt suggests those facts have a
 * shelf life.
 *
 * Two things fix that, and both have to be present: the date, so it knows how
 * old its own knowledge is, and permission to search, so it can do something
 * about it.
 *
 * Pure and dependency-free — the routes compose it into their own prompts.
 */

/** Long form: "Friday, 21 August 2026". */
function formatDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(now);
}

function formatTime(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(now);
}

/**
 * Accepts a caller-supplied IANA zone, or falls back to UTC.
 *
 * The browser knows the reader's zone and the server does not — on Vercel the
 * server is UTC regardless of where anyone is, so "today" can legitimately be
 * yesterday. An unusable or hostile value falls back rather than throwing,
 * because a bad header should not take a chat request down.
 */
export function safeTimeZone(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 64) return "UTC";
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return "UTC";
  }
}

/**
 * The reader's IANA zone, e.g. "Asia/Karachi". Client-side.
 *
 * Wrapped because Intl can throw on a locked-down runtime, and a missing
 * timezone should cost the date's precision, not the whole request.
 */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * The situational block appended to every system prompt.
 *
 * `canSearch` changes the instruction rather than being cosmetic: telling a
 * model to "search for it" when it has no search tool produces a confident
 * claim that it looked something up, which is worse than admitting the limit.
 */
export function situation({
  now = new Date(),
  timeZone = "UTC",
  canSearch = false,
}: {
  now?: Date;
  timeZone?: string;
  canSearch?: boolean;
} = {}): string {
  const zoneNote = timeZone === "UTC" ? "UTC" : timeZone;
  const stamp = `Today is ${formatDate(now, timeZone)}, ${formatTime(now, timeZone)} (${zoneNote}).`;

  const knowledge = canSearch
    ? `Your training data ends well before this. Anything that changes over time — ` +
      `prices, valuations, net worth, rankings, who currently holds a role or office, ` +
      `the latest version of something, recent events — must be looked up with your ` +
      `search tool rather than recalled. Recall is how you end up stating last year's ` +
      `number as today's fact. If a search returns nothing usable, say you could not ` +
      `verify it instead of falling back on memory.`
    : `Your training data ends well before this, and you have no way to look anything ` +
      `up in this request. For anything that changes over time — prices, valuations, ` +
      `who currently holds a role, recent events — say plainly that your information ` +
      `may be out of date, and give the date it is from if you know it. Do not present ` +
      `a remembered figure as the current one.`;

  return `${stamp}\n\n${knowledge}`;
}

/**
 * How to handle an explicit instruction about length or shape.
 *
 * This exists because "what is Elon Musk's net worth in one word" came back as
 * a paragraph. The house style says to be thorough and well structured, and
 * with nothing to rank them the model followed the standing instruction over
 * the immediate one. A request for one word is not a stylistic preference to
 * be balanced against others — it is the whole task.
 */
export const OBEY_FORMAT = `When the user specifies a length, a format, or a shape — "in one word",
"just the number", "three bullets", "one sentence", "as JSON", "no explanation" — follow it
exactly. That instruction outranks every other style rule you have been given, including any
preference for detail, structure, caveats, or completeness. One word means one word: no
sentence around it, no unit unless asked, no follow-up offer. If following it exactly would
make the answer wrong or misleading, give the requested form first and add at most one short
line after it.`;
