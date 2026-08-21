"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { localTimeZone } from "@/lib/context";
import {
  FiDownload,
  FiRotateCcw,
  FiChevronLeft,
  FiChevronRight,
  FiPlay,
  FiX,
  FiLayout,
} from "react-icons/fi";
import { Bot } from "@/components/agents/bot";
import { Composer } from "@/components/chat/composer";
import { Recents } from "@/components/ui/recents";
import { Ico } from "@/components/ui/ico";
import { FailureNote } from "@/components/ui/failure-note";
import { SlideCanvas } from "@/components/slides/slide-canvas";
import { strip, type Attachment } from "@/lib/attachments";
import { parseDeck, deckFilename } from "@/lib/slides";
import { downloadPptx } from "@/lib/pptx";
import { downloadMarkdown } from "@/lib/export";
import type { Recent } from "@/lib/recents";
import { useRouter } from "next/navigation";
import { useSaved } from "@/lib/use-saved";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "A seed pitch for an AI devtools startup",
  "An engineering all-hands on migrating to Postgres",
  "A product launch deck for a mobile app",
];

export function SlidesView({
  recents = [],
  recentsLabel = "Recents",
  restored = null,
}: {
  recents?: Recent[];
  recentsLabel?: string;
  restored?: { id: string; title: string; output: string } | null;
}) {
  const router = useRouter();
  const { save, reset } = useSaved("slides", restored?.id ?? null);
  const [prompt, setPrompt] = useState(restored?.title ?? "");
  const [text, setText] = useState(restored?.output ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Parsed on every chunk so slides appear as the model writes them.
  const slides = useMemo(() => parseDeck(text), [text]);
  const total = slides.length;
  const safeIndex = Math.min(current, Math.max(0, total - 1));
  const slide = slides[safeIndex];

  const go = useCallback(
    (delta: number) => {
      setCurrent((c) => Math.max(0, Math.min(total - 1, c + delta)));
    },
    [total],
  );

  /* Arrow keys drive the deck, but not while the composer has focus — otherwise
     moving the caret would also change slide. */
  useEffect(() => {
    if (!total) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.matches("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1); }
      else if (e.key === "Home") { e.preventDefault(); setCurrent(0); }
      else if (e.key === "End") { e.preventDefault(); setCurrent(total - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, total]);

  /* Leaving fullscreen by Esc or the browser chrome must clear present mode,
     or the UI stays in a state the user cannot exit. */
  useEffect(() => {
    const onChange = () => setPresenting(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function present() {
    const el = stageRef.current;
    if (!el) return;
    try {
      await el.requestFullscreen();
    } catch {
      // Fullscreen can be refused (permissions policy, iframe). Fall back to a
      // fixed overlay so the button still does something useful.
      setPresenting(true);
    }
  }

  async function run(value: string, attachments?: Attachment[]) {
    if (!value.trim() && !attachments?.length) return;
    setPrompt(value);
    setBusy(true);
    setError(null);
    setText("");
    setCurrent(0);

    try {
      const res = await fetch("/api/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeZone: localTimeZone(),
          tool: "slides",
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

  const filename = deckFilename(slides, prompt);

  /* ---------------- idle ---------------- */

  if (!prompt) {
    return (
      <div className="nx-in mx-auto flex min-h-screen max-w-[760px] flex-col justify-center px-5 py-16">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[12px] bg-accent/15 text-accent">
            <Ico icon={FiLayout} motion="lift" size={26} />
          </span>
          <h1 className="text-[27px] font-semibold text-ink">Slides</h1>
          <p className="mt-1.5 text-[14.5px] text-ink-3">
            Build a deck, present it, then download it as PowerPoint.
          </p>
        </div>

        <Composer onSend={run} placeholder="Create a deck about…" autoFocus />

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

  /* ---------------- deck ---------------- */

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-line bg-canvas/90 px-5 py-3 backdrop-blur-md lg:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] uppercase tracking-[0.08em] text-ink-4">
            Slides{total ? ` · ${total}` : ""}
          </p>
          <h1 className="truncate text-[15px] font-medium text-ink">{prompt}</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={present}
            disabled={!total}
            className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
          >
            <Ico icon={FiPlay} motion="lift" size={13} /> Present
          </button>
          <button
            onClick={() => downloadPptx(slides, `${filename}.pptx`, slides[0]?.title ?? prompt)}
            disabled={!total || busy}
            className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
          >
            <Ico icon={FiDownload} motion="lift" size={13} /> PowerPoint
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
              setPrompt("");
              setText("");
              setError(null);
              setCurrent(0);
              reset();
            }}
            className="chip group !px-3 !py-1.5 !text-[12.5px]"
          >
            <Ico icon={FiRotateCcw} motion="spin" size={13} /> New
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-5 py-8">
        {busy && !total ? (
          <div className="panel flex items-center gap-3.5 px-5 py-4">
            <Bot size={38} state="working" />
            <span className="nx-dots text-[14px] text-ink-2">Building the deck</span>
          </div>
        ) : null}

        {total ? (
          <div className="grid gap-6 lg:grid-cols-[188px_minmax(0,1fr)]">
            {/* thumbnail rail */}
            <ol className="order-2 flex gap-3 overflow-x-auto pb-2 lg:order-1 lg:max-h-[70vh] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:pb-0 lg:pr-1">
              {slides.map((s, i) => (
                <li key={i} className="w-[164px] shrink-0 lg:w-full">
                  <button
                    onClick={() => setCurrent(i)}
                    aria-current={i === safeIndex}
                    className={cn(
                      "group block w-full rounded-[10px] text-left transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                    )}
                  >
                    <span className="mb-1 block text-[11px] tabular-nums text-ink-4">
                      {i + 1}
                    </span>
                    <SlideCanvas
                      slide={s}
                      index={i}
                      total={total}
                      thumb
                      className={cn(
                        "transition",
                        i === safeIndex
                          ? "ring-2 ring-accent"
                          : "opacity-70 group-hover:opacity-100",
                      )}
                    />
                  </button>
                </li>
              ))}
            </ol>

            {/* stage */}
            <div className="order-1 min-w-0 lg:order-2">
              <div
                ref={stageRef}
                className={cn(
                  "relative",
                  presenting &&
                    "fixed inset-0 z-50 grid place-items-center bg-black p-6",
                )}
              >
                <div className={cn(presenting && "w-full max-w-[min(96vw,170vh)]")}>
                  {slide ? (
                    <SlideCanvas
                      key={safeIndex}
                      slide={slide}
                      index={safeIndex}
                      total={total}
                      className="nx-settle shadow-[0_18px_48px_-24px_rgb(0_0_0/0.5)]"
                    />
                  ) : null}
                </div>

                {presenting ? (
                  <button
                    onClick={() => {
                      if (document.fullscreenElement) void document.exitFullscreen();
                      setPresenting(false);
                    }}
                    className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    aria-label="Exit presentation"
                  >
                    <Ico icon={FiX} motion="pop" size={16} />
                  </button>
                ) : null}
              </div>

              {!presenting ? (
                <>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <button
                      onClick={() => go(-1)}
                      disabled={safeIndex === 0}
                      className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-30"
                    >
                      <Ico icon={FiChevronLeft} motion="nudge" size={14} /> Back
                    </button>

                    <span className="text-[12.5px] tabular-nums text-ink-4">
                      Slide {safeIndex + 1} of {total}
                      {busy ? " · writing…" : ""}
                    </span>

                    <button
                      onClick={() => go(1)}
                      disabled={safeIndex >= total - 1}
                      className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-30"
                    >
                      Next <Ico icon={FiChevronRight} motion="nudge" size={14} />
                    </button>
                  </div>

                  {slide?.note ? (
                    <div className="panel mt-4 px-5 py-4">
                      <p className="mb-1.5 text-[11.5px] uppercase tracking-[0.08em] text-ink-4">
                        Speaker note
                      </p>
                      <p className="text-[14px] leading-relaxed text-ink-2">{slide.note}</p>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* The model wrote something we could not read as slides — show it
            rather than an empty stage. */}
        {!total && text && !busy ? (
          <article className="nx-doc panel whitespace-pre-wrap px-8 py-8 text-[14px] text-ink-2">
            {text}
          </article>
        ) : null}

        {error ? (
          <FailureNote error={error} onRetry={() => run(prompt)} className="mt-4" />
        ) : null}
      </div>
    </div>
  );
}
