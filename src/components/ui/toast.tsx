"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { FiAlertTriangle, FiCheck, FiInfo, FiX } from "react-icons/fi";
import { useMounted } from "@/lib/use-mounted";

type Tone = "info" | "success" | "error";

interface Toast {
  id: number;
  message: string;
  tone: Tone;
  /** Optional single action, e.g. Undo. Dismisses the toast when run. */
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  show: (message: string, opts?: { tone?: Tone; action?: Toast["action"]; ms?: number }) => void;
}

const Ctx = React.createContext<ToastApi | null>(null);

/**
 * Transient confirmations, docked bottom-right.
 *
 * A toast is for something that already happened and needs no decision. Put
 * anything the user must act on in a Modal instead — a toast that times out
 * takes its question with it.
 *
 * Errors do not auto-dismiss. A success message the user missed costs nothing;
 * a failure they missed means they believe something worked that did not.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);
  const mounted = useMounted();
  const next = React.useRef(1);
  const timers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = React.useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setItems((list) => list.filter((i) => i.id !== id));
  }, []);

  React.useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearTimeout);
      map.clear();
    };
  }, []);

  const show = React.useCallback<ToastApi["show"]>(
    (message, opts) => {
      const tone = opts?.tone ?? "info";
      const id = next.current++;
      setItems((list) => [...list.slice(-2), { id, message, tone, action: opts?.action }]);

      const ms = opts?.ms ?? (tone === "error" ? 0 : 4200);
      if (ms > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), ms),
        );
      }
    },
    [dismiss],
  );

  const api = React.useMemo(() => ({ show }), [show]);

  const icons: Record<Tone, React.ReactNode> = {
    info: <FiInfo size={15} className="text-accent" />,
    success: <FiCheck size={15} className="text-positive" />,
    error: <FiAlertTriangle size={15} className="text-critical" />,
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      {mounted && items.length
        ? createPortal(
            <div
              // polite, not assertive: these announce alongside whatever the
              // user is doing rather than interrupting it.
              role="status"
              aria-live="polite"
              className="nx-no-print pointer-events-none fixed bottom-4 right-4 z-[110] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
            >
              {items.map((t) => (
                <div
                  key={t.id}
                  className="nx-slide-up pointer-events-auto flex items-start gap-2.5 rounded-[10px] border border-line bg-raised px-3.5 py-3 shadow-[var(--elev)]"
                >
                  <span className="mt-px shrink-0">{icons[t.tone]}</span>
                  <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink-2">
                    {t.message}
                  </p>
                  {t.action ? (
                    <button
                      type="button"
                      onClick={() => {
                        t.action?.onClick();
                        dismiss(t.id);
                      }}
                      className="shrink-0 rounded-[5px] px-1.5 py-0.5 text-[13px] font-medium text-accent transition-colors hover:bg-hover"
                    >
                      {t.action.label}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss"
                    className="-mr-1 -mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[5px] text-ink-4 transition-colors hover:bg-hover hover:text-ink"
                  >
                    <FiX size={13} />
                  </button>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </Ctx.Provider>
  );
}

/**
 * Returns a no-op outside a ToastProvider rather than throwing.
 *
 * A missing provider should not take down a page over a confirmation message;
 * it warns once in development instead.
 */
export function useToast(): ToastApi {
  const ctx = React.useContext(Ctx);
  const warned = React.useRef(false);
  return React.useMemo(() => {
    if (ctx) return ctx;
    return {
      show: (message: string) => {
        if (process.env.NODE_ENV !== "production" && !warned.current) {
          warned.current = true;
          console.warn("useToast called outside ToastProvider; dropped:", message);
        }
      },
    };
  }, [ctx]);
}
