import type { IconType } from "react-icons";
import {
  TbWorld,
  TbRobot,
  TbMicroscope,
  TbFileText,
  TbTable,
  TbPresentation,
  TbUsers,
  TbCode,
  TbPalette,
} from "react-icons/tb";

export interface FeatureSection {
  heading: string;
  body: string;
}

export interface Feature {
  slug: string;
  /** The nav/footer label. */
  label: string;
  /** <title>. Written as a search result, not as a headline. */
  title: string;
  /** <meta description>, 140-160 characters. */
  description: string;
  icon: IconType;
  tone: string;
  /** The h1. */
  headline: string;
  /** One paragraph under the h1. */
  standfirst: string;
  /** What it actually does, in order of what matters. */
  sections: FeatureSection[];
  /** Concrete things it produces. Facts, not adjectives. */
  facts: string[];
  /** Where the tool lives, for a signed-in reader. */
  href: string;
}

/**
 * The public pages, one per capability.
 *
 * Every claim here describes something the app actually does today. That rules
 * a few things out on purpose: Automation is not here because it renders a
 * "Coming soon" screen, and there are no numbers about customers, uptime or
 * time saved anywhere on these pages, because there is nothing to measure yet
 * and an invented figure is the fastest way to lose a reader who checks.
 *
 * The tone is deliberately plain. A search result competing on "AI website
 * builder" is not won with adjectives — the reader wants to know what comes
 * out the other end and whether they can download it.
 */
