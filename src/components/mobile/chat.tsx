"use client";

import * as React from "react";
import Link from "next/link";
import { FiAlertCircle, FiPlus, FiRefreshCw } from "react-icons/fi";
import { TbWorld, TbFileText, TbTable, TbRobot } from "react-icons/tb";
import { Message } from "@/components/chat/message";
import { MobileComposer } from "@/components/mobile/composer";
import { DEFAULT_MODE, type ModeId } from "@/lib/modes";
import { useChatThread } from "@/lib/use-chat-thread";
import type { Recent } from "@/lib/recents";

/**
 * Chat, for a phone.
 *
 * Two states, and they are laid out differently rather than one hiding parts
 * of the other. Empty is a short pitch, a composer, and a few things worth
 * tapping. In a thread it is the transcript and nothing else, with the
 * composer docked at the bottom where the thumb already is.
 *
 * The desktop screen puts the composer in the middle of the page surrounded by
 * panels of recent work. That is a good use of a wide screen and a bad use of
 * a tall one, which is why this is a separate component and not a breakpoint.
 *
 * Streaming, saving and error handling come from useChatThread, shared with
 * the desktop screen — the parts that can be wrong are not duplicated.
 */

const STARTERS = [
  { icon: TbWorld, label: "Build a landing page", prompt: "Build me a landing page for " },
  { icon: TbFileText, label: "Write a document", prompt: "Write a document about " },
  { icon: TbTable, label: "Make a spreadsheet", prompt: "Make a spreadsheet that tracks " },
  { icon: TbRobot, label: "Create an agent", prompt: "Create an agent that " },
];

export function MobileChat({
  restored = null,
  name = "there",
  activity = [],
}: {
  restored?: {
    id: string;
    title: string;
    messages: { role: "user" | "model"; text: string }[];
  } | null;
  name?: string;
  activity?: Recent[];
}) {
  const [mode, setMode] = React.useState<ModeId>(DEFAULT_MODE);
  const [draft, setDraft] = React.useState("");
  const { turns, busy, error, send, retry, clear, bottom } = useChatThread({
    restored,
    mode,
  });

  /* ---------------------- empty ---------------------- */

  if (turns.length === 0) {
    return (
      <div className="flex min-h-full flex-col px-4 pb-4 pt-6">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-ink">
          Hi {name}.
          <br />
          What are we making?
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">
          Describe it and Trove builds it — sites, documents, spreadsheets and
          agents you can download.
        </p>

        <div className="mt-5">
          <MobileComposer
            key={draft}
            initialValue={draft}
            onSend={send}
            disabled={busy}
            mode={mode}
            onModeChange={setMode}
          />
        </div>

        {error ? <Problem message={error} onRetry={retry} /> : null}

        <ul className="mt-5 space-y-2">
          {STARTERS.map((s) => (
            <li key={s.label}>
              <button
                type="button"
                onClick={() => setDraft(s.prompt)}
                className="flex w-full items-center gap-3 rounded-[14px] border border-line bg-raised px-3.5 py-3 text-left active:bg-hover"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunk text-ink">
                  <s.icon size={17} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14.5px] text-ink">
                  {s.label}
                </span>
                <FiPlus size={15} className="shrink-0 text-ink-4" />
              </button>
            </li>
          ))}
        </ul>

        {activity.length ? (
          <>
            <h2 className="mb-2 mt-7 text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-4">
              Recent
            </h2>
            <ul className="space-y-1">
              {activity.slice(0, 6).map((r) => (
                <li key={`${r.kind}-${r.href}-${r.title}`}>
                  <Link
                    href={r.href}
                    className="block truncate rounded-[12px] px-3 py-2.5 text-[14.5px] text-ink-2 active:bg-hover"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    );
  }

  /* ---------------------- thread ---------------------- */

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <span className="min-w-0 truncate text-[13px] text-ink-4">
          {turns[0]?.text.slice(0, 48)}
        </span>
        <button
          type="button"
          onClick={clear}
          className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-2 active:bg-hover"
        >
          New
        </button>
      </div>

      <div className="flex-1 space-y-5 px-4 pb-3">
        {turns.map((t, i) => (
          <Message
            key={t.id}
            role={t.role}
            text={t.text}
            files={t.files}
            pending={busy && i === turns.length - 1 && t.role === "model"}
          />
        ))}
        {error ? <Problem message={error} onRetry={retry} /> : null}
        <div ref={bottom} />
      </div>

      {/* Docked, not sticky-inside-the-page: the tab bar is fixed, so this sits
          just above it and stays put while the transcript scrolls under. */}
      <div className="sticky bottom-0 -mx-0 bg-gradient-to-t from-canvas via-canvas to-transparent px-3 pb-2 pt-3">
        <MobileComposer
          onSend={send}
          disabled={busy}
          placeholder="Reply…"
          mode={mode}
          onModeChange={setMode}
        />
      </div>
    </div>
  );
}

function Problem({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="nx-in mt-4 flex items-start gap-2.5 rounded-[14px] border border-critical/30 bg-critical/10 px-3.5 py-3">
      <FiAlertCircle size={15} className="mt-0.5 shrink-0 text-critical" />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-relaxed text-ink-2">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] text-critical"
        >
          <FiRefreshCw size={11} /> Try again
        </button>
      </div>
    </div>
  );
}
