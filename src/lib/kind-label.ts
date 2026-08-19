/**
 * Display names for the `kind` recorded against every credit spend.
 *
 * Lives apart from the pages that render it because the plans page and the
 * rail's usage popover both label the same rows, and two copies drift.
 *
 * Unknown kinds fall through to the raw value: a spend recorded by a tool
 * added later should still show up in the breakdown rather than vanish.
 */
export const KIND_LABEL: Record<string, string> = {
  chat: "Chat",
  docs: "Documents",
  sheets: "Spreadsheets",
  slides: "Slides",
  design: "Design",
  research: "Research",
  code: "Code",
  agent: "Agents",
  team: "AI Team",
  site: "Website builder",
};

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind;
}
