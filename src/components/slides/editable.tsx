"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Text you edit where it sits, rather than in a form beside it.
 *
 * contentEditable rather than an auto-sizing input, because a slide's type is
 * set in container units (cqw) and wraps across several lines. An input cannot
 * do either, and a textarea shadowing the real layout is two things to keep in
 * sync — the usual result being a caret that sits a few pixels off the glyphs.
 *
 * The React problem with contentEditable is that React wants to own the DOM
 * text and the browser is already writing to it. Re-rendering during a
 * keystroke moves the caret to the start, which makes typing impossible after
 * the first character. So:
 *
 *   - the element is uncontrolled while focused; the parent's value is only
 *     written back in when it differs AND the element is not being typed in
 *   - onInput reports upward, it never re-renders this element mid-word
 *
 * Paste is intercepted and flattened. A slide that silently accepts pasted
 * markup will export to PowerPoint carrying it, and the first anyone knows is
 * a bold span in the middle of a bullet.
 */
export function Editable({
  value,
  onChange,
  onEnter,
  onEmptyBackspace,
  placeholder,
  className,
  ariaLabel,
  singleLine = true,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Enter without shift — usually "make the next bullet". */
  onEnter?: () => void;
  /** Backspace in an already-empty field — usually "remove this bullet". */
  onEmptyBackspace?: () => void;
  placeholder?: string;
  className?: string;
  ariaLabel: string;
  singleLine?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const typing = useRef(false);

  // Only writes when the value genuinely diverged — a parent re-render with
  // the same text must not touch the DOM, or the caret jumps.
  useEffect(() => {
    const el = ref.current;
    if (!el || typing.current) return;
    if (el.textContent !== value) el.textContent = value;
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline={!singleLine}
      tabIndex={0}
      data-placeholder={placeholder}
      onFocus={() => (typing.current = true)}
      onBlur={(e) => {
        typing.current = false;
        // Normalise on the way out: collapse the whitespace a browser leaves
        // behind after a paste or a deletion.
        const text = (e.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim();
        if (text !== value) onChange(text);
        e.currentTarget.textContent = text;
      }}
      onInput={(e) => onChange(e.currentTarget.textContent ?? "")}
      onPaste={(e) => {
        // Plain text only. See above.
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain").replace(/\s+/g, " ");
        document.execCommand("insertText", false, text);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && singleLine) {
          e.preventDefault();
          onEnter?.();
        }
        if (
          e.key === "Backspace" &&
          onEmptyBackspace &&
          !(e.currentTarget.textContent ?? "").length
        ) {
          e.preventDefault();
          onEmptyBackspace();
        }
      }}
      className={cn(
        "cursor-text rounded-[4px] outline-none",
        // The affordance: nothing until you go near it, then just enough to
        // say this is a field. A permanent border would turn a slide into a
        // form, and the point is that it still looks like a slide.
        "transition-[background-color,box-shadow] duration-150",
        "hover:bg-accent/[0.06]",
        "focus:bg-accent/[0.08] focus:shadow-[0_0_0_2px_var(--color-accent)]",
        "empty:before:pointer-events-none empty:before:text-ink-4 empty:before:content-[attr(data-placeholder)]",
        className,
      )}
    />
  );
}
