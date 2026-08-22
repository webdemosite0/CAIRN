"use client";

import { useRef, useState } from "react";
import {
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
import { ModePicker } from "@/components/chat/mode-picker";
import { AttachMenu } from "@/components/chat/attach-menu";
import type { ModeId } from "@/lib/modes";
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
  initialValue = "",
  mode,
  onModeChange,
  placeholder = "Ask anything, or describe what to build…",
  autoFocus = false,
  disabled = false,
  leading,
  allowAttachments = true,
  compact = false,
}: {
  onSend?: (value: string, attachments?: Attachment[]) => void;
  /** Prefills the field. Change it with a key= to refill an existing box. */
  initialValue?: string;
  /** Shown as a picker when supplied; the caller sends it with the request. */
  mode?: ModeId;
  onModeChange?: (id: ModeId) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  leading?: React.ReactNode;
  allowAttachments?: boolean;
  /** Tighter spacing and type, for narrow side panels. */
  compact?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
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
      data-focused={focused}
      className={cn(
        "composer border bg-rail",
        compact ? "rounded-[10px]" : "rounded-[18px] shadow-[var(--sh-2)]",
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
                  {a.kind === "text" ? <Ico icon={FiFileText} motion="lift" size={14} /> : <Ico icon={FiFile} motion="lift" size={14} />}
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
                <Ico icon={FiX} motion="close" size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error || voice.error ? (
        <p className="flex items-center gap-1.5 px-4 pt-3 text-[12.5px] text-critical">
          <Ico icon={FiAlertCircle} motion="alert" size={12} /> {error ?? voice.error}
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
        rows={compact ? 1 : 3}
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
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
            ? "px-3.5 pb-1.5 pt-3 text-[16px] leading-[1.55] sm:text-[13.5px]"
            : "min-h-[84px] px-5 pb-3 pt-5 text-[16px] leading-[1.6]",
        )}
      />

      <div
        className={cn(
          "flex items-center",
          compact ? "gap-1.5 px-2 pb-2" : "gap-2 border-t border-line/70 px-3.5 py-3",
        )}
      >
        {/* Controls are icons, not words.

            "Attach" and "Voice" spelled out took most of the row and said
            nothing a paperclip and a microphone do not. The mode picker keeps
            its label on purpose — it is the one control whose current *value*
            matters before you click it, and an icon cannot say "Balanced". */}
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
            <AttachMenu
              disabled={disabled}
              compact={compact}
              onPick={(accept) => {
                // Set on the shared input rather than rendering four of them,
                // so the picker opens filtered to what was chosen.
                if (picker.current) {
                  if (accept) picker.current.accept = accept;
                  else picker.current.removeAttribute("accept");
                  picker.current.click();
                }
              }}
            />
          </>
        ) : null}

        {mode && onModeChange ? (
          <ModePicker
            value={mode}
            onChange={onModeChange}
            disabled={disabled}
            compact={compact}
          />
        ) : null}

        {leading}

        <span className="flex-1" />

        <button
          onClick={voice.toggle}
          disabled={disabled}
          aria-label={voice.listening ? "Stop dictating" : "Dictate a message"}
          aria-pressed={voice.listening}
          title={voice.listening ? "Listening — click to stop" : "Speak your message"}
          className={cn(
            "group relative grid shrink-0 place-items-center rounded-full transition-colors disabled:opacity-40",
            compact ? "size-7" : "size-9",
            voice.listening
              ? "bg-critical/15 text-critical"
              : "text-ink-3 hover:bg-hover hover:text-ink",
          )}
        >
          {voice.listening ? (
            <span className="nx-pulse absolute inset-0 rounded-full bg-critical/20" />
          ) : null}
          <Ico icon={FiMic} motion="pop" size={compact ? 14 : 17} live={voice.listening} />
        </button>

        <button
          onClick={send}
          disabled={!ready}
          aria-label="Send message"
          className={cn(
            "group grid shrink-0 place-items-center rounded-full transition-all duration-200",
            compact ? "h-8 w-8" : "h-12 w-12",
            ready ? "btn-grad hover:scale-105" : "bg-raised text-ink-4",
          )}
        >
          {disabled ? (
            <Ico icon={FiLoader} motion="spin" size={compact ? 14 : 16} live />
          ) : (
            <Ico icon={FiArrowUp} motion="launch" size={compact ? 15 : 19} />
          )}
        </button>
      </div>
    </div>
  );
}
