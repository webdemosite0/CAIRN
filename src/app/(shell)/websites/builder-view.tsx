"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiDownload,
  FiExternalLink,
  FiMonitor,
  FiSmartphone,
  FiTablet,
  FiRefreshCw,
  FiAlertCircle,
  FiCheck,
  FiCopy,
  FiRotateCcw,
  FiFile,
} from "react-icons/fi";
import { TbWorld, TbPuzzle, TbTerminal2, TbCode, TbFiles } from "react-icons/tb";
import { Composer } from "@/components/chat/composer";
import { LogoMark } from "@/components/brand/logo";
import { Ico } from "@/components/ui/ico";
import { TaskFeed } from "@/components/builder/task-feed";
import { BuildConsole } from "@/components/builder/console";
import { PlanPanel } from "@/components/builder/plan-panel";
import { strip, type Attachment } from "@/lib/attachments";
import { SKILL_LIST, skillLabel } from "@/lib/skills";
import {
  bundle,
  mergeFiles,
  projectSlug,
  type BuildPlan,
  type LogLine,
  type ProjectFile,
  type Task,
  type PlanStep,
} from "@/lib/builder";
import { cn } from "@/lib/utils";

type Phase = "idle" | "planning" | "review" | "building" | "ready";
type Pane = "preview" | "files" | "code" | "console";

interface Turn {
  id: number;
  role: "user" | "agent";
  text: string;
  tasks?: Task[];
  running?: boolean;
}

const IDEAS = [
  "An online shop for a specialty coffee roaster",
  "A booking site for a barber shop",
  "A portfolio for a freelance motion designer",
];

const QUICK = ["Add dark mode", "Add a search bar", "Make it feel more premium"];

const DEVICE = {
  desktop: { w: "100%", icon: FiMonitor, label: "Desktop" },
  tablet: { w: "820px", icon: FiTablet, label: "Tablet" },
  mobile: { w: "390px", icon: FiSmartphone, label: "Mobile" },
} as const;

const PANES: { id: Pane; icon: typeof TbWorld; label: string }[] = [
  { id: "preview", icon: TbWorld, label: "Preview" },
  { id: "files", icon: TbFiles, label: "Files" },
  { id: "code", icon: TbCode, label: "Code" },
  { id: "console", icon: TbTerminal2, label: "Console" },
];

