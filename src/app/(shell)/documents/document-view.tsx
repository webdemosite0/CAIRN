"use client";

import { useState } from "react";
import {
  FiDownload,
  FiRotateCcw,
  FiAlertCircle,
  FiFileText,
  FiCopy,
  FiCheck,
} from "react-icons/fi";
import { Bot } from "@/components/agents/bot";
import { Message } from "@/components/chat/message";
import { Composer } from "@/components/chat/composer";
import { strip, type Attachment } from "@/lib/attachments";
import { Recents } from "@/components/ui/recents";
import type { Recent } from "@/lib/recents";
import { useRouter } from "next/navigation";
import { useSaved } from "@/lib/use-saved";
import { downloadDocx, downloadMarkdown } from "@/lib/export";
import { Ico } from "@/components/ui/ico";

const EXAMPLES = [
  "An onboarding guide for a new backend engineer",
  "A postmortem template for production incidents",
  "API documentation for a payments endpoint",
];

export function DocumentView({
  recents = [],
  recentsLabel = "Recents",
  restored = null,
}: {
  recents?: Recent[];
  recentsLabel?: string;
  restored?: { id: string; title: string; output: string } | null;
}) {
  const router = useRouter();
  const { save, reset } = useSaved("docs", restored?.id ?? null);
  const [prompt, setPrompt] = useState(restored?.title ?? "");
  const [text, setText] = useState(restored?.output ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(value: string, attachments?: Attachment[]) {
    if (!value.trim() && !attachments?.length) return;
    setPrompt(value);
    setBusy(true);
    setError(null);
    setText("");

    try {
      const res = await fetch("/api/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "docs",
          prompt: value,
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
        setText((t) => t + decoder.decode(chunk, { stream: true }));
      }
      setText((full) => {
        void save(
          [
            { role: "user", text: value },
            { role: "model", text: full },
          ],
          value,
        );
        return full;
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const filename =
    (text.match(/^#\s+(.+)$/m)?.[1] ?? prompt ?? "document")
      .slice(0, 48)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "document";

  /* ---------------- idle ---------------- */

  if (!prompt) {
    return (
      <div className="nx-in mx-auto flex min-h-screen max-w-[760px] flex-col justify-center px-5 py-16">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[16px] bg-accent/15 text-accent">
            <Ico icon={FiFileText} motion="lift" size={26} />
          </span>
          <h1 className="text-[27px] font-semibold text-ink">Documents</h1>
          <p className="mt-1.5 text-[14.5px] text-ink-3">
            Write a full document, then download it as Word.
          </p>
        </div>

        <Composer onSend={run} placeholder="Write a document about…" autoFocus />

        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {EXAMPLES.map((e, i) => (
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

        <Recents className="mt-10" label={recentsLabel} items={recents} onPick={run} />
      </div>
    );
  }

  /* ---------------- document ---------------- */

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-line bg-canvas/90 px-5 py-3 backdrop-blur-md lg:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] uppercase tracking-[0.08em] text-ink-4">Documents</p>
          <h1 className="truncate text-[15px] font-medium text-ink">{prompt}</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => downloadDocx(text, `${filename}.docx`)}
            disabled={!text || busy}
            className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
          >
            <Ico icon={FiDownload} motion="lift" size={13} /> Word
          </button>
          <button
            onClick={() => downloadMarkdown(text, `${filename}.md`)}
            disabled={!text || busy}
            className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
          >
            <Ico icon={FiDownload} motion="lift" size={13} /> Markdown
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            disabled={!text}
            className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
          >
            {copied ? <Ico icon={FiCheck} motion="check" size={13} className="text-positive" /> : <Ico icon={FiCopy} motion="nudge" size={13} />}
          </button>
          <button
            onClick={() => {
              setPrompt("");
              setText("");
              setError(null);
              reset();
            }}
            className="chip group !px-3 !py-1.5 !text-[12.5px]"
          >
            <Ico icon={FiRotateCcw} motion="spin" size={13} /> New
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[860px] px-5 py-10">
        {busy && !text ? (
          <div className="panel flex items-center gap-3.5 px-5 py-4">
            <Bot size={38} state="working" />
            <span className="nx-dots text-[14px] text-ink-2">Writing</span>
          </div>
        ) : null}

        {text ? (
          /* A page, not a chat bubble: generous margins, a measured column and
             a real typographic scale, so what comes out reads like the document
             it will be exported as. */
          <article className="nx-doc panel px-10 py-11 sm:px-14 sm:py-14">
            <Message role="model" text={text} pending={busy} />
          </article>
        ) : null}

        {error ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-[12px] border border-critical/30 bg-critical/10 px-4 py-3">
            <Ico icon={FiAlertCircle} motion="pop" size={15} className="mt-0.5 shrink-0 text-critical" />
            <div>
              <p className="text-[13.5px] text-ink-2">{error}</p>
              <button
                onClick={() => run(prompt)}
                className="mt-1.5 text-[12.5px] text-critical hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
