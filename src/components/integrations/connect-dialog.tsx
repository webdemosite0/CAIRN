"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiX, FiExternalLink, FiLock, FiLoader, FiAlertCircle } from "react-icons/fi";
import { connect, type ConnectState } from "@/app/actions/connections";
import { Ico } from "@/components/ui/ico";

/**
 * Asks for one credential and verifies it against the real provider before
 * anything is stored. A rejected credential never reaches the database.
 */
export function ConnectDialog({
  service,
  name,
  label,
  help,
  docs,
  onClose,
}: {
  service: string;
  name: string;
  label: string;
  help: string;
  docs?: string;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<ConnectState, FormData>(
    connect,
    {},
  );
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
    onClose();
  }, [state.ok, onClose, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-5">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Connect ${name}`}
        className="nx-in panel relative w-full max-w-[460px] p-6"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="group absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-[var(--r-chip)] text-ink-4 hover:bg-hover hover:text-ink"
        >
          <Ico icon={FiX} motion="shake" size={16} />
        </button>

        <h2 className="text-[17px] font-semibold text-ink">Connect {name}</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">{help}</p>

        {docs ? (
          <a
            href={docs}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
          >
            Get it here <FiExternalLink size={11} />
          </a>
        ) : null}

        <form action={action} className="mt-5">
          <input type="hidden" name="service" value={service} />

          <label className="block text-[12.5px] font-medium text-ink-2" htmlFor="secret">
            {label}
          </label>
          <input
            id="secret"
            name="secret"
            type="password"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            required
            placeholder="Paste it here"
            className="mt-1.5 w-full rounded-[var(--r-control)] border border-line-strong bg-sunk px-3.5 py-2.5 font-mono text-[13px] text-ink outline-none transition-colors placeholder:font-sans placeholder:text-ink-4 focus:border-accent"
          />

          {state.error ? (
            <p className="mt-3 flex items-start gap-2 text-[13px] text-critical">
              <FiAlertCircle size={14} className="mt-0.5 shrink-0" />
              {state.error}
            </p>
          ) : null}

          <button
            disabled={pending}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-[var(--r-control)] btn-grad py-2.5 text-[14px] font-medium transition-[filter] disabled:opacity-60"
          >
            {pending ? (
              <>
                <Ico icon={FiLoader} motion="spin" size={15} className="animate-spin" />
                Checking with {name}…
              </>
            ) : (
              "Verify and connect"
            )}
          </button>
        </form>

        <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-ink-4">
          <FiLock size={12} className="mt-0.5 shrink-0" />
          Encrypted before it is stored, and never sent to the browser again.
          Trove checks it against {name} first — a credential that does not work
          is not saved.
        </p>
      </div>
    </div>
  );
}
