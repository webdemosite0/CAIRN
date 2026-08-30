"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FiMoreHorizontal, FiEdit2, FiTrash2, FiLoader } from "react-icons/fi";

import { deleteSaved, renameSaved } from "@/app/actions/library";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

/**
 * Rename or delete one saved item.
 *
 * Delete asks twice. Everything in this list took a model call and some
 * waiting to produce, and there is no undo behind it — a single mis-click
 * costing someone a document they spent ten minutes on is not a trade worth
 * making for one saved keystroke.
 */
export function SavedMenu({
  id,
  title,
  className,
}: {
  /** The conversation id, not the strip row's. */
  id: string;
  title: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    // Reset the two-step, or reopening the menu would show a Delete button
    // already armed from last time.
    setConfirming(false);
    setRenaming(false);
    setError(null);
    trigger.current?.focus();
  }

  function submitRename() {
    const next = draft.trim();
    if (!next || next === title) {
      close();
      return;
    }
    start(async () => {
      const res = await renameSaved(id, next);
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setRenaming(false);
      router.refresh();
    });
  }

  function submitDelete() {
    start(async () => {
      const res = await deleteSaved(id);
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div ref={wrap} className={cn("relative shrink-0", className)}>
      <button
        ref={trigger}
        type="button"
        aria-label={`Options for ${title}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          // The row is a link; opening its menu is not following it.
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cn(
          "grid h-7 w-7 place-items-center rounded-[var(--r-chip)] text-ink-4 transition-colors",
          "hover:bg-hover hover:text-ink",
          // Hidden until the row is hovered or something inside has focus, so
          // a list of twenty does not read as a column of dots.
          open ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
      >
        <FiMoreHorizontal size={15} />
      </button>

      {open ? (
        <div
          role="menu"
          className="nx-in absolute right-0 top-full z-50 mt-1 w-[224px] overflow-hidden rounded-[var(--r-panel)] border border-line bg-raised p-1 shadow-[var(--sh-3)]"
          onClick={(e) => e.preventDefault()}
        >
          {renaming ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitRename();
              }}
              className="p-1"
            >
              <input
                autoFocus
                value={draft}
                maxLength={90}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="New name"
                className="w-full rounded-[var(--r-control)] border border-line-strong bg-sunk px-2.5 py-1.5 text-[16px] text-ink outline-none focus:border-accent sm:text-[13px]"
              />
              <div className="mt-1.5 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-[var(--r-chip)] px-2.5 py-1 text-[12.5px] text-ink-3 hover:bg-hover hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-grad rounded-[var(--r-chip)] px-2.5 py-1 text-[12.5px] font-medium disabled:opacity-50"
                >
                  {pending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          ) : confirming ? (
            <div className="p-2">
              <p className="text-[12.5px] leading-snug text-ink-2">
                Delete this permanently? It cannot be brought back.
              </p>
              <div className="mt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-[var(--r-chip)] px-2.5 py-1 text-[12.5px] text-ink-3 hover:bg-hover hover:text-ink"
                >
                  Keep
                </button>
                <button
                  type="button"
                  onClick={submitDelete}
                  disabled={pending}
                  className="flex items-center gap-1.5 rounded-[var(--r-chip)] bg-critical px-2.5 py-1 text-[12.5px] font-medium text-white disabled:opacity-50"
                >
                  {pending ? (
                    <>
                      <Ico icon={FiLoader} motion="spin" size={12} live /> Deleting…
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setDraft(title);
                  setRenaming(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-[var(--r-control)] px-2.5 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
              >
                <FiEdit2 size={13} className="shrink-0 text-ink-4" />
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => setConfirming(true)}
                className="flex w-full items-center gap-2.5 rounded-[var(--r-control)] px-2.5 py-2 text-left text-[13px] text-critical transition-colors hover:bg-critical/10"
              >
                <FiTrash2 size={13} className="shrink-0" />
                Delete
              </button>
            </>
          )}

          {error ? (
            <p role="alert" className="px-2.5 pb-1.5 pt-1 text-[12px] text-critical">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
