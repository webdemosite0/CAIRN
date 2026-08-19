"use client";

import { useCallback, useSyncExternalStore } from "react";
import { FiMonitor, FiMoon, FiSun } from "react-icons/fi";
import { cn } from "@/lib/utils";

export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "nx-theme";

/**
 * Runs before first paint, inlined into <head>. Without it the page renders in
 * the default palette and then snaps to the chosen one — a visible flash on
 * every request that reaches the server.
 *
 * Kept tiny and dependency-free: it is parsed and executed on the critical path.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}})()`;

/* ---- store -------------------------------------------------------------
   Read through useSyncExternalStore rather than useState+useEffect: the
   preference already exists before React mounts (THEME_SCRIPT applied it), so
   it is external state, not state React owns. This also keeps two toggles —
   the desktop rail and the mobile drawer — in sync with each other. */

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

/** The server cannot know the preference, so it always renders "system". */
function getServerSnapshot(): Theme {
  return "system";
}

const OPTIONS: { value: Theme; label: string; icon: typeof FiSun }[] = [
  { value: "light", label: "Light", icon: FiSun },
  { value: "dark", label: "Dark", icon: FiMoon },
  { value: "system", label: "System", icon: FiMonitor },
];

/** Segmented light / dark / system switch. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const choose = useCallback((next: Theme) => {
    const root = document.documentElement;
    if (next === "system") delete root.dataset.theme;
    else root.dataset.theme = next;

    try {
      if (next === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      /* the choice still applies for this session */
    }
    emit();
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      // Borderless on purpose: the rail footer already stacks the credit meter
      // and the account row, and a third outlined box made it read as clutter.
      className={cn("flex items-center gap-0.5", className)}
    >
      {OPTIONS.map((o) => {
        const active = theme === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => choose(o.value)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-[6px] transition-colors duration-150",
              active ? "bg-hover text-ink" : "text-ink-4 hover:text-ink-2",
            )}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
