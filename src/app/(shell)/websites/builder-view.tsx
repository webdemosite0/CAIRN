"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FailureNote } from "@/components/ui/failure-note";
import {
  FiDownload,
  FiExternalLink,
  FiMonitor,
  FiSmartphone,
  FiTablet,
  FiRefreshCw,
  FiCheck,
  FiCopy,
  FiRotateCcw,
  FiFile,
  FiZap,
  FiLayers,
} from "react-icons/fi";
import { TbWorld, TbPuzzle, TbTerminal2, TbCode, TbFiles } from "react-icons/tb";
import { Composer } from "@/components/chat/composer";
import { MobileComposer } from "@/components/mobile/composer";
import { useNav } from "@/components/shell/nav-state";
import { TroveOrb } from "@/components/brand/orb";
import { Ico, type Motion } from "@/components/ui/ico";
import { ActivityBox } from "@/components/builder/task-feed";
import { StepsBox, type StepState } from "@/components/builder/steps-box";
import { BuildConsole } from "@/components/builder/console";
import { PlanPanel } from "@/components/builder/plan-panel";
import { QuestionBox } from "@/components/builder/question-box";
import { RunPanel } from "@/components/builder/run-panel";
import { strip, type Attachment } from "@/lib/attachments";
import { SKILL_LIST } from "@/lib/skills";
import { TARGET_LIST, targetFor, type TargetId } from "@/lib/targets";
import {
  bundle,
  mergeFiles,
  projectSlug,
  type BuildPlan,
  type Depth,
  type LogLine,
  type PlanStep,
  type ProjectFile,
  type Question,
  type Task,
} from "@/lib/builder";
import { cn } from "@/lib/utils";

type Phase = "idle" | "asking" | "planning" | "review" | "building" | "ready";
type Pane = "preview" | "files" | "code" | "console";

const IDEAS = [
  "An online shop for a specialty coffee roaster",
  "A booking site for a barber shop",
  "A portfolio for a freelance motion designer",
];

const QUICK_EDITS = ["Add dark mode", "Add a search bar", "Make it feel more premium"];

const DEVICE = {
  desktop: { w: "100%", icon: FiMonitor, label: "Desktop" },
  tablet: { w: "820px", icon: FiTablet, label: "Tablet" },
  mobile: { w: "390px", icon: FiSmartphone, label: "Mobile" },
} as const;

const PANES: { id: Pane; icon: typeof TbWorld; label: string; motion: Motion }[] = [
  { id: "preview", icon: TbWorld, label: "Preview", motion: "spin" },
  { id: "files", icon: TbFiles, label: "Files", motion: "lift" },
  { id: "code", icon: TbCode, label: "Code", motion: "type" },
  { id: "console", icon: TbTerminal2, label: "Console", motion: "scan" },
];

/** What the model is doing, phrased for someone who is waiting. */
const THINKING: Record<string, string[]> = {
  asking: ["Reading your idea", "Working out what to ask"],
  planning: [
    "Reading your idea",
    "Deciding what to build",
    "Choosing a visual direction",
    "Ordering the steps",
  ],
};

/** Logo, a halo, and a line that changes — so a wait reads as progress. */
function Thinking({ phase }: { phase: "asking" | "planning" }) {
  const lines = THINKING[phase];
  const [i, setI] = useState(0);

  // No reset here: the parent keys this component by phase, so a phase change
  // remounts it and the index starts at 0 without a second render.
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), 2400);
    return () => clearInterval(t);
  }, [lines.length]);

  return (
    <div className="flex items-center gap-3">
      <span className="nx-thinking relative grid place-items-center">
        <TroveOrb size={26} state="thinking" />
      </span>
      <span key={i} className="nx-in nx-dots text-[13.5px] text-ink-2">
        {lines[i]}
      </span>
    </div>
  );
}

