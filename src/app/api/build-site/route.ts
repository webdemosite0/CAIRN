import type { NextRequest } from "next/server";
import { generateText } from "@/lib/gemini";
import { currentUser } from "@/lib/auth";
import { db, uid } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM = `You are CAIRN's website engineer. You output ONE complete,
self-contained HTML document and nothing else.

Hard rules:
- Start at <!DOCTYPE html> and end at </html>. No prose, no markdown fences.
- Everything inline: one <style> block, one <script> block if needed.
- No external requests of any kind — no CDN scripts, no web fonts, no remote
  images. Use system font stacks, CSS gradients, inline SVG, and emoji.
- Responsive down to 360px. Use semantic HTML and real, specific copy — never
  lorem ipsum and never placeholder brackets.
- Make it genuinely well designed: a considered palette, real spacing rhythm,
  hover states, and at least one tasteful scroll or hover animation.
- Include the sections the request implies (nav, hero, content, footer).`;

function extractHtml(raw: string) {
  const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.search(/<!DOCTYPE html|<html/i);
  return start > -1 ? body.slice(start).trim() : body.trim();
}

export async function POST(req: NextRequest) {
  let prompt = "";
  let name = "";
  try {
    const body = await req.json();
    prompt = String(body?.prompt ?? "").trim();
    name = String(body?.name ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (prompt.length < 4) {
    return Response.json(
      { error: "Describe the site you want in a little more detail." },
      { status: 400 },
    );
  }

  try {
    const raw = await generateText({
      turns: [{ role: "user", text: `Build this website:\n\n${prompt}` }],
      system: SYSTEM,
      temperature: 0.85,
      maxOutputTokens: 16384,
    });

    const html = extractHtml(raw);
    if (!/<html[\s>]/i.test(html)) {
      return Response.json(
        { error: "The model did not return a usable HTML document. Try again." },
        { status: 502 },
      );
    }

    // Persist for signed-in users so the site survives a reload.
    let id: string | null = null;
    const user = await currentUser();
    if (user) {
      id = uid("site");
      db()
        .prepare(
          `INSERT INTO sites (id, user_id, name, prompt, html, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(id, user.id, name || prompt.slice(0, 48), prompt, html, Date.now());
    }

    return Response.json({ id, html, saved: Boolean(id) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("build-site", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
