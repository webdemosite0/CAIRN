"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiPlus, FiTrash2, FiX, FiAlertCircle, FiLoader } from "react-icons/fi";
import { Bot } from "@/components/agents/bot";
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
  "w-full rounded-[8px] border border-line-strong bg-sunk px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-accent";

/* ------------------------------------------------------------------ */

export function AgentsView({
  agents,
  signedIn,
}: {
  agents: AgentRow[];
  signedIn: boolean;
}) {
  const [creating, setCreating] = useState(false);

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
          className="mt-7 rounded-[8px] btn-grad px-5 py-2.5 text-[14px] font-medium transition-transform hover:scale-105"
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
          className="flex items-center gap-2 rounded-[8px] btn-grad px-4 py-2.5 text-[14px] font-medium transition-transform hover:scale-[1.03]"
        >
          <Ico icon={FiPlus} motion="open" size={16} /> New agent
        </button>
      </div>

      {agents.length === 0 ? (
        <div className="nx-in flex flex-col items-center rounded-[12px] border border-dashed border-line-strong px-6 py-20 text-center">
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
              className="nx-in group relative flex flex-col rounded-[10px] border border-line bg-rail p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
            >
              <form
                action={deleteAgent.bind(null, a.id)}
                className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <button
                  aria-label={`Delete ${a.name}`}
                  className="grid h-7 w-7 place-items-center rounded-[6px] text-ink-4 hover:bg-hover hover:text-critical"
                >
                  <Ico icon={FiTrash2} motion="shake" size={13} />
                </button>
              </form>

              <Bot size={48} accent={a.accent} />
              <h3 className="mt-3.5 text-[15px] font-semibold text-ink">{a.name}</h3>
              {/* The agent's colour identifies it on the avatar and the dot,
                  but never sets text. It is chosen from a palette picked for
                  looking distinct against each other, not for carrying 4.5:1
                  as body copy — the default blue measured 3.4:1 here. */}
              <p className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: a.accent }}
                />
                {a.role}
              </p>
              <p className="mt-2.5 line-clamp-3 flex-1 text-[13px] leading-relaxed text-ink-3">
                {a.instructions}
              </p>

              <Link
                href={`/agents/${a.id}`}
                className="mt-4 block w-full rounded-[8px] border border-line-strong py-2 text-center text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
              >
                Talk to {a.name.split(" ")[0]}
              </Link>
            </article>
          ))}
        </div>
      )}

      {creating ? <CreateDialog onClose={() => setCreating(false)} /> : null}
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
          <div className="flex items-start gap-2 rounded-[8px] border border-critical/30 bg-critical/10 px-3 py-2.5">
            <Ico icon={FiAlertCircle} motion="pop" size={14} className="mt-0.5 shrink-0 text-critical" />
            <p className="text-[13px] text-critical">{state.error}</p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] px-4 py-2.5 text-[14px] text-ink-3 hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 rounded-[8px] btn-grad px-4 py-2.5 text-[14px] font-medium disabled:opacity-60"
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
          "nx-in relative max-h-[90vh] w-full overflow-y-auto rounded-[12px] border border-line-strong bg-rail p-6 shadow-[0_30px_90px_rgba(0,0,0,0.8)]",
          wide ? "max-w-[660px]" : "max-w-[540px]",
        )}
      >
        {title ? (
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-[6px] text-ink-3 hover:bg-hover hover:text-ink"
            >
              <Ico icon={FiX} motion="shake" size={17} />
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-[6px] text-ink-3 hover:bg-hover hover:text-ink"
          >
            <Ico icon={FiX} motion="shake" size={17} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
