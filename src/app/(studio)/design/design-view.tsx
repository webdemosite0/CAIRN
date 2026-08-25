"use client";

import { useCallback, useRef, useState } from "react";
import { FiDownload, FiExternalLink, FiLoader, FiRotateCcw } from "react-icons/fi";
import { HiOutlineCube } from "react-icons/hi2";
import { StudioBack } from "@/components/shell/studio-back";
import { BriefForm } from "@/components/design/brief-form";
import { FailureNote } from "@/components/ui/failure-note";
import { Ico } from "@/components/ui/ico";
import { Recents } from "@/components/ui/recents";
import { localTimeZone } from "@/lib/context";
import { briefSummary, FRAME, type Brief } from "@/lib/design-brief";
import type { Recent } from "@/lib/recents";
import { cn } from "@/lib/utils";

/**
 * Design, as screens rather than as a document.
 *
 * The tool used to answer a design request with a written specification —
 * accurate, complete, and something you then had to draw yourself. This asks a
 * short brief and returns the screens.
 *
 * Screens are requested one at a time. A single response holding six of them
 * runs into the output ceiling and truncates the last, and a truncated
 * document renders as a blank frame with no indication why. Sequential also
 * means the first screen is on the page while the fourth is still being drawn.
 */

interface Screen {
  name: string;
  html: string;
  state: "waiting" | "drawing" | "done" | "failed";
  error?: string;
}

export function DesignView({ recents = [] }: { recents?: Recent[] }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.7);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (b: Brief) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    setBrief(b);
    setError(null);
    setBusy(true);
    setScreens(b.screens.map((name) => ({ name, html: "", state: "waiting" })));

    for (const [i, name] of b.screens.entries()) {
      if (controller.signal.aborted) return;
      setScreens((s) => s.map((x, n) => (n === i ? { ...x, state: "drawing" } : x)));

      try {
        const res = await fetch("/api/design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brief: b, screen: name, timeZone: localTimeZone() }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);

        setScreens((s) =>
          s.map((x, n) => (n === i ? { ...x, html: data.html, state: "done" } : x)),
        );
      } catch (e) {
        if (controller.signal.aborted) return;
        const why = e instanceof Error ? e.message : "Something went wrong.";
        // One screen failing does not stop the rest. A set with five of six
        // drawn is worth more than an error page.
        setScreens((s) =>
          s.map((x, n) => (n === i ? { ...x, state: "failed", error: why } : x)),
        );
        setError(why);
      }
    }

    setBusy(false);
  }, []);

  function openScreen(s: Screen) {
    const blob = new Blob([s.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    // Revoked late: the new tab has to have read it first.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function downloadScreen(s: Screen) {
    const blob = new Blob([s.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------------- brief ---------------- */

  if (!brief) {
    return (
      <div className="relative flex min-h-screen flex-col">
        <StudioBack className="absolute left-3 top-3 z-10" />
        <div className="mx-auto w-full max-w-[720px] flex-1 px-5 py-16">
          <div className="mb-7 flex flex-col items-center text-center">
            <span className="mb-4 grid size-14 place-items-center rounded-[12px] bg-accent/15 text-accent">
              <HiOutlineCube size={26} />
            </span>
            <h1 className="text-[27px] font-semibold text-ink">Design</h1>
            <p className="mt-1.5 text-[14.5px] text-ink-3">
              Answer a few questions and get real screens, not a written spec.
            </p>
          </div>

          <BriefForm onSubmit={run} />

          <Recents className="mt-10" label="Recent designs" items={recents} />
        </div>
      </div>
    );
  }

  /* ---------------- screens ---------------- */

  const frame = FRAME[brief.platform];
  const done = screens.filter((s) => s.state === "done").length;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-line bg-canvas/90 px-5 py-3 backdrop-blur-md lg:px-6">
        <StudioBack className="-ml-2" label="" />
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] uppercase tracking-[0.08em] text-ink-4">
            Design · {done} of {screens.length}
            {busy ? " · drawing…" : ""}
          </p>
          <h1 className="truncate text-[15px] font-medium text-ink">
            {briefSummary(brief)}
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-2 rounded-[9px] border border-line bg-rail px-2.5 py-1.5">
            <span className="text-[11.5px] text-ink-4">Zoom</span>
            <input
              type="range"
              min={0.35}
              max={1}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom the screens"
              className="w-[86px] accent-[var(--color-accent)]"
            />
            <span className="w-[34px] text-right text-[11.5px] tabular-nums text-ink-4">
              {Math.round(zoom * 100)}%
            </span>
          </label>

          <button
            onClick={() => {
              abort.current?.abort();
              setBrief(null);
              setScreens([]);
              setError(null);
              setBusy(false);
            }}
            className="chip group !px-3 !py-1.5 !text-[12.5px]"
          >
            <Ico icon={FiRotateCcw} motion="spin" size={13} /> New
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto px-5 py-8 lg:px-6">
        {error && !busy ? <FailureNote error={error} className="mb-5" /> : null}

        <div className="flex items-start gap-6" style={{ minHeight: frame.height * zoom }}>
          {screens.map((s) => (
            <figure key={s.name} className="shrink-0">
              <figcaption className="mb-2 flex items-center gap-2">
                <span className="text-[13px] font-medium text-ink">{s.name}</span>
                {s.state === "drawing" ? (
                  <Ico icon={FiLoader} motion="spin" size={12} className="animate-spin text-accent" live />
                ) : null}
                <span className="flex-1" />
                {s.state === "done" ? (
                  <>
                    <button
                      onClick={() => openScreen(s)}
                      aria-label={`Open ${s.name} in a new tab`}
                      className="group grid size-6 place-items-center rounded-[5px] text-ink-4 transition-colors hover:bg-hover hover:text-ink"
                    >
                      <Ico icon={FiExternalLink} motion="launch" size={12} />
                    </button>
                    <button
                      onClick={() => downloadScreen(s)}
                      aria-label={`Download ${s.name}`}
                      className="group grid size-6 place-items-center rounded-[5px] text-ink-4 transition-colors hover:bg-hover hover:text-ink"
                    >
                      <Ico icon={FiDownload} motion="down" size={12} />
                    </button>
                  </>
                ) : null}
              </figcaption>

              {/* The frame is rendered at the platform's real size and scaled
                  down, rather than rendered small. A 390px layout rendered
                  into a 270px iframe is a different layout — media queries
                  fire, and the thing on screen is not the thing designed. */}
              <div
                className="overflow-hidden rounded-[14px] border border-line bg-raised shadow-[0_18px_48px_-24px_rgb(0_0_0/0.45)]"
                style={{ width: frame.width * zoom, height: frame.height * zoom }}
              >
                {s.state === "done" ? (
                  <iframe
                    title={s.name}
                    srcDoc={s.html}
                    sandbox="allow-scripts"
                    style={{
                      width: frame.width,
                      height: frame.height,
                      transform: `scale(${zoom})`,
                      transformOrigin: "top left",
                      border: 0,
                    }}
                  />
                ) : (
                  <div
                    className={cn(
                      "grid h-full place-items-center px-6 text-center",
                      s.state === "failed" ? "text-critical" : "text-ink-4",
                    )}
                  >
                    <p className="text-[12.5px]">
                      {s.state === "waiting"
                        ? "Queued"
                        : s.state === "drawing"
                          ? "Drawing…"
                          : (s.error ?? "Could not draw this one")}
                    </p>
                  </div>
                )}
              </div>

              <p className="mt-1.5 text-[11px] tabular-nums text-ink-4">{frame.label}</p>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
