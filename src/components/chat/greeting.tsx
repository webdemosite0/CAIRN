"use client";

import { useSyncExternalStore } from "react";

/**
 * "Good afternoon, Aryan" — resolved on the client, on purpose.
 *
 * The server has no idea what time it is where the reader is sitting, so
 * rendering the greeting there would either be wrong or, worse, disagree with
 * what the client renders and trip a hydration mismatch.
 *
 * useSyncExternalStore is the tool for exactly this: getServerSnapshot returns
 * the neutral greeting used for SSR and the first paint, getSnapshot returns
 * the time-aware one. No effect, no second render scheduled just to correct
 * the first.
 */
function partOfDay(hour: number): string {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** The clock never notifies us; the greeting is read once per mount. */
const subscribe = () => () => {};

export function Greeting({ name }: { name: string }) {
  const greeting = useSyncExternalStore(
    subscribe,
    () => partOfDay(new Date().getHours()),
    () => "Welcome back",
  );

  return (
    <p className="text-[15px] font-medium text-ink-3">
      {greeting}, <span className="text-ink-2">{name}</span>
    </p>
  );
}
