import type { NextRequest } from "next/server";
import { saveConversation, type StoredMessage } from "@/lib/conversations";
import type { RecentKind } from "@/lib/recents";

export const runtime = "nodejs";

const KINDS = new Set([
  "chat","docs","sheets","slides","design","research","code","agent","team","site",
]);

/**
 * Saves a thread. Called by the client once a reply has finished streaming —
 * the client is the only place that holds the complete text, since the model
 * response is streamed straight through to it.
 */
export async function POST(req: NextRequest) {
  let id: string | null = null;
  let kind = "";
  let title = "";
  let messages: StoredMessage[] = [];
  let path: string | null = null;

  try {
    const body = await req.json();
    id = body?.id ? String(body.id) : null;
    kind = String(body?.kind ?? "");
    title = String(body?.title ?? "");
    messages = Array.isArray(body?.messages) ? body.messages : [];
    path = body?.path ? String(body.path) : null;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!KINDS.has(kind)) {
    return Response.json({ error: "Unknown kind." }, { status: 400 });
  }

  const clean = messages
    .filter((m) => m && typeof m.text === "string" && m.text.trim())
    .map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      text: String(m.text),
    }));

  if (!clean.length) {
    return Response.json({ error: "Nothing to save." }, { status: 400 });
  }

  try {
    const saved = await saveConversation({
      id,
      kind: kind as RecentKind,
      title,
      messages: clean,
      path,
    });
    if (!saved) return Response.json({ error: "No identity." }, { status: 401 });
    return Response.json({ id: saved });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("conversations", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