export function BuilderView({ mobile = false }: { mobile?: boolean }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [idea, setIdea] = useState("");
  const [depth, setDepth] = useState<Depth>("deep");
  const [targetId, setTargetId] = useState<TargetId>("static");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [storage, setStorage] = useState<"local" | "none">("local");
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);

  // One consolidated list for the whole run, rather than one per step.
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stepStates, setStepStates] = useState<Record<string, StepState>>({});
  const [currentStep, setCurrentStep] = useState(-1);

  const [error, setError] = useState<string | null>(null);
  const [pane, setPane] = useState<Pane>("preview");

  // A phone cannot show the workspace and the conversation side by side, and
  // stacking them means scrolling past a 560px preview to reach the box you
  // type into. One at a time, switched explicitly.
  const [half, setHalf] = useState<"build" | "chat">("chat");
  const [device, setDevice] = useState<keyof typeof DEVICE>("desktop");
  const [openFile, setOpenFile] = useState("index.html");
  const [copied, setCopied] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [questionsOpen, setQuestionsOpen] = useState(false);

  const { setCollapsed } = useNav();

  const nextLog = useRef(0);
  const feedEnd = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  const busy = phase === "asking" || phase === "planning" || phase === "building";

  useEffect(() => {
    feedEnd.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [tasks.length, phase, currentStep]);

  useEffect(() => () => abort.current?.abort(), []);

  const log = useCallback((text: string, level: LogLine["level"] = "info") => {
    const at = new Date().toTimeString().slice(0, 8);
    setLogs((l) => [...l.slice(-400), { id: nextLog.current++, text, level, at }]);
  }, []);

  const target = useMemo(() => targetFor(targetId), [targetId]);
  const preview = useMemo(
    () => (target.previewable ? bundle(files) : ""),
    [files, target.previewable],
  );

  /** The task currently running, shown inside the active step. */
  const activity = useMemo(
    () => [...tasks].reverse().find((t) => t.state === "run") ?? null,
    [tasks],
  );

  const upsertTask = useCallback((task: Task) => {
    setTasks((prev) => {
      const i = prev.findIndex((t) => t.id === task.id);
      if (i === -1) return [...prev, task];
      const next = [...prev];
      next[i] = task;
      return next;
    });
  }, []);

  /* ---------------- 1. questions ---------------- */

  const ask = useCallback(
    async (text: string, attach?: Attachment[]) => {
      if ((!text.trim() && !attach?.length) || busy) return;
      setIdea(text);
      setError(null);
      setPhase("asking");
      setLogs([]);
      setTasks([]);
      setFiles([]);
      setPlan(null);
      log(`new project — "${text.slice(0, 60)}"`);

      try {
        const res = await fetch("/api/builder/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: text }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);

        setQuestions(data.questions ?? []);
        if (data.degraded) {
          log(data.reason ?? "asking the basics only", "warn");
        }
        log(`${(data.questions ?? []).length} questions ready`, "ok");
        setPhase("review");
        setPlan(null);
        setQuestionsOpen(true);
      } catch (e) {
        // Questions are optional; a failure here should not end the build.
        const m = e instanceof Error ? e.message : "Could not prepare questions.";
        log(`${m} — planning without them`, "warn");
        setQuestions([]);
        void plan_(text, {});
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, log],
  );


  /* ---------------- 2. plan ---------------- */

  const plan_ = useCallback(
    async (text: string, given: Record<string, string>) => {
      setPhase("planning");
      setQuestionsOpen(false);
      setError(null);
      log("planning");

      try {
        const res = await fetch("/api/builder/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idea: text,
            answers: given,
            questions,
            depth,
            target: targetId,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);

        const p: BuildPlan = data.plan;
        setPlan(p);
        setStepStates(Object.fromEntries(p.steps.map((s) => [s.id, "todo" as StepState])));
        setPhase("review");
        log(`plan ready — ${p.steps.length} steps`, "ok");
      } catch (e) {
        const m = e instanceof Error ? e.message : "Something went wrong.";
        setError(m);
        setPhase("idle");
        log(m, "warn");
      }
    },
    [questions, depth, targetId, log],
  );

  /* ---------------- 3. execute ---------------- */

  const runStep = useCallback(
    async (
      step: PlanStep,
      style: string,
      current: ProjectFile[],
      position: { index: number; total: number },
      attach?: Attachment[],
    ): Promise<ProjectFile[]> => {
      const controller = new AbortController();
      abort.current = controller;

      const res = await fetch("/api/builder/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          step,
          files: current,
          idea,
          style,
          index: position.index,
          total: position.total,
          target: targetId,
          attachments: strip(attach),
        }),
      });

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? `Step failed (${res.status}).`);
      }

      let acc = current;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let e: Record<string, unknown>;
          try {
            e = JSON.parse(line);
          } catch {
            continue;
          }

          if (e.t === "task") {
            // Namespaced by step, or step 3's "read styles.css" would silently
            // overwrite step 2's row instead of appearing as its own.
            upsertTask({
              id: `${step.id}:${String(e.id)}`,
              kind: e.kind as Task["kind"],
              label: String(e.label),
              state: e.state as Task["state"],
            });
          } else if (e.t === "log") {
            log(String(e.text), (e.level as LogLine["level"]) ?? "info");
          } else if (e.t === "file") {
            acc = mergeFiles(acc, [{ path: String(e.path), content: String(e.content) }]);
            setFiles(acc);
          } else if (e.t === "error") {
            throw new Error(String(e.message));
          }
        }
      }
      return acc;
    },
    [idea, log, upsertTask, targetId],
  );

  const styleBrief = useCallback(
    (p: BuildPlan) =>
      `${p.style.name}. ${p.style.mood} Palette: ${p.style.palette.join(", ")}. ` +
      `Type: ${p.style.type}. ` +
      `Storage: ${storage === "local" ? "localStorage, namespaced under one key" : "none — nothing persists"}.`,
    [storage],
  );

  const generate = useCallback(async () => {
    if (!plan || busy) return;
    setPhase("building");
    setError(null);
    setPane("console");
    setHalf("build");
    // The preview is what matters from here; the nav is not.
    setCollapsed(true);
    log(`building ${plan.title} — ${plan.steps.length} steps`);

    let current = files;

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      setCurrentStep(i);
      setStepStates((s) => ({ ...s, [step.id]: "run" }));

      try {
        current = await runStep(step, styleBrief(plan), current, {
          index: i,
          total: plan.steps.length,
        });
        setStepStates((s) => ({ ...s, [step.id]: "ok" }));
        // Only swap to the preview for a stack this app can actually render.
        // For the others the console is more useful than an empty frame.
        if (target.previewable && current.some((f) => f.path.endsWith(".html"))) {
          setPane("preview");
          setHalf("build");
        }
      } catch (e) {
        const m = e instanceof Error ? e.message : "Step failed.";
        setStepStates((s) => ({ ...s, [step.id]: "fail" }));
        setCurrentStep(-1);
        setError(m);
        log(m, "warn");
        setPhase(current.length ? "ready" : "review");
        return;
      }
    }

    setCurrentStep(-1);
    setPhase("ready");
    setPane("preview");
    setHalf("build");
    log(
      target.previewable
        ? "build complete"
        : `build complete — ${target.commands[0]} to run it`,
      "ok",
    );
  }, [plan, busy, files, runStep, styleBrief, log, target, setCollapsed]);

  /* ---------------- 4. edits ---------------- */

  const edit = useCallback(
    async (text: string, attach?: Attachment[]) => {
      if (!text.trim() || busy || !plan) return;
      setError(null);
      setPhase("building");
      log(`edit — ${text.slice(0, 60)}`);

      try {
        const current = await runStep(
          {
            id: `edit-${Date.now()}`,
            title: text.slice(0, 40),
            detail: `Apply this change to the existing site, touching only the files it affects: ${text}`,
            skills: [],
            files: [],
          },
          styleBrief(plan),
          files,
          { index: 0, total: 1 },
          attach,
        );
        setFiles(current);
        setPhase("ready");
      } catch (e) {
        const m = e instanceof Error ? e.message : "Edit failed.";
        setError(m);
        log(m, "warn");
        setPhase("ready");
      }
    },
    [busy, plan, files, runStep, styleBrief, log],
  );

  /* ---------------- exports ---------------- */

  async function download() {
    if (!files.length) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    files.forEach((f) => zip.file(f.path, f.content));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectSlug(plan?.title ?? "site")}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openTab() {
    if (!preview) return;
    const blob = new Blob([preview], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function reset() {
    abort.current?.abort();
    setCollapsed(false);
    setPhase("idle");
    setPlan(null);
    setFiles([]);
    setTasks([]);
    setLogs([]);
    setStepStates({});
    setCurrentStep(-1);
    setError(null);
    setIdea("");
    setQuestions([]);
    setQuestionsOpen(false);
  }

  /* ---------------- idle ---------------- */

  if (phase === "idle") {
    return (
      <div className="nx-in mx-auto flex min-h-screen max-w-[720px] flex-col justify-center px-5 py-16">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[12px] bg-accent/15 text-accent">
            <Ico icon={TbWorld} motion="spin" size={26} />
          </span>
          <h1 className="text-[27px] font-semibold text-ink">Website Builder</h1>
          <p className="mt-1.5 text-[14.5px] text-ink-3">
            Describe a site. It asks a couple of questions, plans it, then builds
            it step by step.
          </p>
        </div>

        {/* The phone gets the phone composer here too. Leaving the desktop
            one meant the builder opened with a different text box from the
            chat screen, with labelled Attach and Voice buttons that do not fit
            the width. */}
        {mobile ? (
          <MobileComposer onSend={ask} placeholder="Build a website for…" />
        ) : (
          <Composer onSend={ask} placeholder="Build a website for…" autoFocus />
        )}

        {/* What to build it with. Only the static target previews in-app; the
            others produce a real project you download and run. */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {TARGET_LIST.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setTargetId(t.id)}
              className={cn(
                "nx-in rounded-[8px] border p-3 text-left transition-colors",
                targetId === t.id
                  ? "border-accent bg-accent/[0.06]"
                  : "border-line hover:bg-hover",
              )}
              style={{ animationDelay: `${i * 45}ms`, animationFillMode: "backwards" }}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border",
                    targetId === t.id ? "border-accent" : "border-line-strong",
                  )}
                >
                  {targetId === t.id ? (
                    <span className="block h-1.5 w-1.5 rounded-full bg-accent" />
                  ) : null}
                </span>
                <span className="text-[13.5px] font-medium text-ink">{t.label}</span>
                {t.previewable ? (
                  <span className="rounded-[5px] bg-positive/12 px-1.5 py-0.5 text-[10.5px] text-positive">
                    previews here
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-[12px] leading-snug text-ink-4">
                {t.blurb}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {(
            [
              { id: "quick" as const, label: "Quick", icon: FiZap, hint: "3-4 steps" },
              { id: "deep" as const, label: "Deep Build", icon: FiLayers, hint: "5-8 steps" },
            ]
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setDepth(m.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-[6px] border px-3 py-1.5 text-[12.5px] transition-colors",
                depth === m.id
                  ? "border-accent bg-accent/10 text-ink"
                  : "border-line text-ink-3 hover:bg-hover hover:text-ink-2",
              )}
            >
              <m.icon size={13} />
              {m.label}
              <span className="text-ink-4">{m.hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {IDEAS.map((e, i) => (
            <button
              key={e}
              onClick={() => ask(e)}
              className="chip group nx-in"
              style={{ animationDelay: `${80 + i * 50}ms`, animationFillMode: "backwards" }}
            >
              {e}
            </button>
          ))}
        </div>

        {error ? (
          <FailureNote error={error} className="mt-6" />
        ) : null}
      </div>
    );
  }

  /* ---------------- workspace ---------------- */

  return (
    <div className="flex h-screen flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2.5">
        <button onClick={reset} className="chip group !px-2.5 !py-1.5 !text-[12.5px]">
          <Ico icon={FiRotateCcw} motion="spin" size={13} /> New
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-ink">
            {plan?.title ?? "New project"}
          </p>
          <p className="truncate text-[11.5px] text-ink-4">{idea}</p>
        </div>
        <button
          onClick={openTab}
          disabled={!preview}
          className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
        >
          <Ico icon={FiExternalLink} motion="lift" size={13} /> Open
        </button>
        <button
          onClick={download}
          disabled={!files.length}
          className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
        >
          <Ico icon={FiDownload} motion="lift" size={13} /> Download
        </button>
      </header>

      {mobile ? (
        <div className="flex shrink-0 gap-1 border-b border-line px-3 py-2">
          {([
            ["chat", "Chat"],
            ["build", "Workspace"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setHalf(id)}
              aria-pressed={half === id}
              className={cn(
                "h-9 flex-1 rounded-[10px] text-[13.5px] font-medium transition-colors",
                half === id
                  ? "rail-item-active"
                  : "text-ink-3 active:bg-hover",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ---------- left ---------- */}
        <section
          className={cn(
            "flex min-h-0 flex-col border-r border-line",
            mobile && half !== "build" && "hidden",
          )}
        >
          <div className="flex shrink-0 items-center gap-1 border-b border-line px-2 py-1.5">
            {PANES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPane(p.id)}
                className={cn(
                  "group flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[12.5px] transition-colors",
                  pane === p.id ? "bg-hover text-ink" : "text-ink-4 hover:text-ink-2",
                )}
              >
                <Ico icon={p.icon} motion={p.motion} size={14} active={pane === p.id} />
                {p.label}
                {p.id === "files" && files.length ? (
                  <span className="rounded-[4px] bg-sunk px-1 text-[10px] tabular-nums text-ink-4">
                    {files.length}
                  </span>
                ) : null}
              </button>
            ))}

            <span className="flex-1" />

            {pane === "preview" ? (
              <>
                {(Object.keys(DEVICE) as (keyof typeof DEVICE)[]).map((d) => {
                  const D = DEVICE[d];
                  return (
                    <button
                      key={d}
                      onClick={() => setDevice(d)}
                      aria-label={D.label}
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-[6px] transition-colors",
                        device === d ? "bg-hover text-ink" : "text-ink-4 hover:text-ink-2",
                      )}
                    >
                      <D.icon size={14} />
                    </button>
                  );
                })}
                <button
                  onClick={() => setFiles((f) => [...f])}
                  aria-label="Reload preview"
                  className="grid h-7 w-7 place-items-center rounded-[6px] text-ink-4 transition-colors hover:text-ink-2"
                >
                  <FiRefreshCw size={13} />
                </button>
              </>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden bg-sunk">
            {pane === "preview" && !target.previewable ? (
              files.length ? (
                <RunPanel target={target} fileCount={files.length} onDownload={download} />
              ) : (
                <div className="grid h-full place-items-center">
                  <div className="text-center">
                    <span className={cn(busy && "nx-thinking", "inline-grid place-items-center")}>
                      <TroveOrb size={40} state={busy ? "working" : "idle"} />
                    </span>
                    <p className="mt-3 text-[13.5px] text-ink-3">
                      {busy ? (
                        <span className="nx-dots">Writing your {target.label}</span>
                      ) : (
                        "Nothing built yet."
                      )}
                    </p>
                  </div>
                </div>
              )
            ) : null}

            {pane === "preview" && target.previewable ? (
              preview ? (
                <div className="h-full overflow-auto p-4">
                  <iframe
                    key={preview.length}
                    title="Preview"
                    srcDoc={preview}
                    sandbox="allow-scripts allow-forms allow-modals allow-popups"
                    className="nx-preview-in mx-auto h-full min-h-[560px] rounded-[8px] border border-line bg-white shadow-[var(--elev-lift)] transition-[width] duration-300 ease-out"
                    style={{ width: DEVICE[device].w, maxWidth: "100%" }}
                  />
                </div>
              ) : (
                <div className="grid h-full place-items-center">
                  <div className="text-center">
                    <span className={cn(busy && "nx-thinking", "inline-grid place-items-center")}>
                      <TroveOrb size={40} state={busy ? "working" : "idle"} />
                    </span>
                    <p className="mt-3 text-[13.5px] text-ink-3">
                      {busy ? (
                        <span className="nx-dots">Building your site</span>
                      ) : (
                        "Nothing built yet."
                      )}
                    </p>
                  </div>
                </div>
              )
            ) : null}

            {pane === "files" ? (
              <ul className="h-full overflow-auto p-3">
                {files.length === 0 ? (
                  <li className="text-[13px] text-ink-4">No files yet.</li>
                ) : (
                  files.map((f, i) => (
                    <li
                      key={f.path}
                      className="nx-in"
                      style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
                    >
                      <button
                        onClick={() => {
                          setOpenFile(f.path);
                          setPane("code");
                        }}
                        className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[13px] text-ink-2 transition-colors hover:bg-hover"
                      >
                        <FiFile size={13} className="shrink-0 text-ink-4" />
                        <span className="flex-1 truncate">{f.path}</span>
                        <span className="shrink-0 text-[11px] tabular-nums text-ink-4">
                          {(f.content.length / 1024).toFixed(1)} KB
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}

            {pane === "code" ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-line px-2 py-1.5">
                  {files.map((f) => (
                    <button
                      key={f.path}
                      onClick={() => setOpenFile(f.path)}
                      className={cn(
                        "shrink-0 rounded-[5px] px-2 py-1 font-mono text-[11.5px] transition-colors",
                        openFile === f.path ? "bg-hover text-ink" : "text-ink-4 hover:text-ink-2",
                      )}
                    >
                      {f.path}
                    </button>
                  ))}
                  <span className="flex-1" />
                  <button
                    onClick={() => {
                      const f = files.find((x) => x.path === openFile);
                      if (!f) return;
                      navigator.clipboard?.writeText(f.content);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="shrink-0 rounded-[5px] px-2 py-1 text-ink-4 hover:text-ink-2"
                    aria-label="Copy file"
                  >
                    {copied ? <FiCheck size={13} className="text-positive" /> : <FiCopy size={13} />}
                  </button>
                </div>
                <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[11.5px] leading-relaxed text-ink-2">
                  {files.find((f) => f.path === openFile)?.content ?? "Select a file."}
                </pre>
              </div>
            ) : null}

            {pane === "console" ? (
              <BuildConsole lines={logs} onClear={() => setLogs([])} className="h-full" />
            ) : null}
          </div>
        </section>

        {/* ---------- right ---------- */}
        <section
          className={cn(
            "flex min-h-0 flex-col",
            mobile && half !== "chat" && "hidden",
          )}
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3.5">
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-[10px] bg-raised px-3.5 py-2 text-[13.5px] text-ink">
                {idea}
              </p>
            </div>

            {phase === "asking" || phase === "planning" ? (
              <Thinking key={phase} phase={phase} />
            ) : null}

            {questionsOpen && questions.length ? (
              <QuestionBox
                questions={questions}
                busy={busy}
                onSkip={() => plan_(idea, {})}
                onSubmit={(a) => void plan_(idea, a)}
              />
            ) : null}

            {phase === "review" && plan ? (
              <PlanPanel
                plan={plan}
                storage={storage}
                onStorage={setStorage}
                onGenerate={generate}
                busy={busy}
              />
            ) : null}

            {plan && (phase === "building" || phase === "ready") ? (
              <StepsBox
                steps={plan.steps}
                states={stepStates}
                current={currentStep}
                activity={activity}
              />
            ) : null}

            <ActivityBox tasks={tasks} running={phase === "building"} />

            {error ? (
              <FailureNote error={error} compact />
            ) : null}

            <div ref={feedEnd} />
          </div>

          <div className="shrink-0 border-t border-line p-3">
            {phase === "ready" ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_EDITS.map((q) => (
                  <button
                    key={q}
                    onClick={() => edit(q)}
                    disabled={busy}
                    className="rounded-[6px] border border-line px-2.5 py-1 text-[12px] text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}

            {skillsOpen ? (
              <div className="nx-in mb-2 max-h-[38vh] overflow-auto rounded-[8px] border border-line bg-rail p-2">
                {SKILL_LIST.map((s) => (
                  <div key={s.id} className="rounded-[6px] px-2 py-1.5">
                    <p className="text-[12.5px] font-medium text-ink-2">{s.label}</p>
                    <p className="text-[11.5px] leading-snug text-ink-4">{s.blurb}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {mobile ? (
              <MobileComposer
                onSend={phase === "ready" ? edit : ask}
                placeholder={phase === "ready" ? "Describe a change…" : "Build a website for…"}
              />
            ) : (
              <Composer
                onSend={phase === "ready" ? edit : ask}
                placeholder={phase === "ready" ? "Describe a change…" : "Build a website for…"}
              />
            )}

            <button
              onClick={() => setSkillsOpen((s) => !s)}
              className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-4 transition-colors hover:text-ink-2"
            >
              <TbPuzzle size={13} />
              {SKILL_LIST.length} skills available
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
