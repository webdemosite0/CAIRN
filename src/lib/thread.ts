export interface Turn {
  role: "user" | "model";
  text: string;
}

/**
 * How much of a thread is sent back to the model.
 *
 * Every follow-up re-sends the conversation, so an unbounded thread costs more
 * on each turn than the one before it. Twenty messages is roughly ten
 * exchanges — far more context than these tools need, and still a fixed
 * ceiling on what one request can cost.
 */
export const MAX_TURNS = 20;

/**
 * The conversation out of a request body, or nothing.
 *
 * Lives here rather than in the route so it can be tested against the shapes
 * a browser actually sends — including the ones it should not. Anything
 * unrecognised is treated as a user turn rather than rejected: a thread with
 * one odd role is still worth answering, and the alternative is a 400 on a
 * question someone typed.
 */
export function readTurns(body: unknown): Turn[] {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw)) return [];

  const out: Turn[] = [];
  for (const m of raw) {
    const role = (m as Turn)?.role === "model" ? "model" : "user";
    const text = String((m as Turn)?.text ?? "").trim();
    // Empty turns are dropped: the placeholder the client shows while a reply
    // streams is one, and sending it back would ask the model to continue an
    // empty message of its own.
    if (text) out.push({ role, text });
  }

  // The tail, not the head: the newest exchange is the one being answered.
  return out.slice(-MAX_TURNS);
}

/** The most recent thing the person actually asked. */
export function lastUserText(turns: Turn[]): string {
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === "user") return turns[i].text;
  }
  return "";
}
