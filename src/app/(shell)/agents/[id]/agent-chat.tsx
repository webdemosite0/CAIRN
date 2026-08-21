"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiPlus } from "react-icons/fi";
import { Bot } from "@/components/agents/bot";
import { Message } from "@/components/chat/message";
import { Composer } from "@/components/chat/composer";
import { Ico } from "@/components/ui/ico";
import { FailureNote } from "@/components/ui/failure-note";
import { strip, type Attachment } from "@/lib/attachments";
import { useSaved } from "@/lib/use-saved";
import type { AgentRow } from "@/app/actions/agents";
import type { Recent } from "@/lib/recents";
import { Recents } from "@/components/ui/recents";

interface Turn {
  id: number;
  role: "user" | "model";
  text: string;
}

/**
 * A full page per agent rather than a modal.
 *
 * The dialog could not be linked to, survived neither a refresh nor the back
 * button, and threw the conversation away on close — so briefing an agent was
 * work you could only do once.
 */
export function AgentChat({
  agent,
  recents,
  restored,
}: {
  agent: AgentRow;
  recents: Recent[];
  restored: { id: string; messages: { role: "user" | "model"; text: string }[] } | null;
}) {
  const router = useRouter();
  const { save, reset } = useSaved("agent", restored?.id ?? null);

  const [turns, setTurns] = useState<Turn[]>(() =>
    (restored?.messages ?? []).map((m, i) => ({ id: i, role: m.role, text: m.text })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const nextId = useRef(restored?.messages.length ?? 0);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, busy]);

  const send = useCallback(
    async (raw: string, attachments?: Attachment[], base?: Turn[]) => {
      const text = raw.trim() || (attachments?.length ? "See the attached files." : "");
      if (!text || busy) return;

      // `base` lets a retry replay from before the failed question instead of
      // from the current thread, which still contains it — appending to that
      // would ask the same thing twice.
      const history = [...(base ?? turns), { id: nextId.current++, role: "user" as const, text }];
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
          const { done, value } = await reader.read();
          if (done) break;
          const piece = decoder.decode(value, { stream: true });
          setTurns((t) =>
            t.map((x) => (x.id === replyId ? { ...x, text: x.text + piece } : x)),
          );
        }

        // Read the finished thread out of state — the reply text only exists
        // once the stream has drained.
        setTurns((t) => {
          void save(
            t.map(({ role, text }) => ({ role, text })),
            `${agent.name}: ${t[0]?.text ?? ""}`,
          );
          return t;
        });
        router.refresh();
      } catch (e) {
        setTurns((t) => t.filter((x) => x.id !== replyId));
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setBusy(false);
      }
    },
    [agent.id, agent.name, busy, router, save, turns],
  );

  /**
   * Runs the last question again after a failure.
   *
   * The failed reply was removed but the question was not, so the replay
   * starts from the turn before it — otherwise the thread would show the same
   * question twice, once for the attempt that failed and once for the retry.
   */
  const retry = useCallback(() => {
    if (busy) return;
    let i = -1;
    for (let n = turns.length - 1; n >= 0; n--) {
      if (turns[n].role === "user") {
        i = n;
        break;
      }
    }
    if (i < 0) return;
    void send(turns[i].text, undefined, turns.slice(0, i));
  }, [busy, send, turns]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 px-5 py-3 backdrop-blur-md lg:px-8">
        <div className="mx-auto flex max-w-[820px] items-center gap-3">
          <Link
            href="/agents"
            aria-label="Back to agents"
            className="group grid h-8 w-8 shrink-0 place-items-center rounded-[6px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            <Ico icon={FiArrowLeft} motion="nudge" size={17} />
          </Link>

          <Bot size={36} accent={agent.accent} state={busy ? "working" : "idle"} />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold text-ink">{agent.name}</h1>
            <p className="truncate text-[12.5px]" style={{ color: agent.accent }}>
              {busy ? "Working…" : agent.role}
            </p>
          </div>

          {turns.length > 0 ? (
            <button
              onClick={() => {
                setTurns([]);
                setError(null);
                reset();
                nextId.current = 0;
              }}
              className="chip group shrink-0 !px-3 !py-1.5 !text-[12.5px]"
            >
              <Ico icon={FiPlus} motion="open" size={13} /> New
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex-1 px-5 pb-8 pt-7 lg:px-8">
        <div className="mx-auto max-w-[820px] space-y-7">
          {turns.length === 0 ? (
            <div className="py-8 text-center">
              <Bot size={64} accent={agent.accent} />
              <h2 className="mt-5 text-[16px] font-semibold text-ink">
                Brief {agent.name.split(" ")[0]}
              </h2>
              <p className="mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-3">
                {agent.instructions}
              </p>
              <Recents
                className="mx-auto mt-9 max-w-[520px] text-left"
                label={`Earlier with ${agent.name.split(" ")[0]}`}
                items={recents}
              />
            </div>
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

          {error ? <FailureNote error={error} onRetry={retry} /> : null}

          <div ref={bottom} />
        </div>
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-canvas via-canvas to-transparent px-5 pb-5 pt-3 lg:px-8">
        <div className="mx-auto max-w-[820px]">
          <Composer
            onSend={send}
            disabled={busy}
            placeholder={`Message ${agent.name}…`}
          />
        </div>
      </div>
    </div>
  );
}
