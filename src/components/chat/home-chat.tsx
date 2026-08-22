"use client";

import { useState } from "react";

import { FailureNote } from "@/components/ui/failure-note";
import { Composer } from "@/components/chat/composer";
import { Message } from "@/components/chat/message";
import { Greeting } from "@/components/chat/greeting";
import { StarterCards } from "@/components/home/starter-cards";
import { DEFAULT_MODE, type ModeId } from "@/lib/modes";
import { useChatThread } from "@/lib/use-chat-thread";
import { ContinuePanel } from "@/components/home/recent-panels";
import { Aurora } from "@/components/shell/aurora";
import type { Recent } from "@/lib/recents";

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
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<ModeId>(DEFAULT_MODE);

  // Transcript, streaming and saving live in the hook, shared with the
  // mobile chat screen. Only the layout below is desktop-specific.
  const { turns, busy, error, send, retry, regenerate, clear, bottom } = useChatThread({
    restored,
    mode,
  });

  /* ------------------- landing ------------------- */

  if (turns.length === 0) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <Aurora />

        {/* No upsell banner here: /plans has no payment processor wired up, so
            "Unlock unlimited builds" would promise something it cannot do. */}

        {/* Centred, and vertically weighted around the composer.

            Left-aligned, the hero read as the top of a document with a form
            under it — the eye started at the corner and had to find the box.
            Centring puts the one thing worth doing at the optical middle of an
            empty screen, which is what every tool of this kind does and why
            they all feel like they are waiting for you. */}
        <div className="relative flex flex-1 flex-col items-center px-5 pb-14 pt-[8vh] lg:pt-[11vh]">
          <div className="w-full max-w-[820px] text-center">
            <div className="nx-rise">
              <Greeting name={name} />
              <h1 className="mt-2.5 text-[clamp(2.25rem,1.3rem+2.6vw,3.5rem)] font-semibold leading-[1.03] tracking-[-0.02em] text-ink">
                What will you build today?
              </h1>
              <p className="mx-auto mt-3.5 max-w-[46ch] text-[16.5px] leading-relaxed text-ink-3">
                Describe an idea, automate a task, or create something new.
              </p>
            </div>

            <div
              className="nx-rise mt-8 text-left"
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

            {/* Starters fill the composer rather than navigating away, so the
                next thing you do is still typing. */}
            <StarterCards className="mt-7" onPick={setDraft} />

            {error ? <ErrorNote message={error} onRetry={retry} /> : null}
          </div>

          {/* Recent work sits below the fold-ish and wider than the hero: it is
              for the second visit onward, and should not compete with the
              composer on the first. */}
          {activity.length ? (
            <div
              className="nx-rise mt-16 w-full max-w-[1140px] text-left"
              style={{ animationDelay: "220ms", animationFillMode: "backwards" }}
            >
              <ContinuePanel items={activity} />
            </div>
          ) : null}
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
            onClick={clear}
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
                  ? regenerate
                  : undefined
              }
            />
          ))}
          {error ? <ErrorNote message={error} onRetry={retry} /> : null}
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

/**
 * Kept as a named export because several screens render it; the body now
 * delegates to the shared component so every surface classifies a failure
 * the same way instead of each one printing the raw message.
 */
export function ErrorNote({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return <FailureNote error={message} onRetry={onRetry} className="mt-5" />;
}