import type { NextRequest } from "next/server";
import { generateText } from "@/lib/gemini";
import { currentUser } from "@/lib/auth";
import { db, uid } from "@/lib/db";
import { toParts, type Attachment } from "@/lib/attachments";
import { requireCredits, spend, OutOfCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 180;

export interface ProjectFile {
  path: string;
  content: string;
}

const SYSTEM = `You are CAIRN's web engineer. You build and then iteratively edit
a small static website.

OUTPUT FORMAT — this is strict. Reply with only file blocks, nothing else:

<<<FILE: index.html>>>
...full file contents...
<<<END>>>
<<<FILE: styles.css>>>
...full file contents...
<<<END>>>

Rules:
- Always emit index.html. Add styles.css and script.js when useful.
- Emit the COMPLETE contents of every file you changed. Never use "..." or
  "unchanged" placeholders — partial files break the build.
- Only re-emit files you actually changed. Leave untouched files out entirely.
- index.html must link its siblings with plain relative paths:
  <link rel="stylesheet" href="styles.css"> and <script src="script.js"></script>
- Zero external requests: no CDNs, no web fonts, no remote images. Use system
  font stacks, CSS gradients, inline SVG, and emoji.
- Responsive to 360px. Semantic HTML. Real, specific copy — never lorem ipsum.
- Considered design: a deliberate palette, consistent spacing, hover states,
  and at least one tasteful animation.

After the file blocks, add one final line beginning with "SUMMARY:" describing
what you changed in a single sentence.`;

function parseFiles(raw: string): { files: ProjectFile[]; summary: string } {
  const files: ProjectFile[] = [];
  const re = /<<<FILE:\s*(.+?)\s*>>>\s*\n([\s\S]*?)<<<END>>>/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw))) {
    const path = m[1].trim().replace(/^\/+/, "");
    let content = m[2];
    // Models sometimes wrap the body in a markdown fence anyway.
    const fenced = content.match(/^\s*```[a-z]*\n([\s\S]*?)```\s*$/i);
    if (fenced) content = fenced[1];
    files.push({ path, content: content.replace(/\s+$/, "") + "\n" });
  }

  const summaryLine = raw.match(/SUMMARY:\s*(.+)/);
  return { files, summary: summaryLine ? summaryLine[1].trim() : "Updated the site." };
}

export async function POST(req: NextRequest) {
  let instruction = "";
  let files: ProjectFile[] = [];
  let projectId: string | null = null;
  let attachments: Attachment[] = [];

  try {
    const body = await req.json();
    instruction = String(body?.instruction ?? "").trim();
    files = Array.isArray(body?.files) ? body.files : [];
    projectId = body?.projectId ? String(body.projectId) : null;
    attachments = Array.isArray(body?.attachments) ? body.attachments : [];
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (instruction.length < 3 && attachments.length === 0) {
    return Response.json({ error: "Tell me what to build or change." }, { status: 400 });
  }

  const isEdit = files.length > 0;
  const context = isEdit
    ? `Here is the current project:\n\n${files
        .map((f) => `<<<FILE: ${f.path}>>>\n${f.content}<<<END>>>`)
        .join("\n")}\n\nApply this change: ${instruction}`
    : `Build this website: ${instruction}`;

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

  try {
    const raw = await generateText({
      // A site build is the most expensive call in the app — often 20-30k
      // tokens — and the ledger reflects that rather than flat-rating it.
      onUsage: (u) => account && spend(account.userId, "site", u.totalTokens),
      turns: [{ role: "user", text: context }],
      system: SYSTEM,
      temperature: 0.8,
      maxOutputTokens: 32768,
      // An attached screenshot or brand sheet is a design brief — the model
      // sees it inline and builds from it.
      extraParts: attachments.length ? toParts(attachments) : undefined,
    });

    const { files: changed, summary } = parseFiles(raw);

    if (changed.length === 0) {
      return Response.json(
        { error: "The model did not return any files. Try rephrasing." },
        { status: 502 },
      );
    }

    // Merge: changed files replace their previous version, others survive.
    const merged = [...files];
    for (const f of changed) {
      const i = merged.findIndex((x) => x.path === f.path);
      if (i > -1) merged[i] = f;
      else merged.push(f);
    }

    if (!merged.some((f) => f.path === "index.html")) {
      return Response.json(
        { error: "No index.html was produced. Try again." },
        { status: 502 },
      );
    }

    // Persist for signed-in users.
    let id = projectId;
    const user = await currentUser();
    if (user) {
      const payload = JSON.stringify(merged);
      if (id) {
        db()
          .prepare(`UPDATE sites SET html = ?, prompt = ? WHERE id = ? AND user_id = ?`)
          .run(payload, instruction, id, user.id);
      } else {
        id = uid("site");
        db()
          .prepare(
            `INSERT INTO sites (id, user_id, name, prompt, html, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(id, user.id, instruction.slice(0, 60), instruction, payload, Date.now());
      }
    }

    return Response.json({
      projectId: id,
      files: merged,
      changed: changed.map((f) => f.path),
      summary,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("builder", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
