"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiDownload,
  FiExternalLink,
  FiMonitor,
  FiSmartphone,
  FiTablet,
  FiFile,
  FiCheck,
  FiCopy,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";
import { Bot } from "@/components/agents/bot";
import { Lockup } from "@/components/brand/logo";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";
import { Composer } from "@/components/chat/composer";
import { strip, type Attachment } from "@/lib/attachments";

interface ProjectFile {
  path: string;
  content: string;
}

interface Turn {
  id: number;
  role: "user" | "agent";
  text: string;
  changed?: string[];
}

const IDEAS = [
  "A landing page for a specialty coffee roaster",
  "A portfolio for a freelance motion designer",
  "A pricing page for a developer tool",
];

const STAGES = ["Planning", "Designing", "Writing code", "Checking"];

/** Inlines styles.css / script.js into index.html so the iframe can render it. */
function bundle(files: ProjectFile[]) {
  const index = files.find((f) => f.path === "index.html");
  if (!index) return "";
  let html = index.content;

  for (const f of files) {
    if (f.path.endsWith(".css")) {
      const tag = new RegExp(
        `<link[^>]*href=["']\\.?/?${f.path.replace(".", "\\.")}["'][^>]*>`,
        "gi",
      );
      html = html.replace(tag, `<style>\n${f.content}\n</style>`);
    }
    if (f.path.endsWith(".js")) {
      const tag = new RegExp(
        `<script[^>]*src=["']\\.?/?${f.path.replace(".", "\\.")}["'][^>]*>\\s*</script>`,
        "gi",
      );
      html = html.replace(tag, `<script>\n${f.content}\n</script>`);
    }
  }
  return html;
}

