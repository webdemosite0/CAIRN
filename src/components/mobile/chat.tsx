"use client";

import * as React from "react";
import Link from "next/link";
import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import {
  TbWorld,
  TbRobot,
  TbFileText,
  TbTable,
  TbPresentation,
  TbPalette,
  TbCode,
  TbSearch,
} from "react-icons/tb";
import type { IconType } from "react-icons";
import { Message } from "@/components/chat/message";
import { MobileComposer } from "@/components/mobile/composer";
import { Wordmark } from "@/components/brand/logo";
import { DEFAULT_MODE, type ModeId } from "@/lib/modes";
import { useChatThread } from "@/lib/use-chat-thread";
import type { Recent } from "@/lib/recents";

/**
 * Chat, for a phone.
 *
 * Two states, laid out differently rather than one hiding parts of the other.
 * Empty is the wordmark, the composer, and a row of tools you can reach with a
 * thumb. In a thread it is the transcript and nothing else, with the composer
 * docked at the bottom.
 *
 * The desktop screen puts the composer mid-page surrounded by panels of recent
 * work — a good use of a wide screen and a poor use of a tall one, which is
 * why this is a separate component and not a breakpoint.
 *
 * Streaming, saving and error handling come from useChatThread, shared with
 * the desktop screen, so the parts that can be wrong are not duplicated.
 */

/** The tool row under the composer. Horizontal, because a phone has one
    column and this is a shortcut list, not a menu that needs reading. */
const TOOLS: { href: string; label: string; icon: IconType }[] = [
  { href: "/websites", label: "Websites", icon: TbWorld },
  { href: "/agents", label: "Agents", icon: TbRobot },
  { href: "/documents", label: "Docs", icon: TbFileText },
  { href: "/spreadsheets", label: "Sheets", icon: TbTable },
  { href: "/slides", label: "Slides", icon: TbPresentation },
  { href: "/code", label: "Code", icon: TbCode },
  { href: "/design", label: "Design", icon: TbPalette },
  { href: "/research", label: "Deep Research", icon: TbSearch },
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
  const { turns, busy, error, send, retry, clear, bottom } = useChatThread({
    restored,
    mode,
  });

  /* ---------------------- empty ---------------------- */

  if (turns.length === 0) {
    return (
      <div className="flex min-h-full flex-col px-4 pb-6">
        {/* The mark, centred and large. It is the only thing above the
            composer, so it carries the whole "what is this" job. */}
        <div className="nx-rise flex flex-col items-center pb-7 pt-10">
          <Wordmark size={44} sweep={false} />
          <p className="mt-3 text-center text-[13.5px] text-ink-3">
            Hi {name} — describe it and Trove builds it.
          </p>
        </div>

        <div className="nx-rise-slow">
          <MobileComposer
            onSend={send}
            disabled={busy}
            mode={mode}
            onModeChange={setMode}
          />
        </div>

        {error ? <Problem message={error} onRetry={retry} /> : null}

        {/* Tool row — scrolls sideways, fading at the edge so it is obviously
            a strip rather than a clipped grid. */}
        <div className="nx-rise-slow -mx-4 mt-4">
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
            {TOOLS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="press flex h-[42px] shrink-0 items-center gap-2 rounded-full border border-line bg-raised px-4 text-[13.5px] text-ink-2 transition-colors active:bg-hover"
              >
                <t.icon size={16} className="shrink-0 text-ink" />
                {t.label}
              </Link>
            ))}
          </div>
        </div>

        {activity.length ? (
          <div className="mt-7">
            <h2 className="mb-1.5 px-1 text-[11.5px] font-medium uppercase tracking-[0.1em] text-ink-4">
              Recent
            </h2>
            <ul className="nx-stagger space-y-0.5">
              {activity.slice(0, 6).map((r) => (
                <li key={`${r.kind}-${r.href}-${r.title}`}>
                  <Link
                    href={r.href}
                    className="block truncate rounded-[10px] px-3 py-2.5 text-[14.5px] text-ink-2 transition-colors active:bg-hover"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
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
          className="press shrink-0 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors active:bg-hover"
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

      {/* Docked. The safe-area padding matters here: without it the send
          button sits under the home indicator on a gesture-nav phone. */}
      <div className="sticky bottom-0 bg-gradient-to-t from-canvas via-canvas to-transparent px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
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
