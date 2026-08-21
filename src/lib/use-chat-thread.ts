"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSaved } from "@/lib/use-saved";
import type { Attachment } from "@/lib/attachments";
import type { ModeId } from "@/lib/modes";
import { localTimeZone } from "@/lib/context";

export interface Turn {
  id: number;
  role: "user" | "model";
  text: string;
  files?: Attachment[];
}


/**
 * A conversation: the transcript, the request, the stream, and the save.
 *
 * Extracted so the desktop and mobile chat screens can be different designs
 * without being different implementations. They render nothing in common — one
 * is a centred column with side panels, the other is a full-bleed list over a
 * docked composer — but the part that can actually be wrong is identical, and
 * two copies of a streaming loop is two places for a bug to survive a fix.
 *
 * The presentation owns the mode picker and passes the current mode in, since
 * where that control lives is exactly the kind of thing the two designs
 * disagree about.
 */
export function useChatThread({
  restored,
  mode,
}: {
  restored?: { id: string; messages: { role: "user" | "model"; text: string }[] } | null;
  mode: ModeId;
}) {
  const router = useRouter();
  const { save, reset } = useSaved("chat", restored?.id ?? null);

  const [turns, setTurns] = useState<Turn[]>(() =>
    (restored?.messages ?? []).map((m, i) => ({ id: i, role: m.role, text: m.text })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottom = useRef<HTMLDivElement>(null);
  const nextId = useRef(restored?.messages.length ?? 0);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns]);

  const run = useCallback(
    async (history: Turn[], files?: Attachment[]) => {
      setBusy(true);
      setError(null);
      const replyId = nextId.current++;
      setTurns((t) => [...t, { id: replyId, role: "model", text: "" }]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map(({ role, text }) => ({ role, text })),
            mode,
            // The server runs in UTC wherever it is deployed, so without this
            // "what is today's date" is answered for the datacentre rather
            // than for the person asking.
            timeZone: localTimeZone(),
            attachments: files?.map(({ name, mimeType, size, data, kind }) => ({
              name, mimeType, size, data, kind,
            })),
          }),
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Request failed (${res.status}).`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setTurns((t) =>
            t.map((x) => (x.id === replyId ? { ...x, text: x.text + chunk } : x)),
          );
        }
        // Read the finished thread out of state rather than closing over a
        // stale copy — the reply text only exists after the stream drains.
        setTurns((t) => {
          void save(
            t.map(({ role, text }) => ({ role, text })),
            t[0]?.text,
          );
          return t;
        });
        router.refresh();
      } catch (e) {
        setTurns((t) => t.filter((x) => x.id !== replyId));
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setBusy(false);
      }
    },
    [router, save, mode],
  );

  const send = useCallback(
    (text: string, files?: Attachment[]) => {
      const history = [
        ...turns,
        { id: nextId.current++, role: "user" as const, text, files },
      ];
      setTurns(history);
      void run(history, files);
    },
    [turns, run],
  );

  /** Re-send the thread as-is, after a failure. */
  const retry = useCallback(() => void run(turns), [turns, run]);

  /** Drop the last reply and ask again. */
  const regenerate = useCallback(() => void run(turns.slice(0, -1)), [turns, run]);

  /** Start over: empty transcript, no error, and a fresh saved-thread id. */
  const clear = useCallback(() => {
    setTurns([]);
    setError(null);
    reset();
  }, [reset]);

  return { turns, busy, error, setError, send, retry, regenerate, clear, bottom, reset };
}
