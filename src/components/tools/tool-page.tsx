"use client";

import { Ico } from "@/components/ui/ico";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonText } from "@/components/ui/skeleton";
import { SystemEditor } from "@/components/design/system-editor";
import { localTimeZone } from "@/lib/context";
import { FailureNote } from "@/components/ui/failure-note";
import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
  FiCopy,
  FiCheck,
  FiRotateCcw,
  FiFileText,
  FiGrid,
  FiCode,
} from "react-icons/fi";
import { TbMicroscope, TbPresentation } from "react-icons/tb";
import { HiOutlineCube } from "react-icons/hi2";
import { Composer } from "@/components/chat/composer";
import { Message } from "@/components/chat/message";
import { Bot } from "@/components/agents/bot";
import { strip, type Attachment } from "@/lib/attachments";
import { Recents } from "@/components/ui/recents";
import type { Recent } from "@/lib/recents";
import { useRouter } from "next/navigation";
import { useSaved } from "@/lib/use-saved";

/** Icons are resolved here — components cannot cross the server boundary. */
const ICONS = {
  docs: FiFileText,
  sheets: FiGrid,
  slides: TbPresentation,
  design: HiOutlineCube,
  research: TbMicroscope,
  code: FiCode,
} satisfies Record<string, IconType>;

export type ToolId = keyof typeof ICONS;

interface Turn {
  id: number;
  role: "user" | "model";
  text: string;
}

