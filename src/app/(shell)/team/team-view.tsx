"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FailureNote } from "@/components/ui/failure-note";
import { FiCheck, FiCopy, FiRotateCcw, FiSquare } from "react-icons/fi";
import { Composer } from "@/components/chat/composer";
import { Recents } from "@/components/ui/recents";
import type { Recent } from "@/lib/recents";
import { Bot, OrbitRing } from "@/components/agents/bot";
import { Message } from "@/components/chat/message";
import { Ico } from "@/components/ui/ico";
import { PageHeader } from "@/components/ui/page-header";
import { useSaved } from "@/lib/use-saved";
import { cn } from "@/lib/utils";

const ROLES = [
  { id: "architect", name: "Product Architect", accent: "#3b82f6", detail: "Scoping the build" },
  { id: "designer", name: "UX Designer", accent: "#a78bfa", detail: "Designing the flow" },
  { id: "engineer", name: "Engineer", accent: "#22d3ee", detail: "Writing the code" },
  { id: "qa", name: "QA Engineer", accent: "#34d399", detail: "Finding what breaks" },
];

const EXAMPLES = [
  "A checkout flow with saved cards",
  "Realtime presence for a docs editor",
  "Rate limiting for a public API",
];

interface Result {
  id: string;
  name: string;
  accent: string;
  text: string;
}

