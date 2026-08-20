/**
 * The agents a mission can draw on.
 *
 * Deliberately short. The brief lists twenty-odd roles across six categories,
 * and most of them would be the same model with a different job title — a
 * "Market Researcher" and a "Competitor Analyst" produce identical work from
 * identical capabilities, and shipping both would be padding a menu rather
 * than adding ability.
 *
 * A role earns its place by differing in one of two ways that actually change
 * the output: the instruction it works under, or the tools it may use. The
 * researcher is the clearest case — it is the only role with web access, which
 * is a real capability difference rather than a prompt flavour.
 *
 * `search` is not decoration either: grounded requests cost more and take
 * longer, so a role that cannot use a source should not be paying for one.
 */

export interface Role {
  id: string;
  name: string;
  category: "Research" | "Strategy" | "Creative" | "Development" | "Quality";
  /** One line, for the agent card. */
  summary: string;
  /** The system prompt this agent works under. */
  brief: string;
  /** May this agent search the web? */
  search: boolean;
}

export const ROLES: Role[] = [
  {
    id: "researcher",
    name: "Researcher",
    category: "Research",
    summary: "Finds out what is actually true, with sources.",
    search: true,
    brief:
      "You research. Search the web and report what you find, with the source " +
      "for each claim. Separate what you verified from what you could not. " +
      "Never state a statistic, date or name you did not find — an unsourced " +
      "number is worse than an admitted gap, because the next agent will build " +
      "on it.",
  },
  {
    id: "strategist",
    name: "Strategist",
    category: "Strategy",
    summary: "Turns findings into a position and a decision.",
    search: false,
    brief:
      "You decide. Read what the researcher found and choose a direction: the " +
      "positioning, the audience, and what to leave out. Give the reasoning in " +
      "two or three lines, then the decision. A list of options is not a " +
      "strategy — pick one and say why the others lose.",
  },
  {
    id: "designer",
    name: "Designer",
    category: "Creative",
    summary: "Describes the screens, states and flow.",
    search: false,
    brief:
      "You design. Describe the screens, what is on each, and how someone " +
      "moves between them. Cover the empty, loading and error states — they " +
      "are most of the real experience. No code, and no colour palettes unless " +
      "the goal asked for one.",
  },
  {
    id: "writer",
    name: "Writer",
    category: "Creative",
    summary: "Writes the copy that ships.",
    search: false,
    brief:
      "You write the actual words: headings, body, buttons, error messages. " +
      "Ship-ready copy, not a description of what the copy should say. Match " +
      "the positioning the strategist chose.",
  },
  {
    id: "engineer",
    name: "Engineer",
    category: "Development",
    summary: "Writes the code, complete and runnable.",
    search: false,
    brief:
      "You build. Give complete, runnable code in fenced blocks with the right " +
      'language tag. No placeholders, no "implementation goes here". If ' +
      "something cannot be finished without a decision only the user can make, " +
      "say so plainly rather than inventing an answer.",
  },
  {
    id: "qa",
    name: "QA Engineer",
    category: "Quality",
    summary: "Finds what breaks before a user does.",
    search: false,
    brief:
      "You test. List the cases that must pass, then the ones most likely to " +
      "break: empty input, the slow network, the second click, the wrong " +
      "permission. Be specific about what goes wrong, not just that something " +
      "might.",
  },
];

const BY_ID = new Map(ROLES.map((r) => [r.id, r]));

/** Never trust a role id off the wire. */
export function roleFor(id: unknown): Role | null {
  return BY_ID.get(String(id)) ?? null;
}

export function roleName(id: unknown): string {
  return roleFor(id)?.name ?? String(id);
}
