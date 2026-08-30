"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { localTimeZone } from "@/lib/context";
import { strip, type Attachment } from "@/lib/attachments";
import { useSaved } from "@/lib/use-saved";

export interface DraftTurn {
  id: number;
  role: "user" | "model";
  text: string;
}

/**
 * A document, deck or spreadsheet being worked on over several turns.
 *
 * These pages produce one artefact rather than a transcript: what you look at
 * is the current document, not the conversation that arrived at it. But the
 * conversation is what makes "make it shorter" or "add a slide about pricing"
 * mean anything, so it is kept even though only the newest answer is shown.
 *
 * The important part is `current`. Slides and spreadsheets are editable, and a
 * follow-up sent with the model's original text would quietly throw away every
 * edit made since — you would ask for one change and lose ten. Callers pass
 * the live artefact and it is substituted for the last model turn, so the
 * model revises what is actually on screen.
 */
export function useDraft({
  tool,
  restored,
}: {
  tool: string;
  restored?: {
    id: string;
    messages: { role: "user" | "model"; text: string }[];
  } | null;
}) {
  const router = useRouter();
  const { save, reset: resetSaved } = useSaved(tool, restored?.id ?? null);

  const [turns, setTurns] = useState<DraftTurn[]>(() =>
    (restored?.messages ?? []).map((m, i) => ({ id: i, role: m.role, text: m.text })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(restored?.messages.length ?? 0);

  /** The newest answer — the document as the model last wrote it. */
  const latest = [...turns].reverse().find((t) => t.role === "model")?.text ?? "";
  /** The request that started this piece of work. */
  const prompt = turns.find((t) => t.role === "user")?.text ?? "";

  const ask = useCallback(
    async (
      value: string,
      opts: { attachments?: Attachment[]; current?: string } = {},
    ) => {
      const { attachments, current } = opts;
      if (!value.trim() && !attachments?.length) return;

      setBusy(true);
      setError(null);

      const replyId = nextId.current++;

      // Built from the turns as they stand, with the live artefact swapped in
      // for the model's last word on it. The id is resolved once rather than
      // per turn — it does not change while the map runs.
      const replaceId = current === undefined ? undefined : lastModelId(turns);
      const history = turns.map((t) =>
        t.id === replaceId ? { ...t, text: current as string } : t,
      );
      const asked: DraftTurn = {
        id: nextId.current++,
        role: "user",
        text: value.trim() || `${attachments?.length ?? 0} attached file(s)`,
      };

      setTurns([...history, asked, { id: replyId, role: "model", text: "" }]);

      try {
        const res = await fetch("/api/tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool,
            timeZone: localTimeZone(),
            messages: [...history, asked].map(({ role, text }) => ({ role, text })),
            attachments: strip(attachments),
          }),
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Failed (${res.status}).`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          const piece = decoder.decode(chunk, { stream: true });
          setTurns((t) =>
            t.map((x) => (x.id === replyId ? { ...x, text: x.text + piece } : x)),
          );
        }

        // Read the finished thread out of state rather than closing over a
        // stale copy — the answer only exists once the stream has drained.
        setTurns((t) => {
          void save(
            t.map(({ role, text }) => ({ role, text })),
            t.find((x) => x.role === "user")?.text,
          );
          return t;
        });
        router.refresh();
      } catch (e) {
        // Drop the empty answer but keep the question: retrying should not
        // mean typing it again. The previous document stays on screen.
        setTurns((t) => t.filter((x) => x.id !== replyId));
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setBusy(false);
      }
    },
    [router, save, tool, turns],
  );

  /** Empty the page and forget which saved thread it belonged to. */
  const startOver = useCallback(() => {
    setTurns([]);
    setError(null);
    resetSaved();
  }, [resetSaved]);

  return { turns, busy, error, setError, latest, prompt, ask, startOver };
}

/** Which turn holds the model's current version of the artefact. */
function lastModelId(turns: DraftTurn[]): number | undefined {
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === "model") return turns[i].id;
  }
  return undefined;
}
