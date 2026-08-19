"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import Link from "next/link";
import {
  FiBell,
  FiBellOff,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiX,
} from "react-icons/fi";
import { Bot } from "@/components/agents/bot";
import {
  createReminder,
  deleteReminder,
  markNotified,
  toggleDone,
  type Reminder,
} from "@/app/actions/reminders";
import { Ico } from "@/components/ui/ico";
import { cn } from "@/lib/utils";

type Permission = "default" | "granted" | "denied" | "unsupported";

const QUICK = [
  { label: "In 1 min", ms: 60_000 },
  { label: "In 10 min", ms: 600_000 },
  { label: "In 1 hour", ms: 3_600_000 },
  { label: "Tomorrow 9am", ms: -1 },
];

function tomorrow9() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

function formatDue(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `Today ${time}` : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

/** Notification.permission is external browser state. */
function subscribePermission(onChange: () => void) {
  const t = setInterval(onChange, 2000);
  return () => clearInterval(t);
}

function readPermission(): Permission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as Permission;
}

export function RemindersView({
  initial,
  signedIn,
}: {
  initial: Reminder[];
  signedIn: boolean;
}) {
  const [added, setAdded] = useState<Reminder[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [toggled, setToggled] = useState<Record<string, number>>({});
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<number>(() => Date.now() + 600_000);
  const [error, setError] = useState<string | null>(null);
  const [fired, setFired] = useState<Reminder[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [, startTransition] = useTransition();
  const seen = useRef(new Set<string>());

  const permission = useSyncExternalStore(
    subscribePermission,
    readPermission,
    () => "default" as Permission,
  );

  // Derived, not mirrored in state — server data stays the source of truth.
  // Optimistic additions are deduped away once the server round-trip returns
  // the same row.
  const reminders = useMemo(() => {
    const byId = new Map<string, Reminder>();
    for (const r of [...added, ...initial]) byId.set(r.id, r);
    return [...byId.values()]
      .filter((r) => !removed.includes(r.id))
      .map((r) => (r.id in toggled ? { ...r, done: toggled[r.id] } : r))
      .sort((a, b) => a.due_at - b.due_at);
  }, [initial, added, removed, toggled]);

  /* the reminder loop — one clock drives both firing and "overdue" styling */
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const due = reminders.filter(
      (r) => !r.done && !r.notified && !seen.current.has(r.id) && r.due_at <= now,
    );
    if (due.length === 0) return;

    for (const r of due) {
      seen.current.add(r.id);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const n = new Notification("Trove reminder", { body: r.title, tag: r.id });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      }
      void markNotified(r.id);
    }
    setFired((f) => [...f, ...due]);
  }, [reminders, now]);

  async function ask() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    if (p === "granted") {
      new Notification("Notifications on", {
        body: "Trove will remind you here.",
      });
    }
  }

  function add(dueAt: number) {
    if (!title.trim()) {
      setError("Give the reminder a title first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createReminder({ title, dueAt });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setAdded((a) => [
        ...a,
        { id: res.id!, title, note: "", due_at: dueAt, done: 0, notified: 0 },
      ]);
      setTitle("");
    });
  }

  const pending = reminders.filter((r) => !r.done);
  const complete = reminders.filter((r) => r.done);

  if (!signedIn) {
    return (
      <div className="nx-in mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center px-5 text-center">
        <Bot size={68} accent="#fbbf24" />
        <h1 className="mt-6 text-[22px] font-semibold text-ink">Reminders</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-3">
          Tell Trove what to remind you about and it will notify you.
        </p>
        <Link
          href="/login"
          className="mt-7 rounded-[10px] bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-transform hover:scale-105"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="nx-in mx-auto min-h-screen max-w-[720px] px-5 py-10 lg:px-8">
      <h1 className="text-[24px] font-semibold text-ink">Reminders</h1>
      <p className="mt-1.5 text-[13.5px] text-ink-3">
        {pending.length} pending · notifications fire while Trove is open in a tab.
      </p>

      {/* permission */}
      {permission !== "granted" ? (
        <div
          className={cn(
            "mt-5 flex flex-wrap items-center gap-3 rounded-[12px] border px-4 py-3",
            permission === "denied" || permission === "unsupported"
              ? "border-critical/25 bg-critical/8"
              : "border-caution/25 bg-caution/8",
          )}
        >
          {permission === "denied" || permission === "unsupported" ? (
            <Ico icon={FiBellOff} motion="ring" size={16} className="shrink-0 text-critical" />
          ) : (
            <Ico icon={FiBell} motion="ring" size={16} className="shrink-0 text-caution" />
          )}
          <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink-2">
            {permission === "unsupported"
              ? "This browser does not support notifications. Reminders still appear in the app."
              : permission === "denied"
                ? "Notifications are blocked for this site. Re-enable them in your browser settings — reminders still appear in the app."
                : "Allow notifications and reminders will pop up even when this tab is in the background."}
          </p>
          {permission === "default" ? (
            <button
              onClick={ask}
              className="shrink-0 rounded-[9px] bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-transform hover:scale-[1.03]"
            >
              Enable
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-5 flex items-center gap-2 text-[13px] text-positive">
          <Ico icon={FiBell} motion="ring" size={14} /> Notifications enabled
        </p>
      )}

      {/* composer */}
      <div className="mt-6 rounded-[14px] border border-line bg-rail p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add(when);
          }}
          placeholder="Remind me to…"
          aria-label="Reminder title"
          className="h-11 w-full rounded-[10px] border border-line-strong bg-sunk px-3.5 text-[14px] text-ink outline-none placeholder:text-ink-4 focus:border-accent"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {QUICK.map((q) => (
            <button
              key={q.label}
              onClick={() => {
                const due = q.ms === -1 ? tomorrow9() : Date.now() + q.ms;
                setWhen(due);
                add(due);
              }}
              className="chip group !px-3 !py-1.5 !text-[12.5px]"
            >
              <Ico icon={FiClock} motion="spin" size={12} /> {q.label}
            </button>
          ))}

          <label className="ml-auto flex items-center gap-2 text-[12.5px] text-ink-3">
            <input
              type="datetime-local"
              onChange={(e) => setWhen(new Date(e.target.value).getTime())}
              className="rounded-[8px] border border-line-strong bg-sunk px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-accent"
            />
            <button
              onClick={() => add(when)}
              className="flex items-center gap-1.5 rounded-[8px] bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white"
            >
              <Ico icon={FiPlus} motion="open" size={12} /> Add
            </button>
          </label>
        </div>

        {error ? (
          <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-critical">
            <Ico icon={FiAlertCircle} motion="pop" size={12} /> {error}
          </p>
        ) : null}
      </div>

      {/* list */}
      {pending.length === 0 && complete.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-[14px] border border-dashed border-line-strong px-6 py-16 text-center">
          <Bot size={56} accent="#fbbf24" />
          <p className="mt-4 text-[14px] text-ink-2">Nothing scheduled yet.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {[...pending, ...complete].map((r) => {
            const overdue = !r.done && r.due_at <= now;
            return (
              <li
                key={r.id}
                className={cn(
                  "nx-in flex items-center gap-3 rounded-[12px] border px-4 py-3",
                  r.done
                    ? "border-line bg-rail opacity-55"
                    : overdue
                      ? "border-caution/35 bg-caution/8"
                      : "border-line bg-rail",
                )}
              >
                <button
                  onClick={() => {
                    setToggled((t) => ({ ...t, [r.id]: r.done ? 0 : 1 }));
                    void toggleDone(r.id);
                  }}
                  aria-label={r.done ? "Mark not done" : "Mark done"}
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border transition-colors",
                    r.done
                      ? "border-positive bg-positive text-canvas"
                      : "border-line-strong hover:border-ink-3",
                  )}
                >
                  {r.done ? <Ico icon={FiCheck} motion="check" size={12} /> : null}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-[14px]",
                      r.done ? "text-ink-4 line-through" : "text-ink",
                    )}
                  >
                    {r.title}
                  </p>
                  <p className="text-[12px] text-ink-4">
                    {formatDue(r.due_at)}
                    {overdue ? " · due" : ""}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setRemoved((x) => [...x, r.id]);
                    void deleteReminder(r.id);
                  }}
                  aria-label={`Delete ${r.title}`}
                  className="shrink-0 rounded-[7px] p-1.5 text-ink-4 transition-colors hover:bg-hover hover:text-critical"
                >
                  <Ico icon={FiTrash2} motion="shake" size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* in-app toasts, so a reminder is never missed if notifications are off */}
      <div className="fixed bottom-5 right-5 z-50 flex w-[min(340px,calc(100vw-40px))] flex-col gap-2">
        {fired.map((r) => (
          <div
            key={r.id}
            className="nx-in flex items-start gap-3 rounded-[13px] border border-caution/40 bg-raised px-4 py-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
          >
            <Bot size={32} accent="#fbbf24" state="working" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] uppercase tracking-[0.06em] text-caution">
                Reminder
              </p>
              <p className="mt-0.5 text-[13.5px] leading-snug text-ink">{r.title}</p>
            </div>
            <button
              onClick={() => setFired((f) => f.filter((x) => x.id !== r.id))}
              aria-label="Dismiss"
              className="shrink-0 rounded-[6px] p-1 text-ink-4 hover:text-ink"
            >
              <Ico icon={FiX} motion="shake" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