export const FEATURES: Feature[] = [
  {
    slug: "ai-website-builder",
    label: "Website builder",
    title: "AI website builder",
    description:
      "Describe a site and Trove writes the real files, shows a live preview, and keeps editing it in the same conversation. Export the code whenever you want.",
    icon: TbWorld,
    tone: "#7c6fff",
    headline: "Describe a website. Get the actual files.",
    standfirst:
      "Trove plans the pages, writes the markup and styles, and renders a live preview beside the conversation. It is a real project on disk, not a screenshot of one — so when you ask for the pricing section to be tighter, it edits the file and the preview updates.",
    sections: [
      {
        heading: "It builds, then it keeps building",
        body: "The first answer is a working site, not a template to fill in. After that it is a conversation: change the copy, add a section, restructure the navigation. Each change is applied to the files you already have rather than starting a new generation from scratch, so nothing you liked gets thrown away to get the one thing you asked for.",
      },
      {
        heading: "You can see what it is doing",
        body: "The build runs as a visible sequence of steps with the file being written at each one. When something fails it says which step and why, rather than returning an apology and no site.",
      },
      {
        heading: "The output is yours",
        body: "What it produces is standard HTML and CSS. There is no runtime to install and no lock-in: take the files and host them anywhere.",
      },
    ],
    facts: [
      "Live preview beside the conversation",
      "Edits apply to existing files rather than regenerating",
      "Standard HTML and CSS you can host anywhere",
    ],
    href: "/websites",
  },
  {
    slug: "ai-agents",
    label: "AI agents",
    title: "Build your own AI agents",
    description:
      "Give an agent a role, instructions and tools, and it becomes a specialist you can brief and talk to. Your agents are saved and reusable, not one-off prompts.",
    icon: TbRobot,
    tone: "#a78bfa",
    headline: "An agent is a specialist you write down once.",
    standfirst:
      "Most AI work is re-explaining context. An agent holds that context: a name, a role, the instructions it always follows, and the tools it is allowed to use. You brief it once and then just talk to it.",
    sections: [
      {
        heading: "Instructions it does not forget",
        body: "The role and the instructions belong to the agent, not to the conversation. Open it a week later and it still knows it reviews code for security, or drafts in your house style, or answers only from the policy you gave it.",
      },
      {
        heading: "Several of them, doing different jobs",
        body: "A support agent, a code reviewer and a research assistant are three different sets of instructions, so they are three agents. Each keeps its own brief and its own conversations.",
      },
      {
        heading: "Or a team that works in order",
        body: "The AI Team runs four specialists over one task in sequence — an architect, a designer, an engineer and a QA engineer — each one seeing what the previous one produced. It is a different shape of work from asking a single agent, and it suits a task that genuinely has stages.",
      },
    ],
    facts: [
      "Role, instructions and tools saved per agent",
      "Conversations kept per agent",
      "A four-specialist team for staged work",
    ],
    href: "/agents",
  },
  {
    slug: "ai-research",
    label: "Research",
    title: "AI research that separates fact from guess",
    description:
      "Trove searches the web, cites what it used, and puts anything it could not verify under Open questions instead of stating it confidently.",
    icon: TbMicroscope,
    tone: "#22d3ee",
    headline: "Findings, sources, and an honest list of what it could not confirm.",
    standfirst:
      "The failure mode of AI research is a confident paragraph with a made-up statistic in it. Trove structures the answer so that the difference between what it found and what it is guessing is visible on the page.",
    sections: [
      {
        heading: "It searches, and it says what it used",
        body: "Research runs against live web results rather than only what the model remembers, and the sources it actually drew on are listed under the answer. A citation that is not in that list is visibly wrong, which is the point — it makes the answer checkable.",
      },
      {
        heading: "Open questions are part of the output",
        body: "Anything it could not substantiate goes under a heading called Open questions rather than being smoothed into the prose. That section is often the most useful part, because it tells you where to look next.",
      },
      {
        heading: "Follow-ups build on the thread",
        body: "Ask it to go deeper on one finding and it works from the research already done rather than starting again. The whole thread is saved, so you can reopen it and carry on.",
      },
    ],
    facts: [
      "Live web search, with the sources listed",
      "Unverified claims kept under Open questions",
      "Threads saved and continuable",
    ],
    href: "/research",
  },
  {
    slug: "documents-and-spreadsheets",
    label: "Documents & files",
    title: "Documents, spreadsheets and decks you can download",
    description:
      "Real documents, editable spreadsheets and slide decks, exported as .docx, .xlsx, .csv and .pptx — files that open properly in Word, Excel and PowerPoint.",
    icon: TbFileText,
    tone: "#60a5fa",
    headline: "Finished files, not text you have to reformat.",
    standfirst:
      "The gap between an AI answer and something you can send is usually an hour of reformatting. These tools close it: what comes out is a document, a grid or a deck, and it downloads in the format the person receiving it expects.",
    sections: [
      {
        heading: "Documents",
        body: "A structured draft with real headings, an outline you can navigate, and a word count. It downloads as .docx that opens in Word with its formatting intact, or as markdown if that is where it is going next.",
      },
      {
        heading: "Spreadsheets",
        body: "A real grid, not a table in a message. Edit any cell, sort by any column, and see totals for the columns that are genuinely numeric. It exports to .xlsx and .csv, and your edits go with it.",
      },
      {
        heading: "Slides",
        body: "A deck with a title slide, content slides and speaker notes, editable slide by slide with undo. It exports to .pptx.",
      },
      {
        heading: "They keep the conversation",
        body: "Ask for a shorter introduction or an extra column and it revises what is on screen — including the edits you made by hand — rather than regenerating from the original request and quietly losing them.",
      },
    ],
    facts: [
      "Exports to .docx, .xlsx, .csv and .pptx",
      "Spreadsheet cells are editable and sortable",
      "Follow-ups revise your edited version",
    ],
    href: "/documents",
  },
];

export function featureBySlug(slug: string): Feature | undefined {
  return FEATURES.find((f) => f.slug === slug);
}

/** Everything else the workspace does, named honestly and linked from nowhere else. */
export const ALSO: { label: string; icon: IconType; note: string }[] = [
  { label: "Code", icon: TbCode, note: "Complete, runnable code with the decisions explained." },
  { label: "Design", icon: TbPalette, note: "A brief becomes rendered screens and editable design tokens." },
  { label: "Slides", icon: TbPresentation, note: "Decks with speaker notes, exported to PowerPoint." },
  { label: "Spreadsheets", icon: TbTable, note: "An editable grid that exports to Excel." },
  { label: "AI Team", icon: TbUsers, note: "Four specialists working one task in order." },
];
