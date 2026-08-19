"use client";

import { useState } from "react";
import { FiArrowRight, FiSkipForward } from "react-icons/fi";
import type { Question } from "@/lib/builder";
import { cn } from "@/lib/utils";

/**
 * The few answers worth having before planning starts.
 *
 * Every question is skippable and every one accepts free text, because a
 * required form in front of "make me a website" is a worse experience than a
 * slightly less specific plan. Tapping an option fills the field rather than
 * submitting, so an answer can still be edited afterwards.
 */
export function QuestionBox({
  questions,
  onSubmit,
  onSkip,
  busy,
}: {
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => void;
  onSkip: () => void;
  busy: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const set = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));
  const filled = Object.values(answers).filter((v) => v.trim()).length;

  return (
    <div className="bezel nx-settle overflow-hidden">
      <div className="border-b border-line bg-rail/60 px-4 py-2.5">
        <p className="text-[13px] font-medium text-ink-2">A few quick questions</p>
        <p className="text-[12px] text-ink-4">
          Answer what you like — anything skipped gets a sensible default.
        </p>
      </div>

      <div className="max-h-[46vh] space-y-4 overflow-auto p-4">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className="nx-in"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
          >
            <label
              htmlFor={`q-${q.id}`}
              className="block text-[13.5px] font-medium text-ink"
            >
              {q.label}
            </label>
            {q.hint ? (
              <p className="mt-0.5 text-[12px] text-ink-4">{q.hint}</p>
            ) : null}

            <input
              id={`q-${q.id}`}
              value={answers[q.id] ?? ""}
              onChange={(e) => set(q.id, e.target.value)}
              placeholder={q.options[0] ? `e.g. ${q.options[0]}` : "Your answer"}
              className="mt-2 w-full rounded-[9px] border border-line bg-sunk px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none"
            />

            {q.options.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {q.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => set(q.id, o)}
                    className={cn(
                      "rounded-[7px] border px-2.5 py-1 text-[12px] transition-colors",
                      answers[q.id] === o
                        ? "border-accent bg-accent/10 text-ink"
                        : "border-line text-ink-3 hover:bg-hover hover:text-ink-2",
                    )}
                  >
                    {o}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-line bg-rail/60 p-3">
        <button
          onClick={onSkip}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[13px] text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:opacity-40"
        >
          <FiSkipForward size={13} /> Skip
        </button>
        <span className="flex-1 text-[12px] text-ink-4">
          {filled} of {questions.length} answered
        </span>
        <button
          onClick={() => onSubmit(answers)}
          disabled={busy}
          className="group flex items-center gap-2 rounded-[9px] bg-accent px-4 py-2 text-[13.5px] font-medium text-white shadow-[var(--elev)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
        >
          Plan it
          <FiArrowRight
            size={14}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </button>
      </div>
    </div>
  );
}
