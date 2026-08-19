import type { NextRequest } from "next/server";
import { generateText } from "@/lib/gemini";
import { toParts, type Attachment } from "@/lib/attachments";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";
import { skillPrompts, skillLabel } from "@/lib/skills";

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

const BASE = `You are Trove's web engineer, executing ONE step of an agreed
plan. The project is a small static site that runs from a folder of files with
no server and no build step.

OUTPUT FORMAT — strict. Reply with only file blocks, then one SUMMARY line:

<<<FILE: index.html>>>
...complete file contents...
<<<END>>>
SUMMARY: one sentence on what this step changed.

Rules:
- Emit the COMPLETE contents of every file you write. Never "..." or
  "unchanged" — a partial file destroys the project.
- Only emit files this step is responsible for. Leave everything else out.
- Flat paths only: index.html, styles.css, script.js, admin.html, store.js.
- index.html links siblings with plain relative paths.
- Zero external requests: no CDN, no web fonts, no remote images. System font
  stacks, CSS gradients, inline SVG and emoji only.
- Keep every file you were given consistent with what you write now — same
  class names, same custom properties, same data shapes.`;

function parseFiles(raw: string): { files: ProjectFile[]; summary: string } {
  const files: ProjectFile[] = [];
  const re = /<<<FILE:\s*(.+?)\s*>>>\s*\n([\s\S]*?)<<<END>>>/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw))) {
    const path = m[1].trim().replace(/^[./]+/, "");
    let content = m[2];
    const fenced = content.match(/^\s*```[a-z]*\n([\s\S]*?)```\s*$/i);
    if (fenced) content = fenced[1];
    if (path) files.push({ path, content: content.replace(/\s+$/, "") + "\n" });
  }

  const summary = raw.match(/SUMMARY:\s*(.+)/);
  return { files, summary: summary ? summary[1].trim() : "Step complete." };
}

/** Cheap sanity checks on generated markup, reported to the console. */
function checkFile(f: ProjectFile): string[] {
  const notes: string[] = [];
  if (f.path.endsWith(".html")) {
    if (!/<!DOCTYPE html>/i.test(f.content)) notes.push("missing <!DOCTYPE html>");
    if (!/<html[\s>]/i.test(f.content)) notes.push("missing <html>");
    if (!/<h1[\s>]/i.test(f.content)) notes.push("no <h1>");
    const ext = f.content.match(/(?:src|href)=["']https?:\/\/[^"']+/gi);
    if (ext) notes.push(`${ext.length} external request(s) — offline preview will break`);
  }
  if (f.path.endsWith(".css") && !/:root/.test(f.content)) {
    notes.push("no :root custom properties");
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

  try {
    const body = await req.json();
    step = body?.step ?? {};
    files = Array.isArray(body?.files) ? body.files : [];
    idea = String(body?.idea ?? "").trim();
    styleNote = String(body?.style ?? "").trim();
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    index = Number(body?.index ?? 0);
    total = Number(body?.total ?? 0);
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
