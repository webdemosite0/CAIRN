"use client";

import { useState } from "react";
import { FiCheck, FiAlertCircle } from "react-icons/fi";
import { Composer } from "@/components/chat/composer";
import { Recents } from "@/components/ui/recents";
import type { Recent } from "@/lib/recents";
import { Bot, OrbitRing } from "@/components/agents/bot";
import { Message } from "@/components/chat/message";
import { Wordmark } from "@/components/brand/logo";
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

export function TeamView({ recents = [] }: { recents?: Recent[] }) {
  const [task, setTask] = useState("");
  const [active, setActive] = useState<number>(-1);
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(text: string) {
    setTask(text);
    setRunning(true);
    setResults([]);
    setError(null);

    const collected: Result[] = [];

    try {
      // Sequential on purpose: each agent sees what the previous produced.
      for (let i = 0; i < ROLES.length; i++) {
        setActive(i);
        const role = ROLES[i];

        const res = await fetch("/api/swarm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
      setActive(ROLES.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  const done = !running && results.length === ROLES.length;

  /* ---------------- idle ---------------- */

  if (!task) {
    return (
      <div className="nx-in mx-auto flex min-h-screen max-w-[820px] flex-col justify-center px-5 py-16">
        <Wordmark className="mb-8 text-center" size={54} />

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

        <div className="mt-8">
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

        <div className="mt-12 flex justify-center gap-10">
          {ROLES.map((r, i) => (
            <div
              key={r.id}
              className="nx-in flex flex-col items-center gap-2"
              style={{ animationDelay: `${200 + i * 70}ms`, animationFillMode: "backwards" }}
            >
              <Bot size={46} accent={r.accent} />
              <span className="text-[11.5px] text-ink-4">{r.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------------- running / results ---------------- */

  return (
    <div className="mx-auto min-h-screen max-w-[860px] px-5 py-8 lg:px-8">
      <div className="mb-7">
        <p className="mb-1 text-[12.5px] uppercase tracking-[0.08em] text-ink-4">
          Swarm task
        </p>
        <h1 className="text-[20px] font-semibold text-ink">{task}</h1>
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
                "relative flex flex-col items-center gap-2 rounded-[10px] border px-3 py-4 text-center transition-all duration-300",
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
        <div className="mb-6 flex items-start gap-2 rounded-[8px] border border-critical/30 bg-critical/10 px-4 py-3">
          <FiAlertCircle size={15} className="mt-0.5 shrink-0 text-critical" />
          <div>
            <p className="text-[13.5px] text-ink-2">{error}</p>
            <button
              onClick={() => run(task)}
              className="mt-1.5 text-[12.5px] text-critical hover:underline"
            >
              Run again
            </button>
          </div>
        </div>
      ) : null}

      {/* output */}
      <div className="space-y-5">
        {results.map((r, i) => (
          <section
            key={r.id}
            className="nx-in rounded-[10px] border border-line bg-rail p-5"
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
        <div className="nx-in mt-8 flex items-center justify-between rounded-[10px] border border-positive/25 bg-positive/8 px-5 py-4">
          <span className="flex items-center gap-2.5 text-[14px] text-ink">
            <FiCheck size={16} className="text-positive" />
            All four agents finished.
          </span>
          <button
            onClick={() => {
              setTask("");
              setResults([]);
              setActive(-1);
            }}
            className="text-[13px] text-ink-3 hover:text-ink"
          >
            New task
          </button>
        </div>
      ) : null}
    </div>
  );
}
