"use client";

import { useRef, useState } from "react";
import {
  FiPaperclip,
  FiArrowUp,
  FiLoader,
  FiX,
  FiFile,
  FiFileText,
  FiAlertCircle,
  FiMic,
} from "react-icons/fi";
import { Ico } from "@/components/ui/ico";
import { useVoice } from "@/components/chat/use-voice";
import {
  MAX_FILES,
  MAX_TOTAL_BYTES,
  humanSize,
  readAttachment,
  type Attachment,
} from "@/lib/attachments";
import { cn } from "@/lib/utils";

export function Composer({
  onSend,
  placeholder = "Ask anything, or describe what to build…",
  autoFocus = false,
  disabled = false,
  leading,
  allowAttachments = true,
  compact = false,
}: {
  onSend?: (value: string, attachments?: Attachment[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  leading?: React.ReactNode;
  allowAttachments?: boolean;
  /** Tighter spacing and type, for narrow side panels. */
  compact?: boolean;
}) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const voice = useVoice((text) =>
    setValue((v) => (v ? `${v} ${text}` : text)),
  );

  const ready = (value.trim().length > 0 || files.length > 0) && !disabled;

  function grow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }

  async function add(list: FileList | File[]) {
    setError(null);
    const incoming = Array.from(list);

    if (files.length + incoming.length > MAX_FILES) {
      setError(`You can attach up to ${MAX_FILES} files at a time.`);
      return;
    }

    const next: Attachment[] = [];
    for (const f of incoming) {
      try {
        next.push(await readAttachment(f));
      } catch (e) {
        setError(e instanceof Error ? e.message : `Could not read ${f.name}.`);
        return;
      }
    }

    const total = [...files, ...next].reduce((s, a) => s + a.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      setError(`That is over the ${humanSize(MAX_TOTAL_BYTES)} total limit.`);
      return;
    }

    setFiles((f) => [...f, ...next]);
  }

  function remove(i: number) {
    setFiles((f) => {
      const a = f[i];
      if (a?.preview) URL.revokeObjectURL(a.preview);
      return f.filter((_, n) => n !== i);
    });
  }

  function send() {
    if (!ready) return;
    onSend?.(value.trim(), files.length ? files : undefined);
    files.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
    setValue("");
    setFiles([]);
    setError(null);
    if (ref.current) ref.current.style.height = "auto";
  }

  return (
    <div
      onDragOver={(e) => {
        if (!allowAttachments || disabled) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (!allowAttachments || disabled) return;
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) void add(e.dataTransfer.files);
      }}
      data-dragging={dragging}
      data-disabled={disabled}
      className={cn(
        "composer border bg-rail",
        compact ? "rounded-[10px]" : "rounded-[12px]",
      )}
    >
      {/* attached files */}
      {files.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-3.5 pt-3.5">
          {files.map((a, i) => (
            <div
              key={`${a.name}-${i}`}
              className="nx-in group relative flex items-center gap-2 rounded-[8px] border border-line bg-raised py-1.5 pl-1.5 pr-7"
            >
              {a.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.preview}
                  alt={a.name}
                  className="h-8 w-8 rounded-[5px] object-cover"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-[5px] bg-sunk text-ink-3">
                  {a.kind === "text" ? <FiFileText size={14} /> : <FiFile size={14} />}
                </span>
              )}
              <span className="min-w-0">
                <span className="block max-w-[150px] truncate text-[12.5px] text-ink">
                  {a.name}
                </span>
                <span className="block text-[11px] text-ink-4">
                  {a.kind === "other" ? "not readable" : humanSize(a.size)}
                </span>
              </span>
              <button
                onClick={() => remove(i)}
                aria-label={`Remove ${a.name}`}
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-[5px] text-ink-4 transition-colors hover:bg-hover hover:text-ink"
              >
                <FiX size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error || voice.error ? (
        <p className="flex items-center gap-1.5 px-4 pt-3 text-[12.5px] text-critical">
          <FiAlertCircle size={12} /> {error ?? voice.error}
        </p>
      ) : null}

      {voice.listening ? (
        <p className="flex items-center gap-2 px-5 pt-3 text-[12.5px] text-critical">
          <span className="nx-pulse h-2 w-2 rounded-full bg-critical" />
          Listening — speak now
        </p>
      ) : null}

      <textarea
        ref={ref}
        rows={compact ? 1 : 2}
        value={value}
        autoFocus={autoFocus}
        disabled={disabled}
        onChange={(e) => {
          setValue(e.target.value);
          grow(e.target);
        }}
        onPaste={(e) => {
          if (!allowAttachments) return;
          const pasted = Array.from(e.clipboardData.files);
          if (pasted.length) {
            e.preventDefault();
            void add(pasted);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={
          dragging ? "Drop files here…" : disabled ? "Working…" : placeholder
        }
        aria-label={placeholder}
        className={cn(
          "block max-h-[220px] w-full resize-none bg-transparent text-ink outline-none placeholder:text-ink-4 disabled:cursor-not-allowed",
          compact
            ? "px-3.5 pb-1.5 pt-3 text-[13.5px] leading-[1.55]"
            : "px-5 pb-3 pt-4 text-[15.5px] leading-[1.6]",
        )}
      />

      <div
        className={cn(
          "flex items-center gap-1.5",
          compact ? "px-2 pb-2" : "gap-2 px-3.5 pb-3.5",
        )}
      >
        {allowAttachments ? (
          <>
            <input
              ref={picker}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) void add(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => picker.current?.click()}
              disabled={disabled}
              aria-label="Attach files"
              title="Attach images, PDFs, text or code"
              className={cn(
                "group grid shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:opacity-40",
                compact ? "h-7 w-7" : "h-8 w-8",
              )}
            >
              <Ico icon={FiPaperclip} motion="nudge" size={compact ? 15 : 17} />
            </button>
          </>
        ) : null}

        <button
            onClick={voice.toggle}
            disabled={disabled}
            aria-label={voice.listening ? "Stop dictating" : "Dictate a message"}
            aria-pressed={voice.listening}
            title={voice.listening ? "Listening — click to stop" : "Speak your message"}
            className={cn(
              "group relative grid shrink-0 place-items-center rounded-full transition-colors disabled:opacity-40",
              compact ? "h-7 w-7" : "h-8 w-8",
              voice.listening
                ? "bg-critical/15 text-critical"
                : "text-ink-3 hover:bg-hover hover:text-ink",
            )}
          >
            {voice.listening ? (
              <span className="nx-pulse absolute inset-0 rounded-full bg-critical/20" />
            ) : null}
          <Ico icon={FiMic} motion="pop" size={compact ? 14 : 16} live={voice.listening} />
        </button>

        {leading}

        <button
          onClick={send}
          disabled={!ready}
          aria-label="Send message"
          className={cn(
            "group ml-auto grid shrink-0 place-items-center rounded-full transition-all duration-200",
            compact ? "h-8 w-8" : "h-9 w-9",
            ready ? "bg-ink text-canvas hover:scale-105" : "bg-raised text-ink-4",
          )}
        >
          {disabled ? (
            <Ico icon={FiLoader} motion="spin" size={compact ? 14 : 16} live />
          ) : (
            <Ico icon={FiArrowUp} motion="launch" size={compact ? 15 : 17} />
          )}
        </button>
      </div>
    </div>
  );
}