export function ToolPage({
  tool,
  title,
  tagline,
  placeholder,
  examples,
  accent = "#3b82f6",
  recents = [],
  recentsLabel = "Recents",
  restored = null,
}: {
  tool: ToolId;
  title: string;
  tagline: string;
  placeholder: string;
  examples: string[];
  accent?: string;
  recents?: Recent[];
  recentsLabel?: string;
  /** A saved thread, when the URL carries ?c=<id>. */
  restored?: {
    id: string;
    title: string;
    messages: { role: "user" | "model"; text: string }[];
  } | null;
}) {
  const router = useRouter();
  const { save, reset } = useSaved(tool, restored?.id ?? null);
  const Icon = ICONS[tool];

  /**
   * The whole conversation, not the last answer.
   *
   * This page used to hold a single `output` string, and every follow-up threw
   * it away and started again — so asking research to "go deeper on the second
   * point" produced an answer about nothing, and reopening a saved piece of
   * work showed the reply with the question that produced it missing. Both are
   * the same bug: a tool that answers questions was storing an answer instead
   * of a conversation.
   */
  const [turns, setTurns] = useState<Turn[]>(() =>
    (restored?.messages ?? []).map((m, i) => ({ id: i, role: m.role, text: m.text })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const nextId = useRef(restored?.messages.length ?? 0);

  useEffect(() => {
    if (turns.length) bottom.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  /** The newest model reply — what Copy copies and what the design tool reads. */
  const latest = [...turns].reverse().find((t) => t.role === "model")?.text ?? "";
  /** The question this page is showing the answer to. */
  const heading = turns.find((t) => t.role === "user")?.text ?? title;

  async function ask(history: Turn[], attachments?: Attachment[]) {
    setBusy(true);
    setError(null);
    const replyId = nextId.current++;
    setTurns([...history, { id: replyId, role: "model", text: "" }]);

    try {
      const res = await fetch("/api/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool,
          // The thread, so a follow-up can refer to what came before.
          messages: history.map(({ role, text }) => ({ role, text })),
          attachments: strip(attachments),
          timeZone: localTimeZone(),
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Failed (${res.status}).`);
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
      // Read the finished thread out of state rather than closing over a stale
      // copy — the reply only exists once the stream has drained.
      setTurns((t) => {
        void save(
          t.map(({ role, text }) => ({ role, text })),
          t.find((x) => x.role === "user")?.text,
        );
        return t;
      });
      // The recents strip is server-rendered, so pull the new entry down.
      router.refresh();
    } catch (e) {
      // Drop the empty reply, keep the question: retrying should not mean
      // typing it again.
      setTurns((t) => t.filter((x) => x.id !== replyId));
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function send(text: string, attachments?: Attachment[]) {
    const asked = text.trim() || `${attachments?.length ?? 0} attached file(s)`;
    void ask(
      [...turns, { id: nextId.current++, role: "user", text: asked }],
      attachments,
    );
  }

  /** Re-send the thread as it stands, after a failure. */
  function retry() {
    void ask(turns);
  }

  function startOver() {
    setTurns([]);
    setError(null);
    reset();
  }

  /* ---------------- idle ---------------- */

  if (turns.length === 0) {
    return (
      // Left-aligned and topped out, like every other page in the workspace.
      // Centring this made each tool look like its own product rather than a
      // room in one — and it only worked while there was no rail beside it.
      <div className="nx-in mx-auto w-full max-w-[860px] px-5 py-8 lg:px-8">
        <PageHeader
          title={title}
          subtitle={tagline}
          action={
            <span
              aria-hidden
              className="hidden h-10 w-10 place-items-center rounded-[var(--r-control)] sm:grid"
              style={{ background: `${accent}1f`, color: accent }}
            >
              <Icon size={20} />
            </span>
          }
        />

        <div className="mt-6">
          <Composer onSend={send} placeholder={placeholder} autoFocus />
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {examples.map((e, i) => (
            <button
              key={e}
              onClick={() => send(e)}
              className="chip group nx-in"
              style={{ animationDelay: `${80 + i * 50}ms`, animationFillMode: "backwards" }}
            >
              {e}
            </button>
          ))}
        </div>

        <Recents
          className="mt-9"
          label={recentsLabel}
          items={recents}
          onPick={send}
          manage
        />

        {error ? (
          <FailureNote error={error} onRetry={retry} className="mt-5" />
        ) : null}
      </div>
    );
  }

  /* ---------------- conversation ---------------- */

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[860px] flex-col px-5 py-8 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex items-center gap-2 text-[12px] uppercase tracking-[0.08em] text-ink-4">
            <Icon size={13} style={{ color: accent }} />
            {title}
          </p>
          <h1 className="text-[18px] font-medium text-ink">{heading}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(latest);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            disabled={!latest}
            className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
            title="Copy the latest answer"
          >
            {copied ? (
              <Ico icon={FiCheck} motion="check" size={13} className="text-positive" />
            ) : (
              <Ico icon={FiCopy} motion="nudge" size={13} />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={startOver}
            className="chip group !px-3 !py-1.5 !text-[12.5px]"
          >
            <Ico icon={FiRotateCcw} motion="spin" size={13} /> New
          </button>
        </div>
      </header>

      {/* The design spec becomes editable tokens; every other tool's output is
          prose, which is the right shape for a document or a piece of
          research. Decided from `tool` rather than passed in as a render prop
          — the page is a server component, and a function cannot cross that
          boundary. The written version stays below either way: the extraction
          is a convenience, and a spec holds more than colours. */}
      {tool === "design" && latest && !busy ? (
        <div className="mb-4 rounded-[var(--r-panel)] border border-line bg-rail p-5">
          <SystemEditor markdown={latest} />
        </div>
      ) : null}

      <div className="space-y-5">
        {turns.map((t, i) => {
          const isLast = i === turns.length - 1;
          // The wait is shaped like the answer. A spinner said something was
          // happening and then reflowed the page when the text arrived; this
          // occupies roughly the room the answer will take, so nothing jumps.
          if (t.role === "model" && !t.text && busy) {
            return (
              <div
                key={t.id}
                className="rounded-[var(--r-panel)] border border-line bg-rail p-5"
              >
                <div className="mb-4 flex items-center gap-3.5">
                  <Bot size={38} accent={accent} state="working" />
                  <span className="nx-dots text-[14px] text-ink-2">Working</span>
                </div>
                <SkeletonText lines={5} />
              </div>
            );
          }

          if (t.role === "user") {
            return (
              <div key={t.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-[var(--r-card)] bg-raised px-4 py-2.5 text-[14px] leading-relaxed text-ink">
                  {t.text}
                </p>
              </div>
            );
          }

          return (
            <div
              key={t.id}
              className="rounded-[var(--r-panel)] border border-line bg-rail p-5"
            >
              {/* Only the turn being streamed carries the caret. Passing
                  `busy` to every model turn would put one on each of them. */}
              <Message role="model" text={t.text} pending={busy && isLast} />
            </div>
          );
        })}
      </div>

      {error ? (
        <FailureNote error={error} onRetry={retry} className="mt-4" />
      ) : null}

      <div ref={bottom} />

      {/* Asking again should not mean losing the page you are on — and now it
          builds on the thread rather than replacing it. */}
      <div className="sticky bottom-0 mt-auto bg-canvas/85 pb-6 pt-6 backdrop-blur-md">
        <Composer
          onSend={send}
          disabled={busy}
          placeholder={`Ask a follow-up, or change direction…`}
        />
      </div>
    </div>
  );
}
