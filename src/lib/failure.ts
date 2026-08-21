/**
 * Turns a thrown message into something a person can act on.
 *
 * The distinction that matters most here is between "your credits ran out" and
 * "every model provider is unavailable". They look identical in a red box —
 * both say something about quota — but one is fixed by upgrading and the other
 * cannot be fixed by the user at all. Showing an Upgrade button for a Gemini
 * outage takes money for a problem the payment does not solve.
 *
 * Pure and dependency-free so client components can import it.
 */

export type FailureKind =
  | "credits" // the account's own monthly allowance
  | "capacity" // every configured AI provider refused
  | "auth" // signed out or not permitted
  | "network" // could not reach the server at all
  | "unknown";

export interface Failure {
  kind: FailureKind;
  title: string;
  detail: string;
  /** The raw message, kept for the "what exactly happened" disclosure. */
  raw: string;
  /** Retrying is pointless for some of these. */
  retryable: boolean;
}

/** The chain failure from lib/ai.ts stamps this in when fallbacks were tried. */
const CHAIN = /Fallbacks were tried/i;

const CAPACITY =
  /\b(429|quota|rate.?limit|exhaust|overload|capacity|busy|unavailable|503|502)\b/i;

const CREDITS = /you have used all .* credits|out of credits/i;

/**
 * A provider key that was refused, rather than a person who was.
 *
 * This has to be tested before AUTH. The compat adapter formats its errors as
 * "OpenRouter returned 401. …", which the bare status-code rule below would
 * otherwise read as the *user* being signed out — showing "Log in again" for a
 * mistyped server-side API key, which sends someone to fix the one thing that
 * is definitely not broken.
 */
const PROVIDER_KEY =
  /api.?key|apikey|_API_KEY|available to this api key|no models? (are )?(configured|available)/i;

/**
 * Deliberately narrow: session language, or a status code that arrived with no
 * provider context. Anything mentioning a key is caught above.
 */
const AUTH =
  /\b(401|403)\b|log ?in|sign ?in|signed out|session (has )?expired|not authorised|not authorized|unauthorized/i;

const NETWORK = /failed to fetch|network ?error|networkerror|offline|econnrefused|timed? ?out/i;

/**
 * A catch-all for provider trouble that no specific rule above matched.
 *
 * Chasing individual phrasings ("is having trouble", "returned an empty
 * response") is a losing game — provider wording changes and new providers get
 * added. Naming the provider is the durable signal: if the message is about
 * Gemini or OpenRouter or the model, then whatever went wrong is on that side,
 * the user's credits are intact, and retrying is the reasonable next move.
 */
const PROVIDER_NAME = /\b(gemini|openrouter|xai|grok|google|the model|model returned)\b/i;

export function classify(raw: unknown): Failure {
  const message = (raw instanceof Error ? raw.message : String(raw ?? "")).trim();
  const base = { raw: message };

  // Order matters. A chain failure mentions quota *and* several providers; it
  // must not be read as the user's own credit balance.
  if (CREDITS.test(message) && !CHAIN.test(message)) {
    return {
      ...base,
      kind: "credits",
      title: "You are out of credits this month",
      detail:
        "Your allowance resets at the start of next month. Upgrading raises it immediately, and unused credits from this month are not carried over.",
      retryable: false,
    };
  }

  if (CHAIN.test(message) || CAPACITY.test(message)) {
    return {
      ...base,
      kind: "capacity",
      title: "No model could answer right now",
      detail: CHAIN.test(message)
        ? "Every configured provider was tried and each one refused. This is a limit on Trove's side, not on your account — your credits were not spent."
        : "The model provider is over its limit or busy. Nothing was charged to your account.",
      retryable: true,
    };
  }

  // Trove's own configuration is wrong. Retrying will fail identically, and it
  // is not something the person reading this can fix — so no retry button, and
  // no suggestion that their account or payment is involved.
  if (PROVIDER_KEY.test(message)) {
    return {
      ...base,
      kind: "capacity",
      title: "The AI service is not set up correctly",
      detail:
        "Trove's connection to the model provider was rejected. This is a configuration problem on our side, not with your account, and nothing was charged.",
      retryable: false,
    };
  }

  if (AUTH.test(message)) {
    return {
      ...base,
      kind: "auth",
      title: "You are signed out",
      detail: "Your session ended. Log in again and the page will pick up where it left off.",
      retryable: false,
    };
  }

  if (NETWORK.test(message)) {
    return {
      ...base,
      kind: "network",
      title: "Could not reach Trove",
      detail: "The request never arrived. Check your connection and try again.",
      retryable: true,
    };
  }

  if (PROVIDER_NAME.test(message)) {
    return {
      ...base,
      kind: "capacity",
      title: "The model could not answer",
      detail:
        "The AI provider failed to complete this one. Your credits were not spent, and running it again usually works.",
      retryable: true,
    };
  }

  return {
    ...base,
    kind: "unknown",
    title: "That did not go through",
    detail: message || "Something failed without saying why.",
    retryable: true,
  };
}

/**
 * Pulls the per-provider breakdown out of a chain failure.
 *
 * lib/ai.ts formats it as "... Fallbacks were tried and also failed —
 * OpenRouter (x): reason · xAI (y): reason". Showing that list is the
 * difference between "it is broken" and "here is which key to look at".
 */
export function providerAttempts(raw: string): { label: string; reason: string }[] {
  const tail = raw.split(/Fallbacks were tried and also failed —\s*/i)[1];
  if (!tail) return [];
  return tail
    .split(" · ")
    .map((chunk) => {
      const at = chunk.indexOf(": ");
      if (at < 0) return { label: chunk.trim(), reason: "" };
      return { label: chunk.slice(0, at).trim(), reason: chunk.slice(at + 2).trim() };
    })
    .filter((a) => a.label);
}
