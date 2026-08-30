"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiPlus,
  FiTrash2,
  FiCornerUpLeft,
  FiCornerUpRight,
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
import type { Attachment } from "@/lib/attachments";
import { parseDeck, deckFilename, serialiseDeck } from "@/lib/slides";
import { useDeck } from "@/lib/use-deck";
import { downloadPptx } from "@/lib/pptx";
import { downloadMarkdown } from "@/lib/export";
import type { Recent } from "@/lib/recents";
import { useDraft } from "@/lib/use-draft";
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
  restored?: {
    id: string;
    title: string;
    messages: { role: "user" | "model"; text: string }[];
  } | null;
}) {
  const { turns, busy, error, latest: text, prompt, ask, startOver } = useDraft({
    tool: "slides",
    restored,
  });
  const [current, setCurrent] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Parsed on every chunk so slides appear as the model writes them.
  /**
   * The deck is state, not a view of the markdown.
   *
   * It was `useMemo(() => parseDeck(text))`, which recomputed from the
   * model output on every render — so any edit was overwritten by the next
   * one. parseDeck now runs once, when a generation finishes, and everything
   * after that is the person editing.
   */
  const deck = useDeck([]);
  const slides = deck.slides;

  // Import when the model finishes writing, not while it streams: parsing a
  // half-written outline produces slides that appear and vanish.
  const importedFrom = useRef<string | null>(null);
  useEffect(() => {
    if (busy || !text.trim() || importedFrom.current === text) return;
    importedFrom.current = text;
    deck.load(parseDeck(text));
  }, [busy, text, deck]);
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

  function run(value: string, attachments?: Attachment[]) {
    setCurrent(0);
    // The deck as it stands on screen, not as the model last wrote it. Slides
    // are editable, so sending the original would make "add a pricing slide"
    // quietly revert every edit made since the deck arrived.
    void ask(value, {
      attachments,
      current: slides.length ? serialiseDeck(slides) : undefined,
    });
  }

  const filename = deckFilename(slides, prompt);

  /* ---------------- idle ---------------- */

  if (turns.length === 0) {
    return (
      <div className="nx-in relative mx-auto flex min-h-screen max-w-[760px] flex-col justify-center px-5 py-16">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[var(--r-panel)] bg-accent/15 text-accent">
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
          {/* Undo and redo sit before the export actions: they are what you
              reach for while editing, and the exports are what you reach for
              once. */}
          <div className="mr-1 flex items-center gap-0.5 rounded-[var(--r-control)] border border-line bg-rail p-0.5">
            <button
              onClick={deck.undo}
              disabled={!deck.canUndo}
              aria-label="Undo"
              title="Undo"
              className="group grid size-7 place-items-center rounded-[var(--r-chip)] text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:opacity-30"
            >
              <Ico icon={FiCornerUpLeft} motion="back" size={14} />
            </button>
            <button
              onClick={deck.redo}
              disabled={!deck.canRedo}
              aria-label="Redo"
              title="Redo"
              className="group grid size-7 place-items-center rounded-[var(--r-chip)] text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:opacity-30"
            >
              <Ico icon={FiCornerUpRight} motion="nudge" size={14} />
            </button>
          </div>

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
            // serialiseDeck(slides), not the raw model output: `text` is what
            // the model wrote, so exporting it discarded every edit while the
            // PowerPoint beside it exported them.
            onClick={() => downloadMarkdown(serialiseDeck(slides), `${filename}.md`)}
            disabled={!total || busy}
            className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
          >
            <Ico icon={FiDownload} motion="lift" size={13} /> Markdown
          </button>
          <button
            onClick={() => {
              setCurrent(0);
              // Also drops the deck, or "New" would leave the old slides on
              // screen under a blank prompt.
              deck.load([]);
              importedFrom.current = null;
              startOver();
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
                <li key={i} className="group/slide w-[164px] shrink-0 lg:w-full">
                  <button
                    onClick={() => setCurrent(i)}
                    aria-current={i === safeIndex}
                    className={cn(
                      "group block w-full rounded-[var(--r-panel)] text-left transition",
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

                  {/* Slide actions. Hidden until the thumbnail is hovered or
                      something inside it has focus — five buttons per slide
                      visible at all times would bury the deck itself. */}
                  <div className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/slide:opacity-100 lg:opacity-0">
                    <button
                      onClick={() => deck.moveSlide(i, i - 1)}
                      disabled={i === 0}
                      aria-label={`Move slide ${i + 1} earlier`}
                      className="group grid size-6 place-items-center rounded-[var(--r-chip)] text-ink-4 transition-colors hover:bg-hover hover:text-ink disabled:opacity-25"
                    >
                      <Ico icon={FiChevronUp} motion="lift" size={13} />
                    </button>
                    <button
                      onClick={() => deck.moveSlide(i, i + 1)}
                      disabled={i >= total - 1}
                      aria-label={`Move slide ${i + 1} later`}
                      className="group grid size-6 place-items-center rounded-[var(--r-chip)] text-ink-4 transition-colors hover:bg-hover hover:text-ink disabled:opacity-25"
                    >
                      <Ico icon={FiChevronDown} motion="down" size={13} />
                    </button>
                    <span className="flex-1" />
                    <button
                      onClick={() => deck.duplicateSlide(i)}
                      aria-label={`Duplicate slide ${i + 1}`}
                      className="group grid size-6 place-items-center rounded-[var(--r-chip)] text-ink-4 transition-colors hover:bg-hover hover:text-ink"
                    >
                      <Ico icon={FiCopy} motion="copy" size={12} />
                    </button>
                    <button
                      onClick={() => deck.removeSlide(i)}
                      disabled={total <= 1}
                      aria-label={`Delete slide ${i + 1}`}
                      title={total <= 1 ? "A deck needs at least one slide" : undefined}
                      className="group grid size-6 place-items-center rounded-[var(--r-chip)] text-ink-4 transition-colors hover:bg-critical/10 hover:text-critical disabled:opacity-25"
                    >
                      <Ico icon={FiTrash2} motion="shake" size={12} />
                    </button>
                  </div>
                </li>
              ))}

              <li className="w-[164px] shrink-0 lg:w-full">
                <button
                  onClick={() => deck.addSlide(total - 1)}
                  className="group flex aspect-video w-full items-center justify-center gap-1.5 rounded-[var(--r-panel)] border border-dashed border-line-strong text-[12.5px] text-ink-4 transition-colors hover:border-accent hover:bg-accent/5 hover:text-ink"
                >
                  <Ico icon={FiPlus} motion="open" size={14} /> Add slide
                </button>
              </li>
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
                      // NOT keyed by index. Remounting on every keystroke
                      // would destroy the element the caret lives in.
                      slide={slide}
                      index={safeIndex}
                      total={total}
                      className="shadow-[0_18px_48px_-24px_rgb(0_0_0/0.5)]"
                      // Read-only while presenting — a projector is not a
                      // place to discover you have edited a slide.
                      edit={
                        presenting
                          ? undefined
                          : {
                              onTitle: (v) => deck.setTitle(safeIndex, v),
                              onBullet: (i, v) => deck.setBullet(safeIndex, i, v),
                              onAddBullet: (after) =>
                                deck.addBullet(safeIndex, after + 1),
                              onRemoveBullet: (i) => deck.removeBullet(safeIndex, i),
                            }
                      }
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
                      {busy ? " · writing…" : deck.edited ? " · edited" : ""}
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
