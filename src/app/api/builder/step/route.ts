import type { NextRequest } from "next/server";
import { generateText } from "@/lib/gemini";
import { toParts, type Attachment } from "@/lib/attachments";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { skillPrompts, skillLabel } from "@/lib/skills";
import { targetFor } from "@/lib/targets";
import { safeProjectPath } from "@/lib/builder";

export const runtime = "nodejs";
export const maxDuration = 180;

export interface ProjectFile {
  path: string;
  content: string;
}

/**
 * Executes one step of a build plan and reports what it did as it happens.
 *
 * The response is a stream of newline-delimited JSON events rather than a
 * single blob, so the task feed and the console show real progress instead of
 * a spinner that guesses. Every event corresponds to something that actually
 * occurred — a skill whose prompt was really appended, a file really read for
 * context, a file really written. Nothing is emitted for effect.
 */
type Event =
  | { t: "task"; id: string; kind: TaskKind; label: string; state: "run" | "ok" | "fail" }
  | { t: "log"; text: string; level?: "info" | "warn" | "ok" }
  | { t: "file"; path: string; content: string }
  | { t: "done"; summary: string }
  | { t: "error"; message: string };

type TaskKind = "skill" | "read" | "write" | "check" | "think";

const BASE = `You are Trove's engineer, executing ONE step of an agreed plan.
The stack is described further down; follow it exactly, including its required
file names and versions.

OUTPUT FORMAT — strict. Reply with only file blocks, then one SUMMARY line:

<<<FILE: index.html>>>
...complete file contents...
<<<END>>>
SUMMARY: one sentence on what this step changed.

HARD RULES
- Emit the COMPLETE contents of every file you write. Never "..." or
  "unchanged" or "rest of file here" — a partial file destroys the project.
- Only emit files this step is responsible for. Leave everything else out.
  Re-emitting an untouched file wastes the step and risks reverting it.
- Use the paths the stack requires. Nested paths are fine where the stack
  expects them; never write outside the project folder.
- ZERO external network requests at runtime. No CDN, no web fonts, no remote
  images, no analytics, no third-party API.

CONTINUITY — you are editing a real project, not starting over
- The files you were given are the source of truth. Reuse their exact class
  names, custom property names and data shapes. Do not rename or re-theme
  anything an earlier step established.
- If an earlier step defined --accent, use var(--accent). Never introduce a
  second colour system alongside the first.
- If an earlier step wrote a store module, go through it. Never read or write
  localStorage directly from a second place.
- New markup must slot into the existing document structure and keep its
  heading order intact.

QUALITY BAR — this ships as-is
- Real, specific copy. No lorem ipsum, no "Product 1", no bracketed
  placeholders, no empty href="#" on a link that should do something.
- Every interactive element works. A button that does nothing is worse than no
  button — either wire it up or leave it out.
- JavaScript is defensive: guard every querySelector result before using it,
  wrap JSON.parse and localStorage in try/catch, and handle the empty state.
  A null reference on line one stops the whole page.
- Responsive to 360px with no horizontal scroll.
- Write the code you would be happy to hand to another engineer: named
  functions over deep nesting, and a short comment wherever the reason for
  something is not obvious from reading it.`;

function parseFiles(raw: string): { files: ProjectFile[]; summary: string } {
  const files: ProjectFile[] = [];
  const re = /<<<FILE:\s*(.+?)\s*>>>\s*\n([\s\S]*?)<<<END>>>/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw))) {
    const path = m[1].trim().replace(/^[./]+/, "");
    let content = m[2];
    const fenced = content.match(/^\s*```[a-z]*\n([\s\S]*?)```\s*$/i);
    if (fenced) content = fenced[1];
    const safe = safeProjectPath(path);
    if (safe) files.push({ path: safe, content: content.replace(/\s+$/, "") + "\n" });
  }

  const summary = raw.match(/SUMMARY:\s*(.+)/);
  return { files, summary: summary ? summary[1].trim() : "Step complete." };
}

/**
 * Cheap static checks, reported to the console.
 *
 * These catch the mistakes that make a generated project fail on first run —
 * a package.json that will not install, Pydantic v1 syntax against v2, a
 * placeholder version — none of which are visible by reading the preview.
 */
