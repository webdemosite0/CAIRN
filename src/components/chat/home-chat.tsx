"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { Composer } from "@/components/chat/composer";
import { Message } from "@/components/chat/message";
import { Wordmark } from "@/components/brand/logo";
import { Aurora } from "@/components/shell/aurora";
import { Shortcuts } from "@/components/chat/shortcuts";
import type { Attachment } from "@/lib/attachments";
import { Recents } from "@/components/ui/recents";
import type { Recent } from "@/lib/recents";
import { useRouter } from "next/navigation";
import { useSaved } from "@/lib/use-saved";

interface Turn {
  id: number;
  role: "user" | "model";
  text: string;
  files?: Attachment[];
}

export function HomeChat({
  recents = [],
  restored = null,
}: {
  recents?: Recent[];
  /** A saved thread, when the URL carries ?c=<id>. */
  restored?: { id: string; title: string; messages: { role: "user" | "model"; text: string }[] } | null;
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

  const run = useCallback(async (history: Turn[], files?: Attachment[]) => {
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
  }, [router, save]);

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

  /* ------------------- landing ------------------- */

  if (turns.length === 0) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <Aurora />

        {/* No upsell banner here: /plans has no payment processor wired up, so
            "Unlock unlimited builds" would promise something it cannot do. */}

        <div className="relative flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-12">
          <div className="w-full max-w-[760px]">
            <div className="nx-rise mb-2 text-center">
              <Wordmark className="mx-auto" size={58} />
              <p className="mt-3 text-[14.5px] text-ink-3">
                Describe what you want. Trove builds it.
              </p>
            </div>

            <div
              className="nx-rise mt-8"
              style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
            >
              <Composer onSend={send} autoFocus disabled={busy} />
            </div>

            <div className="mt-5">
              <Shortcuts />
            </div>

            <Recents
              className="mt-10"
              label="Recent chats"
              items={recents}
              onPick={(t) => send(t)}
            />

            {error ? <ErrorNote message={error} onRetry={() => run(turns)} /> : null}
          </div>
        </div>

      </div>
    );
  }

  /* ------------------- conversation ------------------- */

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 px-5 backdrop-blur-md lg:px-8">
        <div className="mx-auto flex h-14 max-w-[760px] items-center justify-between gap-3">
          <span className="truncate text-[14px] text-ink">
            {turns[0]?.text.slice(0, 64)}
          </span>
          <button
            onClick={() => {
              setTurns([]);
              setError(null);
              reset();
            }}
            className="shrink-0 rounded-[8px] px-2.5 py-1.5 text-[13px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            New Chat
          </button>
        </div>
      </header>

      <div className="flex-1 px-5 pb-8 pt-7 lg:px-8">
        <div className="mx-auto max-w-[760px] space-y-7">
          {turns.map((t, i) => (
            <Message
              key={t.id}
              role={t.role}
              text={t.text}
              files={t.files}
              pending={busy && i === turns.length - 1 && t.role === "model"}
              onRegenerate={
                !busy && i === turns.length - 1 && t.role === "model"
                  ? () => run(turns.slice(0, -1))
                  : undefined
              }
            />
          ))}
          {error ? <ErrorNote message={error} onRetry={() => run(turns)} /> : null}
          <div ref={bottom} />
        </div>
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-canvas via-canvas to-transparent px-5 pb-5 pt-3 lg:px-8">
        <div className="mx-auto max-w-[760px]">
          <Composer onSend={send} placeholder="Reply…" disabled={busy} />
        </div>
      </div>
    </div>
  );
}

export function ErrorNote({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="nx-in mt-5 flex items-start gap-2.5 rounded-[12px] border border-critical/30 bg-critical/10 px-4 py-3">
      <FiAlertCircle size={15} className="mt-0.5 shrink-0 text-critical" />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-relaxed text-ink-2">{message}</p>
        {onRetry ? (
          <button
            onClick={onRetry}
            className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] text-critical hover:underline"
          >
            <FiRefreshCw size={11} /> Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}
