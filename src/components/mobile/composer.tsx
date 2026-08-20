"use client";

import * as React from "react";
import { FiArrowUp, FiPaperclip, FiX } from "react-icons/fi";
import {
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  humanSize,
  readAttachment,
  type Attachment,
} from "@/lib/attachments";
import { MODE_LIST, type ModeId } from "@/lib/modes";
import { cn } from "@/lib/utils";

/**
 * The phone composer.
 *
 * A separate component from the desktop one rather than a `compact` prop,
 * because the two disagree about nearly every decision. The desktop box is a
 * card with a labelled toolbar under it; this is a single rounded bar with
 * icon-only controls, sized so the send button lands under a thumb.
 *
 * The field is 16px and not a pixel less. iOS Safari zooms the whole page when
 * a focused input is smaller than that, and it does not zoom back out — the
 * page is left scaled and half off-screen for the rest of the session.
 *
 * Enter inserts a newline here; it does not send. On a phone the return key is
 * how you write a second line, and there is a send button right there.
 */
export function MobileComposer({
  onSend,
  disabled = false,
  placeholder = "Ask anything, or describe what to build…",
  mode,
  onModeChange,
  initialValue = "",
  autoFocus = false,
}: {
  onSend: (text: string, files?: Attachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
  mode?: ModeId;
  onModeChange?: (id: ModeId) => void;
  initialValue?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = React.useState(initialValue);
  const [files, setFiles] = React.useState<Attachment[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const box = React.useRef<HTMLTextAreaElement>(null);

  // Grow with the content, up to a cap. Measured from scrollHeight after a
  // reset, because a textarea never shrinks on its own.
  const resize = React.useCallback(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, []);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text, files.length ? files : undefined);
    setValue("");
    setFiles([]);
    setError(null);
    requestAnimationFrame(resize);
  };

  const pick = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);

    const room = MAX_FILES - files.length;
    if (room <= 0) {
      setError(`Up to ${MAX_FILES} files.`);
      return;
    }

    const next: Attachment[] = [];
    let total = files.reduce((n, f) => n + f.size, 0);

    for (const file of Array.from(list).slice(0, room)) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name} is over ${humanSize(MAX_FILE_BYTES)}.`);
        continue;
      }
      if (total + file.size > MAX_TOTAL_BYTES) {
        setError(`That is more than ${humanSize(MAX_TOTAL_BYTES)} in total.`);
        break;
      }
      try {
        next.push(await readAttachment(file));
        total += file.size;
      } catch {
        setError(`Could not read ${file.name}.`);
      }
    }

    if (next.length) setFiles((f) => [...f, ...next]);
  };

  return (
    <div className="rounded-[20px] border border-line bg-raised p-2 shadow-[var(--elev)]">
      {files.length ? (
        <ul className="flex gap-2 overflow-x-auto px-1 pb-2 pt-1 scrollbar-none">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-sunk py-1 pl-2.5 pr-1.5"
            >
              <span className="max-w-[120px] truncate text-[12px] text-ink">{f.name}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles((list) => list.filter((_, n) => n !== i))}
                className="grid h-5 w-5 place-items-center rounded-full text-ink-4 active:bg-hover"
              >
                <FiX size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="px-2 pb-1.5 pt-0.5 text-[12.5px] text-critical">{error}</p>
      ) : null}

      <textarea
        ref={box}
        rows={1}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => {
          setValue(e.target.value);
          resize();
        }}
        placeholder={disabled ? "Working…" : placeholder}
        aria-label={placeholder}
        className="block max-h-[132px] w-full resize-none bg-transparent px-3 pb-1.5 pt-2 text-[16px] leading-[1.5] text-ink outline-none placeholder:text-ink-4 disabled:opacity-60"
      />

      <div className="flex items-center gap-1 pl-1 pt-1">
        <label
          className={cn(
            "grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-ink-3 active:bg-hover",
            disabled && "pointer-events-none opacity-40",
          )}
        >
          <FiPaperclip size={18} />
          <span className="sr-only">Attach files</span>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              void pick(e.target.files);
              e.target.value = "";
            }}
          />
        </label>

        {mode && onModeChange ? (
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-none">
            {MODE_LIST.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onModeChange(m.id)}
                aria-pressed={mode === m.id}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  mode === m.id
                    ? "bg-accent-soft text-accent"
                    : "text-ink-4 active:bg-hover",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="flex-1" />
        )}

        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full btn-grad transition-opacity active:scale-95 disabled:opacity-35"
        >
          <FiArrowUp size={20} />
        </button>
      </div>
    </div>
  );
}