export function BuilderView() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [idea, setIdea] = useState("");
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [storage, setStorage] = useState<"local" | "none">("local");
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [stepStates, setStepStates] = useState<Record<string, "todo" | "run" | "ok" | "fail">>({});
  const [error, setError] = useState<string | null>(null);
  const [pane, setPane] = useState<Pane>("preview");
  const [device, setDevice] = useState<keyof typeof DEVICE>("desktop");
  const [openFile, setOpenFile] = useState("index.html");
  const [copied, setCopied] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);

  const nextTurn = useRef(0);
  const nextLog = useRef(0);
  const feedEnd = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  const busy = phase === "planning" || phase === "building";

  useEffect(() => {
    feedEnd.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, phase]);

  useEffect(() => () => abort.current?.abort(), []);

  const log = useCallback((text: string, level: LogLine["level"] = "info") => {
    const at = new Date().toTimeString().slice(0, 8);
    setLogs((l) => [...l.slice(-400), { id: nextLog.current++, text, level, at }]);
  }, []);

  const preview = useMemo(() => bundle(files), [files]);
  const doneSteps = plan
    ? plan.steps.filter((s) => stepStates[s.id] === "ok").length
    : 0;

  /* ---------------- planning ---------------- */

  const startPlan = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      if ((!text.trim() && !attachments?.length) || busy) return;
      setIdea(text);
      setError(null);
      setPhase("planning");
      setTurns([{ id: nextTurn.current++, role: "user", text }]);
      setLogs([]);
      log(`planning "${text.slice(0, 60)}"`);

      const agentId = nextTurn.current++;
      setTurns((t) => [
        ...t,
        {
          id: agentId,
          role: "agent",
          text: "I'll map out the plan before writing any code.",
          tasks: [{ id: "plan", kind: "plan", label: "New Plan", state: "run" }],
          running: true,
        },
      ]);

      try {
        const res = await fetch("/api/builder/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea: text, attachments: strip(attachments) }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);

        const p: BuildPlan = data.plan;
        setPlan(p);
        setStepStates(Object.fromEntries(p.steps.map((s) => [s.id, "todo" as const])));
        setPhase("review");
        log(`plan ready — ${p.steps.length} steps`, "ok");

        setTurns((t) =>
          t.map((x) =>
            x.id === agentId
              ? {
                  ...x,
                  running: false,
                  text: `Here's the plan for ${p.title}. Review it, then generate.`,
                  tasks: [
                    { id: "plan", kind: "plan", label: "New Plan", state: "ok" },
                    ...p.steps.map((s) => ({
                      id: `p-${s.id}`,
                      kind: "check" as const,
                      label: s.title,
                      state: "ok" as const,
                    })),
                  ],
                }
              : x,
          ),
        );
      } catch (e) {
        const m = e instanceof Error ? e.message : "Something went wrong.";
        setError(m);
        setPhase("idle");
        log(m, "warn");
        setTurns((t) => t.map((x) => (x.id === agentId ? { ...x, running: false } : x)));
      }
    },
    [busy, log],
  );

  /* ---------------- executing ---------------- */

  /**
   * Runs one unit of work and folds its written files into the project.
   *
   * Takes the step itself rather than an index into the plan, so a follow-up
   * edit can be executed through exactly the same path by handing it a
   * one-off step — the alternative was re-running plan step 0, which rebuilt
   * the design system every time someone asked for a small change.
   */
  const runStep = useCallback(
    async (
      step: PlanStep,
      style: string,
      current: ProjectFile[],
      turnId: number,
      position: { index: number; total: number },
      attachments?: Attachment[],
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
          attachments: strip(attachments),
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
            const task: Task = {
              id: String(e.id),
              kind: e.kind as Task["kind"],
              label: String(e.label),
              state: e.state as Task["state"],
            };
            setTurns((t) =>
              t.map((x) => {
                if (x.id !== turnId) return x;
                const tasks = [...(x.tasks ?? [])];
                const at = tasks.findIndex((q) => q.id === task.id);
                if (at > -1) tasks[at] = task;
                else tasks.push(task);
                return { ...x, tasks };
              }),
            );
          } else if (e.t === "log") {
            log(String(e.text), (e.level as LogLine["level"]) ?? "info");
          } else if (e.t === "file") {
            const f = { path: String(e.path), content: String(e.content) };
            acc = mergeFiles(acc, [f]);
            setFiles(acc);
            setOpenFile((o) => (o === "index.html" || !o ? "index.html" : o));
          } else if (e.t === "error") {
            throw new Error(String(e.message));
          }
        }
      }

      return acc;
    },
    [idea, log],
  );

  /** The style brief handed to every step, so the whole site stays coherent. */
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
    log(`building ${plan.title} — ${plan.steps.length} steps`);

    let current = files;

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const turnId = nextTurn.current++;
      setTurns((t) => [
        ...t,
        {
          id: turnId,
          role: "agent",
          text: `Step ${i + 1} of ${plan.steps.length} — ${step.title}`,
          tasks: [],
          running: true,
        },
      ]);

      try {
        setStepStates((s) => ({ ...s, [step.id]: "run" }));
        current = await runStep(step, styleBrief(plan), current, turnId, {
          index: i,
          total: plan.steps.length,
        });
        setStepStates((s) => ({ ...s, [step.id]: "ok" }));
        setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, running: false } : x)));
      } catch (e) {
        const m = e instanceof Error ? e.message : "Step failed.";
        setStepStates((s) => ({ ...s, [step.id]: "fail" }));
        setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, running: false } : x)));
        setError(m);
        log(m, "warn");
        setPhase(current.length ? "ready" : "review");
        return;
      }
    }

    setPhase("ready");
    setPane("preview");
    log("build complete", "ok");
  }, [plan, busy, files, runStep, styleBrief, log]);

  /* ---------------- follow-up edits ---------------- */

  const edit = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      if (!text.trim() || busy || !plan) return;
      setError(null);
      setTurns((t) => [...t, { id: nextTurn.current++, role: "user", text }]);
      setPhase("building");

      const turnId = nextTurn.current++;
      setTurns((t) => [
        ...t,
        { id: turnId, role: "agent", text: "Applying that change.", tasks: [], running: true },
      ]);

      try {
        // A one-off step describing the requested change. It reuses the same
        // executor as a plan step, so an edit gets the same context, the same
        // task feed and the same file merge.
        const current = await runStep(
          {
            id: `edit-${turnId}`,
            title: text.slice(0, 40),
            detail: `Apply this change to the existing site, touching only the files it affects: ${text}`,
            skills: [],
            files: [],
          },
          styleBrief(plan),
          files,
          turnId,
          { index: 0, total: 1 },
          attachments,
        );
        setFiles(current);
        setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, running: false } : x)));
        setPhase("ready");
      } catch (e) {
        const m = e instanceof Error ? e.message : "Edit failed.";
        setError(m);
        log(m, "warn");
        setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, running: false } : x)));
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
    setPhase("idle");
    setPlan(null);
    setFiles([]);
    setTurns([]);
    setLogs([]);
    setStepStates({});
    setError(null);
    setIdea("");
  }

  /* ---------------- idle ---------------- */

  if (phase === "idle") {
    return (
      <div className="nx-in mx-auto flex min-h-screen max-w-[720px] flex-col justify-center px-5 py-16">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[16px] bg-accent/15 text-accent">
            <Ico icon={TbWorld} motion="spin" size={26} />
          </span>
          <h1 className="text-[27px] font-semibold text-ink">Website Builder</h1>
          <p className="mt-1.5 text-[14.5px] text-ink-3">
            Describe a site. It plans it, builds it step by step, then you keep
            talking to change anything.
          </p>
        </div>

        <Composer onSend={startPlan} placeholder="Build a website for…" autoFocus />

        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {IDEAS.map((e, i) => (
            <button
              key={e}
              onClick={() => startPlan(e)}
              className="chip group nx-in"
              style={{ animationDelay: `${80 + i * 50}ms`, animationFillMode: "backwards" }}
            >
              {e}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-6 flex items-start gap-2.5 rounded-[12px] border border-critical/30 bg-critical/10 px-4 py-3">
            <Ico icon={FiAlertCircle} motion="pop" size={15} className="mt-0.5 shrink-0 text-critical" />
            <p className="text-[13.5px] text-ink-2">{error}</p>
          </div>
        ) : null}
      </div>
    );
  }

  /* ---------------- workspace ---------------- */

  return (
    <div className="flex h-screen flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2.5">
        <button
          onClick={reset}
          className="chip group !px-2.5 !py-1.5 !text-[12.5px]"
          title="Start a new project"
        >
          <Ico icon={FiRotateCcw} motion="spin" size={13} /> New
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-ink">
            {plan?.title ?? "Building"}
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

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ---------- left: the artefact ---------- */}
        <section className="flex min-h-0 flex-col border-r border-line">
          <div className="flex shrink-0 items-center gap-1 border-b border-line px-2 py-1.5">
            {PANES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPane(p.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[12.5px] transition-colors",
                  pane === p.id ? "bg-hover text-ink" : "text-ink-4 hover:text-ink-2",
                )}
              >
                <p.icon size={14} />
                {p.label}
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
                        "grid h-7 w-7 place-items-center rounded-[7px] transition-colors",
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
                  className="grid h-7 w-7 place-items-center rounded-[7px] text-ink-4 transition-colors hover:text-ink-2"
                >
                  <FiRefreshCw size={13} />
                </button>
              </>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden bg-sunk">
            {pane === "preview" ? (
              preview ? (
                <div className="h-full overflow-auto p-4">
                  <iframe
                    key={files.length + preview.length}
                    title="Preview"
                    srcDoc={preview}
                    sandbox="allow-scripts allow-forms allow-modals allow-popups"
                    className="mx-auto h-full min-h-[560px] rounded-[10px] border border-line bg-white shadow-[var(--elev)]"
                    style={{ width: DEVICE[device].w, maxWidth: "100%" }}
                  />
                </div>
              ) : (
                <div className="grid h-full place-items-center">
                  <div className="text-center">
                    <LogoMark size={40} animated={busy} />
                    <p className="mt-3 text-[13.5px] text-ink-3">
                      {busy ? "Building your site…" : "Nothing built yet."}
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
                  files.map((f) => (
                    <li key={f.path}>
                      <button
                        onClick={() => {
                          setOpenFile(f.path);
                          setPane("code");
                        }}
                        className="flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[13px] text-ink-2 transition-colors hover:bg-hover"
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
                        "shrink-0 rounded-[6px] px-2 py-1 font-mono text-[11.5px] transition-colors",
                        openFile === f.path
                          ? "bg-hover text-ink"
                          : "text-ink-4 hover:text-ink-2",
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
                    className="shrink-0 rounded-[6px] px-2 py-1 text-ink-4 hover:text-ink-2"
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

        {/* ---------- right: the conversation ---------- */}
        <section className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3.5">
            {turns.map((t) =>
              t.role === "user" ? (
                <div key={t.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-[12px] bg-raised px-3.5 py-2 text-[13.5px] text-ink">
                    {t.text}
                  </p>
                </div>
              ) : (
                <div key={t.id} className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <LogoMark size={20} animated={Boolean(t.running)} />
                    <p className="flex-1 pt-0.5 text-[13.5px] leading-relaxed text-ink-2">
                      {t.text}
                    </p>
                  </div>
                  {t.tasks?.length ? (
                    <TaskFeed
                      title="Running task"
                      tasks={t.tasks}
                      running={Boolean(t.running)}
                      defaultOpen={Boolean(t.running)}
                    />
                  ) : null}
                </div>
              ),
            )}

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
              <div className="rounded-[10px] border border-line bg-rail/60 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex-1 text-[13px] font-medium text-ink-2">
                    Execute Plan
                  </span>
                  <span className="text-[12px] tabular-nums text-ink-4">
                    {doneSteps}/{plan.steps.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {plan.steps.map((s) => {
                    const st = stepStates[s.id] ?? "todo";
                    return (
                      <li key={s.id} className="flex items-center gap-2.5 text-[13px]">
                        <span className="grid h-4 w-4 shrink-0 place-items-center">
                          {st === "run" ? (
                            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
                          ) : st === "ok" ? (
                            <FiCheck size={13} className="text-positive" />
                          ) : st === "fail" ? (
                            <FiAlertCircle size={13} className="text-critical" />
                          ) : (
                            <span className="block h-3 w-3 rounded-full border border-line-strong" />
                          )}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate",
                            st === "run"
                              ? "text-accent"
                              : st === "ok"
                                ? "text-ink-3"
                                : "text-ink-4",
                          )}
                        >
                          {s.title}
                        </span>
                        {s.skills.map((k) => (
                          <span
                            key={k}
                            className="shrink-0 rounded-[5px] bg-sunk px-1.5 py-0.5 text-[10.5px] text-ink-4"
                          >
                            {skillLabel(k)}
                          </span>
                        ))}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {error ? (
              <div className="flex items-start gap-2.5 rounded-[10px] border border-critical/30 bg-critical/10 px-3 py-2.5">
                <FiAlertCircle size={14} className="mt-0.5 shrink-0 text-critical" />
                <p className="text-[13px] text-ink-2">{error}</p>
              </div>
            ) : null}

            <div ref={feedEnd} />
          </div>

          <div className="shrink-0 border-t border-line p-3">
            {phase === "ready" ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => edit(q)}
                    disabled={busy}
                    className="rounded-[7px] border border-line px-2.5 py-1 text-[12px] text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}

            {skillsOpen ? (
              <div className="mb-2 max-h-[38vh] overflow-auto rounded-[10px] border border-line bg-rail p-2">
                {SKILL_LIST.map((s) => (
                  <div key={s.id} className="rounded-[7px] px-2 py-1.5">
                    <p className="text-[12.5px] font-medium text-ink-2">{s.label}</p>
                    <p className="text-[11.5px] leading-snug text-ink-4">{s.blurb}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <Composer
              onSend={phase === "ready" ? edit : startPlan}
              placeholder={
                phase === "ready" ? "Describe a change…" : "Build a website for…"
              }
            />

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
