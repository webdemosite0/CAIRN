"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiPlus, FiTrash2, FiX, FiAlertCircle, FiLoader } from "react-icons/fi";
import { Bot } from "@/components/agents/bot";
import { Message } from "@/components/chat/message";
import { Composer } from "@/components/chat/composer";
import { strip, type Attachment } from "@/lib/attachments";
import {
  createAgent,
  deleteAgent,
  type AgentFormState,
  type AgentRow,
} from "@/app/actions/agents";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

const ACCENTS = ["#3b82f6", "#a78bfa", "#22d3ee", "#34d399", "#fbbf24", "#f87171"];

const TOOLS = [
  "Read repository",
  "Write code",
  "Run tests",
  "Query database",
  "Search the web",
  "Send email",
  "Deploy",
];

const field =
  "w-full rounded-[10px] border border-line-strong bg-sunk px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-accent";

/* ------------------------------------------------------------------ */

export function AgentsView({
  agents,
  signedIn,
}: {
  agents: AgentRow[];
  signedIn: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [chatting, setChatting] = useState<AgentRow | null>(null);

  if (!signedIn) {
    return (
      <div className="nx-in mx-auto flex min-h-screen max-w-[520px] flex-col items-center justify-center px-5 text-center">
        <Bot size={72} state="idle" />
        <h1 className="mt-6 text-[22px] font-semibold text-ink">Agent Builder</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-3">
          Build specialist agents with their own role, instructions and tools —
          then put them to work. Log in to create your first one.
        </p>
        <Link
          href="/login"
          className="mt-7 rounded-[10px] bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-transform hover:scale-105"
        >
          Log in to continue
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1080px] px-5 py-8 lg:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-ink">Agent Builder</h1>
          <p className="mt-1 text-[13.5px] text-ink-3">
            {agents.length === 0
              ? "No agents yet."
              : `${agents.length} agent${agents.length === 1 ? "" : "s"} ready.`}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2.5 text-[14px] font-medium text-white transition-transform hover:scale-[1.03]"
        >
          <Ico icon={FiPlus} motion="open" size={16} /> New agent
        </button>
      </div>

      {agents.length === 0 ? (
        <div className="nx-in flex flex-col items-center rounded-[16px] border border-dashed border-line-strong px-6 py-20 text-center">
          <Bot size={64} />
          <h2 className="mt-5 text-[16px] font-semibold text-ink">
            Build your first agent
          </h2>
          <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-3">
            Give it a role and clear instructions. It becomes a specialist you
            can brief and talk to.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a, i) => (
            <article
              key={a.id}
              className="nx-in group relative flex flex-col rounded-[14px] border border-line bg-rail p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
            >
              <form
                action={deleteAgent.bind(null, a.id)}
                className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <button
                  aria-label={`Delete ${a.name}`}
                  className="grid h-7 w-7 place-items-center rounded-[7px] text-ink-4 hover:bg-hover hover:text-critical"
                >
                  <Ico icon={FiTrash2} motion="shake" size={13} />
                </button>
              </form>

              <Bot size={48} accent={a.accent} />
              <h3 className="mt-3.5 text-[15px] font-semibold text-ink">{a.name}</h3>
              <p className="text-[12.5px]" style={{ color: a.accent }}>
                {a.role}
              </p>
              <p className="mt-2.5 line-clamp-3 flex-1 text-[13px] leading-relaxed text-ink-3">
                {a.instructions}
              </p>

              <button
                onClick={() => setChatting(a)}
                className="mt-4 w-full rounded-[9px] border border-line-strong py-2 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
              >
                Talk to {a.name.split(" ")[0]}
              </button>
            </article>
          ))}
        </div>
      )}

      {creating ? <CreateDialog onClose={() => setCreating(false)} /> : null}
      {chatting ? (
        <ChatDialog agent={chatting} onClose={() => setChatting(null)} />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CreateDialog({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState<AgentFormState, FormData>(
    createAgent,
    {},
  );
  const [accent, setAccent] = useState(ACCENTS[0]);
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    // The list lives in a server component — pull the fresh data before closing.
    router.refresh();
    onClose();
  }, [state.ok, onClose, router]);

  return (
    <Shell onClose={onClose} title="New agent">
      <form action={action} className="space-y-4">
        <div className="flex items-center gap-4">
          <Bot size={56} accent={accent} state="idle" />
          <div className="flex flex-wrap gap-1.5">
            {ACCENTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAccent(c)}
                aria-label={`Accent ${c}`}
                className={cn(
                  "h-6 w-6 rounded-full transition-transform",
                  accent === c ? "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-rail" : "",
                )}
                style={{ background: c }}
              />
            ))}
          </div>
          <input type="hidden" name="accent" value={accent} />
        </div>

        <input className={field} name="name" placeholder="Name — e.g. Backend Engineer" required />
        <input className={field} name="role" placeholder="Role — e.g. APIs and data model" required />
        <textarea
          className={cn(field, "min-h-[120px] resize-none leading-relaxed")}
          name="instructions"
          placeholder="Instructions. Be specific: what it owns, how it should decide, what it must never do."
          required
        />

        <div>
          <p className="mb-2 text-[12.5px] text-ink-3">Capabilities</p>
          <div className="flex flex-wrap gap-1.5">
            {TOOLS.map((t) => (
              <label
                key={t}
                className="cursor-pointer rounded-full border border-line-strong px-3 py-1.5 text-[12.5px] text-ink-3 transition-colors has-checked:border-accent has-checked:bg-accent-soft has-checked:text-accent hover:text-ink"
              >
                <input type="checkbox" name="tools" value={t} className="sr-only" />
                {t}
              </label>
            ))}
          </div>
        </div>

        {state.error ? (
          <div className="flex items-start gap-2 rounded-[9px] border border-critical/30 bg-critical/10 px-3 py-2.5">
            <Ico icon={FiAlertCircle} motion="pop" size={14} className="mt-0.5 shrink-0 text-critical" />
            <p className="text-[13px] text-critical">{state.error}</p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[9px] px-4 py-2.5 text-[14px] text-ink-3 hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 rounded-[9px] bg-accent px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-60"
          >
            {pending ? <Ico icon={FiLoader} motion="spin" size={15} className="animate-spin" /> : null}
            Create agent
          </button>
        </div>
      </form>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */

interface Turn {
  id: number;
  role: "user" | "model";
  text: string;
}

function ChatDialog({
  agent,
  onClose,
}: {
  agent: AgentRow;
  onClose: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns]);

  async function send(raw: string, attachments?: Attachment[]) {
    const text = raw.trim() || (attachments?.length ? "See the attached files." : "");
    if (!text || busy) return;
    const history = [...turns, { id: nextId.current++, role: "user" as const, text }];
    setTurns(history);
    setBusy(true);
    setError(null);

    const replyId = nextId.current++;
    setTurns((t) => [...t, { id: replyId, role: "model", text: "" }]);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          messages: history.map(({ role, text }) => ({ role, text })),
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
        const piece = decoder.decode(chunk, { stream: true });
        setTurns((t) =>
          t.map((x) => (x.id === replyId ? { ...x, text: x.text + piece } : x)),
        );
      }
    } catch (e) {
      setTurns((t) => t.filter((x) => x.id !== replyId));
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell onClose={onClose} title="" wide>
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <Bot size={42} accent={agent.accent} state={busy ? "working" : "idle"} />
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">{agent.name}</h2>
          <p className="truncate text-[12.5px]" style={{ color: agent.accent }}>
            {busy ? "Working…" : agent.role}
          </p>
        </div>
      </div>

      <div className="max-h-[46vh] min-h-[220px] space-y-5 overflow-y-auto py-5">
        {turns.length === 0 ? (
          <p className="py-10 text-center text-[13.5px] text-ink-4">
            Brief {agent.name.split(" ")[0]} on what you need.
          </p>
        ) : (
          turns.map((t, i) => (
            <Message
              key={t.id}
              role={t.role}
              text={t.text}
              pending={busy && i === turns.length - 1 && t.role === "model"}
            />
          ))
        )}
        {error ? (
          <div className="flex items-start gap-2 rounded-[9px] border border-critical/30 bg-critical/10 px-3 py-2.5">
            <Ico icon={FiAlertCircle} motion="pop" size={14} className="mt-0.5 shrink-0 text-critical" />
            <p className="text-[13px] text-critical">{error}</p>
          </div>
        ) : null}
        <div ref={bottom} />
      </div>

      <div className="border-t border-line pt-4">
        <Composer
          compact
          onSend={send}
          disabled={busy}
          placeholder={`Message ${agent.name}…`}
        />
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */

function Shell({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || "Agent"}
        className={cn(
          "nx-in relative max-h-[90vh] w-full overflow-y-auto rounded-[16px] border border-line-strong bg-rail p-6 shadow-[0_30px_90px_rgba(0,0,0,0.8)]",
          wide ? "max-w-[660px]" : "max-w-[540px]",
        )}
      >
        {title ? (
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-[8px] text-ink-3 hover:bg-hover hover:text-ink"
            >
              <Ico icon={FiX} motion="shake" size={17} />
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-[8px] text-ink-3 hover:bg-hover hover:text-ink"
          >
            <Ico icon={FiX} motion="shake" size={17} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