function checkFile(f: ProjectFile): string[] {
  const notes: string[] = [];
  const c = f.content;

  if (f.path.endsWith(".html")) {
    if (!/<!DOCTYPE html>/i.test(c)) notes.push("missing <!DOCTYPE html>");
    if (!/<html[\s>]/i.test(c)) notes.push("missing <html>");
    const ext = c.match(/(?:src|href)=["']https?:\/\/[^"']+/gi);
    if (ext) notes.push(`${ext.length} external request(s)`);
  }

  if (f.path.endsWith(".css") && !/:root/.test(c)) {
    notes.push("no :root custom properties");
  }

  if (f.path.endsWith("package.json")) {
    try {
      const pkg = JSON.parse(c) as Record<string, unknown>;
      const deps = {
        ...((pkg.dependencies as Record<string, string>) ?? {}),
        ...((pkg.devDependencies as Record<string, string>) ?? {}),
      };
      // "*" and "latest" install whatever exists on the day, which is how a
      // project that worked once stops working without anything changing.
      const loose = Object.entries(deps)
        .filter(([, v]) => v === "*" || v === "latest" || !v)
        .map(([k]) => k);
      if (loose.length) notes.push(`unpinned dependency: ${loose.join(", ")}`);
      if (!pkg.scripts) notes.push("no scripts — nothing to run");
    } catch {
      notes.push("package.json is not valid JSON — npm install will fail");
    }
  }

  if (f.path.endsWith(".py")) {
    // Pydantic v1 spellings raise on v2 rather than warning.
    if (/@validator\b/.test(c)) notes.push("@validator is Pydantic v1 — use @field_validator");
    if (/class\s+Config\b/.test(c)) notes.push("class Config is Pydantic v1 — use model_config");
    if (/\.dict\(\)/.test(c)) notes.push(".dict() is Pydantic v1 — use .model_dump()");
  }

  if (f.path.endsWith(".jsx") || f.path.endsWith(".tsx")) {
    if (/\bkey=\{(?:i|idx|index)\}/.test(c)) {
      notes.push("list key is the array index — use a stable id");
    }
  }

  return notes;
}

export async function POST(req: NextRequest) {
  let step: { title?: string; detail?: string; skills?: string[]; files?: string[] } = {};
  let files: ProjectFile[] = [];
  let idea = "";
  let styleNote = "";
  let attachments: Attachment[] = [];
  let index = 0;
  let total = 0;
  let target = targetFor("static");

  try {
    const body = await req.json();
    step = body?.step ?? {};
    files = Array.isArray(body?.files) ? body.files : [];
    idea = String(body?.idea ?? "").trim();
    styleNote = String(body?.style ?? "").trim();
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    index = Number(body?.index ?? 0);
    total = Number(body?.total ?? 0);
    target = targetFor(body?.target);
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!step?.title) {
    return Response.json({ error: "No step supplied." }, { status: 400 });
  }

  let account: Awaited<ReturnType<typeof requireCredits>> = null;
  try {
    account = await requireCredits();
  } catch (e) {
    if (e instanceof OutOfCredits) {
      return Response.json(
        { error: e.message, outOfCredits: true, balance: e.balance },
        { status: 402 },
      );
    }
    throw e;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: Event) =>
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));

      const task = (id: string, kind: TaskKind, label: string) => {
        send({ t: "task", id, kind, label, state: "run" });
        return (state: "ok" | "fail" = "ok") =>
          send({ t: "task", id, kind, label, state });
      };

      try {
        send({
          t: "log",
          text: `step ${index + 1}/${total} — ${step.title}`,
        });

        // Skills: each one's prompt is genuinely appended below.
        const skills = Array.isArray(step.skills) ? step.skills : [];
        for (const s of skills) {
          const end = task(`skill-${s}`, "skill", skillLabel(s));
          send({ t: "log", text: `skill ${s} loaded` });
          end();
        }

        // Context: the files this step will build on top of.
        const context = files.filter((f) => f.content);
        for (const f of context.slice(0, 8)) {
          const end = task(`read-${f.path}`, "read", f.path);
          send({
            t: "log",
            text: `read ${f.path} (${f.content.length.toLocaleString()} bytes)`,
          });
          end();
        }

        const thinking = task("gen", "think", `Writing ${(step.files ?? []).join(", ") || "files"}`);

        const system = [
          BASE,
          target.prompt,
          styleNote ? `STYLE DIRECTION: ${styleNote}` : "",
          skillPrompts(skills),
        ]
          .filter(Boolean)
          .join("\n\n");

        const prior = context.length
          ? `Current project files:\n\n${context
              .map((f) => `<<<FILE: ${f.path}>>>\n${f.content}<<<END>>>`)
              .join("\n")}\n\n`
          : "";

        const prompt =
          `${prior}Project idea: ${idea}\n\n` +
          `Now do step ${index + 1} of ${total}: ${step.title}\n` +
          `${step.detail ?? ""}\n` +
          `Files to write in this step: ${(step.files ?? []).join(", ") || "as needed"}`;

        const raw = await generateText({
          onUsage: (u) => account && spend(account.userId, "site", u.totalTokens),
          // Google returns 503 under load and the fallback sweep can take
          // minutes. Reporting each attempt turns an unexplained pause into a
          // visible "still trying", which is the difference between waiting
          // and assuming the app is broken.
          onAttempt: ({ model, status, pass }) =>
            send({
              t: "log",
              text:
                status === 0
                  ? `${model} timed out (pass ${pass}) — trying the next model`
                  : `${model} returned ${status} (pass ${pass}) — trying the next model`,
              level: "warn",
            }),
          turns: [{ role: "user", text: prompt }],
          system,
          temperature: 0.75,
          maxOutputTokens: 32768,
          extraParts: attachments.length ? toParts(attachments) : undefined,
        });

        const { files: written, summary } = parseFiles(raw);

        if (!written.length) {
          thinking("fail");
          send({ t: "log", text: "no file blocks in reply", level: "warn" });
          send({ t: "error", message: "This step produced no files. Try again." });
          controller.close();
          return;
        }
        thinking();

        for (const f of written) {
          const end = task(`write-${f.path}`, "write", f.path);
          send({ t: "file", path: f.path, content: f.content });
          send({
            t: "log",
            text: `wrote ${f.path} (${f.content.length.toLocaleString()} bytes)`,
            level: "ok",
          });
          end();

          const notes = checkFile(f);
          if (notes.length) {
            const c = task(`check-${f.path}`, "check", `${f.path} — ${notes.length} note(s)`);
            notes.forEach((n) =>
              send({ t: "log", text: `${f.path}: ${n}`, level: "warn" }),
            );
            c();
          }
        }

        send({ t: "done", summary });
        controller.close();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        console.error("builder/step", message);
        send({ t: "log", text: message, level: "warn" });
        send({ t: "error", message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
