"use client";

import { Ico } from "@/components/ui/ico";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonText } from "@/components/ui/skeleton";
import { SystemEditor } from "@/components/design/system-editor";
import { localTimeZone } from "@/lib/context";
import { FailureNote } from "@/components/ui/failure-note";
import { useRef, useState } from "react";
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
  /** A saved answer, when the URL carries ?c=<id>. */
  restored?: { id: string; title: string; output: string } | null;
}) {
  const router = useRouter();
  const { save, reset } = useSaved(tool, restored?.id ?? null);
  const Icon = ICONS[tool];
  const [prompt, setPrompt] = useState(restored?.title ?? "");
  const [output, setOutput] = useState(restored?.output ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  async function run(text: string, attachments?: Attachment[]) {
    setPrompt(text || `${attachments?.length ?? 0} attached file(s)`);
    setBusy(true);
    setError(null);
    setOutput("");

    try {
      const res = await fetch("/api/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool,
          prompt: text,
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
        setOutput((o) => o + decoder.decode(value, { stream: true }));
        bottom.current?.scrollIntoView({ block: "end" });
      }
      // Persist the finished answer so reopening it from Recents shows this
      // exact text instead of asking the model again.
      setOutput((full) => {
        void save(
          [
            { role: "user", text },
            { role: "model", text: full },
          ],
          text,
        );
        return full;
      });
      // The strip is server-rendered, so pull the new entry down.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------------- idle ---------------- */

  if (!prompt) {
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
          <Composer onSend={run} placeholder={placeholder} autoFocus />
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {examples.map((e, i) => (
            <button
              key={e}
              onClick={() => run(e)}
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
          onPick={run}
        />
      </div>
    );
  }

  /* ---------------- result ---------------- */

  return (
    <div className="mx-auto flex min-h-screen max-w-[820px] flex-col px-5 py-8 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex items-center gap-2 text-[12px] uppercase tracking-[0.08em] text-ink-4">
            <Icon size={13} style={{ color: accent }} />
            {title}
          </p>
          <h1 className="text-[18px] font-medium text-ink">{prompt}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(output);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            disabled={!output}
            className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
          >
            {copied ? <Ico icon={FiCheck} motion="check" size={13} className="text-positive" /> : <Ico icon={FiCopy} motion="nudge" size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={() => {
              setPrompt("");
              setOutput("");
              setError(null);
              reset();
            }}
            className="chip group !px-3 !py-1.5 !text-[12.5px]"
          >
            <Ico icon={FiRotateCcw} motion="spin" size={13} /> New
          </button>
        </div>
      </header>

      {/* The wait is shaped like the answer.
          A bordered box with a spinner in it told you something was happening
          and then reflowed the page when the text arrived. This occupies
          roughly the room the answer will take, so nothing jumps. */}
      {busy && !output ? (
        <div className="rounded-[var(--r-panel)] border border-line bg-rail p-5">
          <div className="mb-4 flex items-center gap-3.5">
            <Bot size={38} accent={accent} state="working" />
            <span className="nx-dots text-[14px] text-ink-2">Working</span>
          </div>
          <SkeletonText lines={5} />
        </div>
      ) : null}

      {/* The design spec becomes editable tokens; every other tool's output
          is prose, which is the right shape for a document or a piece of
          research. Decided from `tool` rather than passed in as a render
          prop — the page is a server component, and a function cannot cross
          that boundary. The written version stays below either way: the
          extraction is a convenience, and a spec holds more than colours. */}
      {tool === "design" && output && !busy ? (
        <div className="mb-4 rounded-[var(--r-panel)] border border-line bg-rail p-5">
          <SystemEditor markdown={output} />
        </div>
      ) : null}

      {output ? (
        <div className="rounded-[var(--r-panel)] border border-line bg-rail p-5">
          <Message role="model" text={output} pending={busy} />
        </div>
      ) : null}

      {error ? (
        <FailureNote error={error} onRetry={() => run(prompt)} className="mt-4" />
      ) : null}

      <div ref={bottom} />

      {/* Asking again should not mean losing the page you are on. */}
      <div className="sticky bottom-0 mt-auto bg-canvas/85 pb-6 pt-6 backdrop-blur-md">
        <Composer
          onSend={run}
          disabled={busy}
          placeholder={`Ask ${title.toLowerCase()} for something else…`}
        />
      </div>
    </div>
  );
}
