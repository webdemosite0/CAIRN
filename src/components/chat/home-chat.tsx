"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { Composer } from "@/components/chat/composer";
import { Message } from "@/components/chat/message";
import { Greeting } from "@/components/chat/greeting";
import { QuickActions } from "@/components/home/quick-actions";
import { StarterCards } from "@/components/home/starter-cards";
import { DEFAULT_MODE, type ModeId } from "@/lib/modes";
import { ContinuePanel, ActivityPanel } from "@/components/home/recent-panels";
import { Aurora } from "@/components/shell/aurora";
import type { Attachment } from "@/lib/attachments";
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
  restored = null,
  name = "there",
  activity = [],
}: {
  /** A saved thread, when the URL carries ?c=<id>. */
  restored?: { id: string; title: string; messages: { role: "user" | "model"; text: string }[] } | null;
  /** First name, for the greeting. */
  name?: string;
  /** Everything recent, across kinds, for the two panels below. */
  activity?: Recent[];
}) {
  const router = useRouter();
  const { save, reset } = useSaved("chat", restored?.id ?? null);
  const [turns, setTurns] = useState<Turn[]>(() =>
    (restored?.messages ?? []).map((m, i) => ({ id: i, role: m.role, text: m.text })),
  );
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<ModeId>(DEFAULT_MODE);
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
          mode,
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
  }, [router, save, mode]);

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

        <div className="relative flex flex-1 flex-col items-center px-5 pb-16 pt-10 lg:pt-14">
          <div className="w-full max-w-[1140px]">
            {/* The wordmark used to sit here at 58px. The reader is already
                inside Trove, so a logo the size of a headline was telling them
                where they are instead of what to do next. */}
            <div className="nx-rise mb-2">
              <Greeting name={name} />
              <h1 className="mt-2 text-[clamp(2.125rem,1.4rem+1.9vw,3rem)] font-semibold leading-[1.05] tracking-tight text-ink">
                What will you build today?
              </h1>
              <p className="mt-3 max-w-[52ch] text-[16.5px] leading-relaxed text-ink-3">
                Describe an idea, automate a task, or create something new.
              </p>
            </div>

            {/* 36px, so the composer reads as the continuation of the hero
                rather than a separate block below it. Capped at 1000px: the
                column is wider than that on a large screen, and a composer
                spanning the full width stops reading as one object. */}
            <div
              className="nx-rise mt-9 max-w-[1000px]"
              style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
            >
              {/* Keyed by the draft so a starter card refills an existing
                  box, rather than an effect syncing a prop into state. */}
              <Composer
                key={draft}
                initialValue={draft}
                onSend={send}
                mode={mode}
                onModeChange={setMode}
                autoFocus
                disabled={busy}
              />
            </div>

            <QuickActions className="mt-6" />

            {/* Always shown. These are shortcuts, not filler — someone
                with a full workspace still wants a one-tap way to start the
                next thing. */}
            <StarterCards className="mt-10" onPick={setDraft} />

            <div className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
              <ContinuePanel items={activity} />
              <ActivityPanel items={activity} />
            </div>

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
            className="shrink-0 rounded-[6px] px-2.5 py-1.5 text-[13px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
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
    <div className="nx-in mt-5 flex items-start gap-2.5 rounded-[10px] border border-critical/30 bg-critical/10 px-4 py-3">
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
