"use client";

import * as React from "react";
import { FiArrowUp, FiPlus, FiX } from "react-icons/fi";
import {
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  humanSize,
  readAttachment,
  type Attachment,
} from "@/lib/attachments";
import { ModePicker } from "@/components/chat/mode-picker";
import type { ModeId } from "@/lib/modes";
import { cn } from "@/lib/utils";
import { Ico } from "@/components/ui/ico";

/**
 * The phone composer.
 *
 * A separate component from the desktop one rather than a `compact` prop,
 * because the two disagree about nearly every decision. The desktop box is a
 * card with a labelled toolbar under it; this is a single tall card with one
 * row of controls along the bottom.
 *
 * That row is deliberately three things and no more — attach, mode, send —
 * because it has to survive 320px. The previous version laid the four modes
 * out as chips beside the attach and send buttons, which needed 300px of
 * controls in a 343px card and crushed everything. The mode selector is the
 * shared ModePicker, so the phone and the desktop offer the same four options
 * with the same descriptions rather than two different mode UIs.
 *
 * The field is 16px and not a pixel less. iOS Safari zooms the whole page when
 * a focused input is smaller than that, and it does not zoom back out — the
 * page is left scaled and half off-screen for the rest of the session.
 *
 * Enter inserts a newline; it does not send. On a phone the return key is how
 * you write a second line, and the send button is right there.
 */
export function MobileComposer({
  onSend,
  disabled = false,
  placeholder = "Ask anything, or describe what to build…",
  mode,
  onModeChange,
  autoFocus = false,
  initialValue = "",
}: {
  onSend: (text: string, files?: Attachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
  mode?: ModeId;
  onModeChange?: (id: ModeId) => void;
  autoFocus?: boolean;
  /** Prefills the box — an idea typed before signing in, for instance. */
  initialValue?: string;
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
    el.style.height = `${Math.min(el.scrollHeight, 148)}px`;
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

  const ready = Boolean(value.trim()) && !disabled;

  return (
    <div
      className={cn(
        "composer rounded-[22px] border bg-raised px-1 pb-1 pt-1",
        disabled && "opacity-70",
      )}
    >
      {files.length ? (
        <ul className="flex gap-2 overflow-x-auto px-3 pb-1 pt-2 scrollbar-none">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-sunk py-1 pl-3 pr-1.5"
            >
              <span className="max-w-[140px] truncate text-[12px] text-ink-2">{f.name}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles((list) => list.filter((_, n) => n !== i))}
                className="grid h-5 w-5 place-items-center rounded-full text-ink-4 active:bg-hover"
              >
                <Ico icon={FiX} motion="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="px-3.5 pb-1 pt-2 text-[12.5px] text-critical">{error}</p>
      ) : null}

      <textarea
        ref={box}
        rows={2}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => {
          setValue(e.target.value);
          resize();
        }}
        placeholder={disabled ? "Working…" : placeholder}
        aria-label={placeholder}
        className="block max-h-[148px] min-h-[52px] w-full resize-none bg-transparent px-3.5 pb-1 pt-3 text-[16px] leading-[1.45] text-ink outline-none placeholder:text-ink-4 disabled:cursor-not-allowed"
      />

      {/* Three controls, and no more — this row has to survive 320px. */}
      <div className="flex items-center gap-1 px-1 pb-0.5">
        <label
          className={cn(
            "grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink-3 transition-colors active:bg-hover",
            disabled && "pointer-events-none opacity-40",
          )}
        >
          <Ico icon={FiPlus} motion="grow" size={20} />
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
          <ModePicker value={mode} onChange={onModeChange} disabled={disabled} touch />
        ) : null}

        <span className="flex-1" />

        <button
          type="button"
          onClick={submit}
          disabled={!ready}
          aria-label="Send"
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all duration-200",
            ready
              ? "btn-grad shadow-[0_6px_18px_-6px_var(--btn-glow)] active:scale-95"
              : "bg-sunk text-ink-4",
          )}
        >
          <Ico icon={FiArrowUp} motion="send" size={20} />
        </button>
      </div>
    </div>
  );
}
