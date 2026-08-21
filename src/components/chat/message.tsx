"use client";

import { useMemo, useState } from "react";
import {
  FiCopy,
  FiCheck,
  FiRefreshCw,
  FiShare2,
  FiThumbsUp,
  FiThumbsDown,
  FiFile,
} from "react-icons/fi";
import { TroveOrb } from "@/components/brand/orb";
import { Ico, type Motion } from "@/components/ui/ico";
import { humanSize, type Attachment } from "@/lib/attachments";
import { highlight, TOKEN_VAR } from "@/lib/highlight";
import { cn } from "@/lib/utils";

/** Minimal markdown: fenced code, inline code, bold, headings, bullets. */
function render(text: string) {
  const out: React.ReactNode[] = [];
  const parts = text.split(/```/);

  parts.forEach((chunk, i) => {
    if (i % 2 === 1) {
      const nl = chunk.indexOf("\n");
      const lang = nl > -1 ? chunk.slice(0, nl).trim() : "";
      const body = nl > -1 ? chunk.slice(nl + 1) : chunk;
      out.push(<CodeBlock key={`c${i}`} lang={lang} code={body.replace(/\n$/, "")} />);
      return;
    }

    chunk
      .split(/\n{2,}/)
      .filter((b) => b.trim())
      .forEach((block, j) => {
        const key = `b${i}-${j}`;
        const lines = block.split("\n");

        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          out.push(
            <ul key={key} className="list-disc space-y-1.5 pl-5">
              {lines.map((l, k) => (
                <li key={k} className="leading-[1.7]">
                  {inline(l.replace(/^\s*[-*]\s+/, ""))}
                </li>
              ))}
            </ul>,
          );
          return;
        }

        const heading = block.match(/^(#{1,3})\s+(.*)$/);
        if (heading) {
          // Every level used to render as the same 16px h3, which flattened
          // documents into one grey wall. Real levels, real scale.
          const level = heading[1].length;
          const body = inline(heading[2]);
          if (level === 1) {
            out.push(
              <h1
                key={key}
                className="text-[27px] font-semibold leading-[1.25] tracking-[-0.015em] text-ink"
              >
                {body}
              </h1>,
            );
          } else if (level === 2) {
            out.push(
              <h2
                key={key}
                className="text-[19px] font-semibold leading-[1.35] tracking-[-0.01em] text-ink"
              >
                {body}
              </h2>,
            );
          } else {
            out.push(
              <h3 key={key} className="text-[15.5px] font-semibold text-ink">
                {body}
              </h3>,
            );
          }
          return;
        }

        out.push(
          <p key={key} className="whitespace-pre-wrap leading-[1.75]">
            {inline(block.trim())}
          </p>,
        );
      });
  });

  return out;
}

function inline(text: string) {
  const nodes: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;

  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      nodes.push(
        <code
          key={k++}
          className="rounded-[5px] border border-line bg-sunk px-1.5 py-0.5 font-mono text-[0.87em] text-accent"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(
        <strong key={k++} className="font-semibold text-ink">
          {tok.slice(2, -2)}
        </strong>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  // Re-tokenising on every keystroke of a streaming reply would be wasteful.
  const tokens = useMemo(() => highlight(code, lang), [code, lang]);

  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-sunk">
      <div className="flex items-center justify-between border-b border-line bg-rail px-3.5 py-2">
        <span className="font-mono text-[11.5px] lowercase tracking-wide text-ink-3">
          {lang || "code"}
        </span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          aria-label="Copy code"
          className="group flex items-center gap-1.5 rounded-[5px] px-1.5 py-1 text-[11.5px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
        >
          {copied ? (
            <Ico icon={FiCheck} motion="check" size={12} className="text-positive" />
          ) : (
            <Ico icon={FiCopy} motion="nudge" size={12} />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3.5 py-3.5">
        <code
          className="font-mono text-[12.5px] leading-[1.7]"
          style={{ color: "var(--sx-plain)" }}
        >
          {tokens.map((t, i) =>
            t.kind === "plain" ? (
              t.text
            ) : (
              <span
                key={i}
                style={{
                  color: TOKEN_VAR[t.kind],
                  fontStyle: t.kind === "comment" ? "italic" : undefined,
                }}
              >
                {t.text}
              </span>
            ),
          )}
        </code>
      </pre>
    </div>
  );
}

function Action({
  icon,
  label,
  motion,
  onClick,
  active,
}: {
  icon: typeof FiCopy;
  label: string;
  motion: Motion;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "group grid h-7 w-7 place-items-center rounded-[6px] transition-colors",
        active ? "text-accent" : "text-ink-4 hover:bg-hover hover:text-ink-2",
      )}
    >
      <Ico icon={icon} motion={motion} size={14} />
    </button>
  );
}

export function Message({
  role,
  text,
  files,
  pending,
  onRegenerate,
}: {
  role: "user" | "model";
  text: string;
  files?: Attachment[];
  pending?: boolean;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  if (role === "user") {
    return (
      <div className="nx-in flex flex-col items-end gap-2">
        {files?.length ? (
          <div className="flex max-w-[85%] flex-wrap justify-end gap-2">
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="flex items-center gap-2 rounded-[8px] border border-line bg-raised py-1.5 pl-1.5 pr-2.5"
              >
                {f.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:${f.mimeType};base64,${f.data}`}
                    alt={f.name}
                    className="h-8 w-8 rounded-[5px] object-cover"
                  />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-[5px] bg-sunk text-ink-3">
                    <Ico icon={FiFile} motion="lift" size={14} />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block max-w-[140px] truncate text-[12px] text-ink">
                    {f.name}
                  </span>
                  <span className="block text-[10.5px] text-ink-4">
                    {humanSize(f.size)}
                  </span>
                </span>
              </span>
            ))}
          </div>
        ) : null}
        {text ? (
          <div className="max-w-[85%] rounded-[12px] rounded-br-[5px] bg-sunk px-4 py-2.5 text-[15px] leading-[1.6] text-ink">
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="nx-in flex gap-3.5">
      {/* The mark orbits while the model is working and settles when it stops,
          so the brand itself is the activity indicator. */}
      <span className={cn("relative mt-0.5 shrink-0", pending && "nx-thinking")}>
        {/* State is passed explicitly rather than as a boolean that defaults
            to on. The previous mark defaulted `animated` to true, so an
            undefined `pending` on a finished message left completed replies
            orbiting forever. */}
        <TroveOrb size={26} state={pending ? "thinking" : "idle"} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="space-y-3.5 text-[15px] text-ink-2">
          {text ? render(text) : null}
          {pending && !text ? (
            /* Before the first token there is nothing to show, and a bare
               blinking caret reads as broken rather than busy. */
            <span className="nx-dots inline-block text-[14.5px] text-ink-3">
              Thinking
            </span>
          ) : null}
          {pending && text ? (
            <span className="inline-block h-[15px] w-[7px] translate-y-[2px] rounded-[1px] bg-ink-3 [animation:nx-blink_1s_step-end_infinite]" />
          ) : null}
        </div>

        {!pending && text ? (
          <div className="mt-3 flex items-center gap-0.5">
            <Action
              icon={copied ? FiCheck : FiCopy}
              label="Copy"
              motion={copied ? "check" : "nudge"}
              onClick={() => {
                navigator.clipboard?.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            />
            {onRegenerate ? (
              <Action icon={FiRefreshCw} label="Regenerate" motion="spin" onClick={onRegenerate} />
            ) : null}
            <Action icon={FiShare2} label="Share" motion="launch" />
            <Action
              icon={FiThumbsUp}
              label="Good response"
              motion="pop"
              active={vote === "up"}
              onClick={() => setVote((v) => (v === "up" ? null : "up"))}
            />
            <Action
              icon={FiThumbsDown}
              label="Bad response"
              motion="shake"
              active={vote === "down"}
              onClick={() => setVote((v) => (v === "down" ? null : "down"))}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
