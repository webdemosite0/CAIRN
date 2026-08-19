/** Shared shapes for the builder, used by both the view and its panels. */

export interface ProjectFile {
  path: string;
  content: string;
}

export type TaskKind = "skill" | "read" | "write" | "check" | "think" | "plan";

export interface Task {
  id: string;
  kind: TaskKind;
  label: string;
  state: "run" | "ok" | "fail";
}

export interface LogLine {
  id: number;
  text: string;
  level: "info" | "warn" | "ok";
  at: string;
}

export interface PlanStep {
  id: string;
  title: string;
  detail: string;
  skills: string[];
  files: string[];
}

export interface BuildPlan {
  title: string;
  summary: string;
  requirements: {
    overview: string;
    features: string[];
    pages: { name: string; purpose: string }[];
    rules: string[];
  };
  style: { name: string; mood: string; palette: string[]; type: string };
  steps: PlanStep[];
}

/**
 * Inlines siblings into index.html so the preview renders from a single
 * srcdoc string. The iframe has no origin of its own, so a relative
 * <link href="styles.css"> would resolve against the app and 404.
 */
export function bundle(files: ProjectFile[], entry = "index.html"): string {
  const index = files.find((f) => f.path === entry) ?? files.find((f) => f.path.endsWith(".html"));
  if (!index) return "";
  let html = index.content;

  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  for (const f of files) {
    if (f === index) continue;
    if (f.path.endsWith(".css")) {
      html = html.replace(
        new RegExp(`<link[^>]*href=["']\\.?/?${esc(f.path)}["'][^>]*>`, "gi"),
        `<style>\n${f.content}\n</style>`,
      );
    }
    if (f.path.endsWith(".js")) {
      html = html.replace(
        new RegExp(
          `<script[^>]*src=["']\\.?/?${esc(f.path)}["'][^>]*>\\s*</script>`,
          "gi",
        ),
        `<script>\n${f.content}\n</script>`,
      );
    }
  }
  return html;
}

/** Merges freshly written files over the existing set, preserving order. */
export function mergeFiles(prev: ProjectFile[], next: ProjectFile[]): ProjectFile[] {
  const out = [...prev];
  for (const f of next) {
    const i = out.findIndex((x) => x.path === f.path);
    if (i > -1) out[i] = f;
    else out.push(f);
  }
  return out;
}

/** A stable, filename-safe stem for downloads. */
export function projectSlug(title: string): string {
  return (
    title
      .slice(0, 48)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "site"
  );
}