export function WebsiteBuilder({ signedIn }: { signedIn: boolean }) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [openFile, setOpenFile] = useState("index.html");
  const [copied, setCopied] = useState(false);
  const nextId = useRef(0);
  const feedEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEnd.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, busy]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 2200);
    return () => {
      clearInterval(t);
      setStage(0);
    };
  }, [busy]);

  const send = useCallback(
    async (instruction: string, attachments?: Attachment[]) => {
      if ((!instruction.trim() && !attachments?.length) || busy) return;
      setError(null);
      setTurns((t) => [
        ...t,
        {
          id: nextId.current++,
          role: "user",
          text:
            instruction ||
            `Build from the attached file${attachments!.length > 1 ? "s" : ""}.`,
        },
      ]);
      setBusy(true);

      try {
        const res = await fetch("/api/builder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction,
            files,
            projectId,
            attachments: strip(attachments),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);

        setFiles(data.files);
        setProjectId(data.projectId ?? null);
        setOpenFile(
          data.changed?.includes("index.html") ? "index.html" : data.changed?.[0] ?? "index.html",
        );
        setTurns((t) => [
          ...t,
          {
            id: nextId.current++,
            role: "agent",
            text: data.summary,
            changed: data.changed,
          },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setBusy(false);
      }
    },
    [busy, files, projectId],
  );

  async function downloadZip() {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    files.forEach((f) => zip.file(f.path, f.content));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cairn-site.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openInTab() {
    const w = window.open("", "_blank");
    w?.document.write(bundle(files));
    w?.document.close();
  }

  /* ---------------- first build in progress ----------------
     Without this the workspace renders with an empty file list and a blank
     preview iframe while the first request is still running. */

  if (files.length === 0 && busy) {
    return (
      <div className="nx-in mx-auto flex min-h-screen max-w-[560px] flex-col justify-center px-5 py-16">
        <h2 className="mb-1.5 text-[19px] font-semibold text-ink">
          Building your site
        </h2>
        <p className="mb-8 truncate text-[13.5px] text-ink-3">
          {turns.find((t) => t.role === "user")?.text}
        </p>

        <ul className="space-y-2.5">
          {STAGES.map((label, i) => {
            const done = i < stage;
            const working = i === stage;
            return (
              <li
                key={label}
                className={cn(
                  "flex items-center gap-3.5 rounded-[13px] border px-4 py-3 transition-colors duration-300",
                  working
                    ? "border-line-strong bg-raised"
                    : "border-line bg-rail" + (done ? "" : " opacity-45"),
                )}
              >
                <Bot
                  size={36}
                  accent={["#7aa2f7", "#bb9af7", "#7dcfff", "#9ece6a"][i]}
                  state={done ? "done" : working ? "working" : "idle"}
                />
                <span className="flex-1 text-[14px] text-ink">{label}</span>
                {done ? (
                  <Ico icon={FiCheck} motion="check" size={15} className="text-positive" />
                ) : working ? (
                  <span className="nx-dots text-[12.5px] text-ink-3" />
                ) : null}
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-center text-[12.5px] text-ink-4">
          This usually takes under a minute.
        </p>

        {error ? (
          <div className="mt-6 flex items-start gap-2.5 rounded-[12px] border border-critical/30 bg-critical/10 px-4 py-3">
            <Ico icon={FiAlertCircle} motion="pop" size={15} className="mt-0.5 shrink-0 text-critical" />
            <p className="text-[13.5px] text-ink-2">{error}</p>
          </div>
        ) : null}
      </div>
    );
  }

  /* ---------------- first prompt ---------------- */

  if (files.length === 0) {
    return (
      <div className="nx-in mx-auto flex min-h-screen max-w-[800px] flex-col justify-center px-5 py-16">
        <div className="mb-8 text-center">
          <h1 className="text-[31px] font-semibold text-ink">
            Build something and keep shaping it
          </h1>
          <p className="mt-2 text-[14.5px] text-ink-3">
            Describe a site, then talk to it — every reply edits the real files.
          </p>
        </div>

        <Composer
          onSend={send}
          placeholder="A landing page for… (attach a screenshot to build from it)"
          autoFocus
        />

        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {IDEAS.map((idea, i) => (
            <button
              key={idea}
              onClick={() => send(idea)}
              className="chip group nx-in"
              style={{ animationDelay: `${80 + i * 50}ms`, animationFillMode: "backwards" }}
            >
              {idea}
            </button>
          ))}
        </div>

        {!signedIn ? (
          <p className="mt-8 text-center text-[12.5px] text-ink-4">
            Log in to keep your projects between visits.
          </p>
        ) : null}

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

  const preview = bundle(files);
  const current = files.find((f) => f.path === openFile) ?? files[0];

  return (
    <div className="flex h-screen flex-col lg:flex-row">
      {/* chat rail */}
      <div className="flex h-[46vh] flex-col border-b border-line lg:h-auto lg:w-[360px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Lockup size={24} />
          <span className="text-[14px] font-medium text-ink">Builder</span>
          <button
            onClick={() => {
              setFiles([]);
              setTurns([]);
              setProjectId(null);
              setError(null);
            }}
            className="ml-auto rounded-[7px] px-2 py-1 text-[12.5px] text-ink-3 hover:bg-hover hover:text-ink"
          >
            New
          </button>
        </header>

        <div className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
          {turns.map((t) =>
            t.role === "user" ? (
              <div key={t.id} className="nx-in flex justify-end">
                <p className="max-w-[88%] rounded-[14px] rounded-br-[5px] bg-sunk px-3.5 py-2 text-[13.5px] leading-relaxed text-ink">
                  {t.text}
                </p>
              </div>
            ) : (
              <div key={t.id} className="nx-in flex gap-2.5">
                <Bot size={26} state="done" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] leading-relaxed text-ink-2">{t.text}</p>
                  {t.changed?.length ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {t.changed.map((c) => (
                        <span
                          key={c}
                          className="rounded-[5px] border border-line bg-sunk px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ),
          )}

          {busy ? (
            <div className="nx-in flex items-center gap-2.5">
              <Bot size={26} state="working" />
              <span className="nx-dots text-[13.5px] text-ink-3">{STAGES[stage]}</span>
            </div>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-[10px] border border-critical/30 bg-critical/10 px-3 py-2.5">
              <Ico icon={FiAlertCircle} motion="pop" size={14} className="mt-0.5 shrink-0 text-critical" />
              <div className="min-w-0">
                <p className="text-[12.5px] leading-relaxed text-ink-2">{error}</p>
                <button
                  onClick={() => send(turns.filter((t) => t.role === "user").at(-1)?.text ?? "")}
                  className="mt-1 flex items-center gap-1.5 text-[12px] text-critical hover:underline"
                >
                  <Ico icon={FiRefreshCw} motion="spin" size={10} /> Retry
                </button>
              </div>
            </div>
          ) : null}

          <div ref={feedEnd} />
        </div>

        <div className="border-t border-line p-3">
          <Composer
            compact
            onSend={send}
            disabled={busy}
            placeholder="Make the header sticky…"
          />
        </div>
      </div>

      {/* preview / code */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
          <div className="flex items-center gap-1 rounded-[9px] border border-line bg-rail p-1">
            {(["preview", "code"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-[6px] px-2.5 py-1 text-[12.5px] capitalize transition-colors",
                  view === v ? "bg-hover text-ink" : "text-ink-3 hover:text-ink",
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {view === "preview" ? (
            <div className="flex items-center gap-1 rounded-[9px] border border-line bg-rail p-1">
              {[
                { id: "desktop" as const, icon: FiMonitor },
                { id: "tablet" as const, icon: FiTablet },
                { id: "mobile" as const, icon: FiSmartphone },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDevice(d.id)}
                  aria-label={d.id}
                  className={cn(
                    "grid h-7 w-8 place-items-center rounded-[6px] transition-colors",
                    device === d.id ? "bg-hover text-ink" : "text-ink-3 hover:text-ink",
                  )}
                >
                  <d.icon size={14} />
                </button>
              ))}
            </div>
          ) : null}

          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={downloadZip} className="chip group !px-3 !py-1.5 !text-[12.5px]">
              <Ico icon={FiDownload} motion="lift" size={13} /> ZIP
            </button>
            <button onClick={openInTab} className="chip group !px-3 !py-1.5 !text-[12.5px]">
              <Ico icon={FiExternalLink} motion="launch" size={13} /> Open
            </button>
          </div>
        </header>

        {view === "preview" ? (
          <div className="flex-1 overflow-auto bg-sunk p-4">
            <div
              className={cn(
                "mx-auto h-full overflow-hidden rounded-[12px] border border-line bg-white transition-[max-width] duration-300",
                device === "mobile"
                  ? "max-w-[390px]"
                  : device === "tablet"
                    ? "max-w-[768px]"
                    : "max-w-full",
              )}
            >
              <iframe
                title="Website preview"
                srcDoc={preview}
                sandbox="allow-scripts"
                className="h-full w-full"
              />
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            <aside className="w-[190px] shrink-0 overflow-y-auto border-r border-line p-2.5">
              <p className="px-1.5 pb-1.5 text-[10.5px] uppercase tracking-[0.08em] text-ink-4">
                Files
              </p>
              {files.map((f) => (
                <button
                  key={f.path}
                  onClick={() => setOpenFile(f.path)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[7px] px-2 py-1.5 text-left font-mono text-[12px] transition-colors",
                    openFile === f.path
                      ? "bg-hover text-ink"
                      : "text-ink-3 hover:bg-hover hover:text-ink-2",
                  )}
                >
                  <Ico icon={FiFile} motion="lift" size={12} className="shrink-0" />
                  <span className="truncate">{f.path}</span>
                </button>
              ))}
            </aside>

            <div className="relative min-w-0 flex-1 overflow-hidden bg-[#141414]">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(current?.content ?? "");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-[7px] border border-line-strong bg-raised px-2.5 py-1.5 text-[12px] text-ink-2 hover:text-ink"
              >
                {copied ? <Ico icon={FiCheck} motion="check" size={12} className="text-positive" /> : <Ico icon={FiCopy} motion="nudge" size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <pre className="h-full overflow-auto p-4">
                <code className="font-mono text-[12px] leading-[1.7] text-ink-2">
                  {current?.content}
                </code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