export function TeamView({
  recents = [],
  restored = null,
}: {
  recents?: Recent[];
  /** A finished run, when the URL carries ?c=<id>. */
  restored?: { id: string; task: string; results: string[] } | null;
}) {
  const router = useRouter();
  const { save, reset } = useSaved("team", restored?.id ?? null);

  const [task, setTask] = useState(restored?.task ?? "");
  const [results, setResults] = useState<Result[]>(() =>
    (restored?.results ?? []).map((text, i) => ({
      id: ROLES[i]?.id ?? `role-${i}`,
      name: ROLES[i]?.name ?? "Specialist",
      accent: ROLES[i]?.accent ?? "#3b82f6",
      text,
    })),
  );
  const [active, setActive] = useState<number>(
    restored ? (restored.results?.length ?? 0) : -1,
  );
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // A run is four requests one after another, which is a long time to be stuck
  // watching something you have changed your mind about. Aborting cancels the
  // request in flight and stops the loop before it starts the next one.
  const abort = useRef<AbortController | null>(null);

  async function run(text: string) {
    setTask(text);
    setRunning(true);
    setResults([]);
    setError(null);
    reset();

    const controller = new AbortController();
    abort.current = controller;

    const collected: Result[] = [];

    try {
      // Sequential on purpose: each agent sees what the previous produced.
      for (let i = 0; i < ROLES.length; i++) {
        if (controller.signal.aborted) break;
        setActive(i);
        const role = ROLES[i];

        const res = await fetch("/api/swarm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            task: text,
            role: role.id,
            context: collected.map((r) => `## ${r.name}\n${r.text}`).join("\n\n"),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status}).`);

        const result: Result = {
          id: role.id,
          name: role.name,
          accent: role.accent,
          text: data.text,
        };
        collected.push(result);
        setResults([...collected]);
      }
      setActive(collected.length);

      // Stored as one message per specialist, in the order they ran, so
      // reopening from Recents reads the way it did live. A stopped run is
      // saved too: three specialists' work is worth keeping even when the
      // fourth never started.
      if (collected.length) {
        void save(
          [
            { role: "user", text },
            ...collected.map((r) => ({ role: "model" as const, text: r.text })),
          ],
          text,
        );
        router.refresh();
      }
    } catch (e) {
      // Stopping is a choice, not a failure, and should not raise an error.
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    } finally {
      abort.current = null;
      setRunning(false);
    }
  }

  function stop() {
    abort.current?.abort();
    abort.current = null;
  }

  /** Everything the team produced, as one markdown document. */
  function copyAll() {
    const doc = [
      `# ${task}`,
      ...results.map((r) => `## ${r.name}\n\n${r.text}`),
    ].join("\n\n");
    navigator.clipboard?.writeText(doc);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function startOver() {
    stop();
    setTask("");
    setResults([]);
    setActive(-1);
    setError(null);
    reset();
  }

  const done = !running && results.length === ROLES.length;

  /* ---------------- idle ---------------- */

  if (!task) {
    return (
      <div className="nx-in mx-auto w-full max-w-[860px] px-5 py-8 lg:px-8">
        <PageHeader
          title="AI Team"
          subtitle="Four specialists work one task in order, each building on what the last one produced."
        />

        <div className="mt-6">
          <Composer
            onSend={run}
            placeholder="Assign a task to your AI team…"
            autoFocus
            leading={
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-[12.5px] font-medium text-accent">
                Swarm
              </span>
            }
          />
        </div>

        <div className="mt-6">
          <p className="mb-3 text-[13px] text-ink-3">Try a task</p>
          <div className="flex flex-wrap gap-2.5">
            {EXAMPLES.map((e, i) => (
              <button
                key={e}
                onClick={() => run(e)}
                className="chip nx-in"
                style={{ animationDelay: `${80 + i * 50}ms`, animationFillMode: "backwards" }}
              >
                {e}
              </button>
            ))}
          </div>

          <Recents
            className="mt-9"
            label="Recent tasks"
            items={recents}
            onPick={run}
          />
        </div>

        {/* Who is on the team, and what each of them is for. The order is the
            order they run in, which is the part worth knowing before you
            assign anything. */}
        <div className="mt-10">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-4">
            The team
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r, i) => (
              <div
                key={r.id}
                className="nx-in flex items-center gap-3 rounded-[var(--r-card)] border border-line bg-rail px-3 py-3"
                style={{ animationDelay: `${200 + i * 70}ms`, animationFillMode: "backwards" }}
              >
                <Bot size={38} accent={r.accent} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-ink">
                    {r.name}
                  </span>
                  <span className="block truncate text-[11.5px] text-ink-4">
                    {r.detail}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <FailureNote error={error} onRetry={() => run(task)} className="mt-6" />
        ) : null}
      </div>
    );
  }

  /* ---------------- running / results ---------------- */

  return (
    <div className="mx-auto min-h-screen max-w-[860px] px-5 py-8 lg:px-8">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[12.5px] uppercase tracking-[0.08em] text-ink-4">
            {running
              ? `Working — ${Math.min(active + 1, ROLES.length)} of ${ROLES.length}`
              : "Swarm task"}
          </p>
          <h1 className="text-[20px] font-semibold text-ink">{task}</h1>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {running ? (
            <button
              onClick={stop}
              className="chip group !px-3 !py-1.5 !text-[12.5px]"
              title="Stop after the specialist currently working"
            >
              <FiSquare size={11} className="fill-current text-critical" /> Stop
            </button>
          ) : (
            <>
              <button
                onClick={copyAll}
                disabled={!results.length}
                className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
                title="Copy every specialist's answer as one document"
              >
                {copied ? (
                  <Ico icon={FiCheck} motion="check" size={13} className="text-positive" />
                ) : (
                  <Ico icon={FiCopy} motion="nudge" size={13} />
                )}
                {copied ? "Copied" : "Copy all"}
              </button>
              <button
                onClick={startOver}
                className="chip group !px-3 !py-1.5 !text-[12.5px]"
              >
                <Ico icon={FiRotateCcw} motion="spin" size={13} /> New
              </button>
            </>
          )}
        </div>
      </div>

      {/* the team */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ROLES.map((r, i) => {
          const isDone = results.some((x) => x.id === r.id);
          const isWorking = running && active === i;
          return (
            <div
              key={r.id}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-[var(--r-panel)] border px-3 py-4 text-center transition-all duration-[var(--t-panel)]",
                isWorking
                  ? "border-line-strong bg-raised"
                  : isDone
                    ? "border-line bg-rail"
                    : "border-line bg-rail opacity-45",
              )}
            >
              <div className="relative">
                {isWorking ? <OrbitRing size={62} accent={r.accent} /> : null}
                <Bot
                  size={48}
                  accent={r.accent}
                  state={isDone ? "done" : isWorking ? "working" : "idle"}
                />
              </div>
              <span className="text-[12.5px] font-medium text-ink">{r.name}</span>
              <span
                className={cn("text-[11px] text-ink-4", isWorking && "nx-dots")}
              >
                {isDone ? "Done" : isWorking ? r.detail : "Waiting"}
              </span>
              {isDone ? (
                <FiCheck size={13} className="absolute right-2.5 top-2.5 text-positive" />
              ) : null}
            </div>
          );
        })}
      </div>

      {error ? (
        <FailureNote error={error} onRetry={() => run(task)} className="mb-6" />
      ) : null}

      {/* output */}
      <div className="space-y-5">
        {results.map((r, i) => (
          <section
            key={r.id}
            className="nx-in rounded-[var(--r-panel)] border border-line bg-rail p-5"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
          >
            <div className="mb-3.5 flex items-center gap-2.5">
              <Bot size={30} accent={r.accent} state="done" />
              <h2 className="text-[14.5px] font-semibold text-ink">{r.name}</h2>
            </div>
            <Message role="model" text={r.text} />
          </section>
        ))}
      </div>

      {done ? (
        <div className="nx-in mt-8 flex items-center justify-between rounded-[var(--r-panel)] border border-positive/25 bg-positive/8 px-5 py-4">
          <span className="flex items-center gap-2.5 text-[14px] text-ink">
            <FiCheck size={16} className="text-positive" />
            All four agents finished.
          </span>
          {/* startOver rather than clearing the three pieces of state by
              hand: it also drops the saved-thread id, and without that the
              next run would be written over the one just finished. */}
          <button
            onClick={startOver}
            className="text-[13px] text-ink-3 hover:text-ink"
          >
            New task
          </button>
        </div>
      ) : null}
    </div>
  );
}
