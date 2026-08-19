"use client";

import { useSyncExternalStore } from "react";

const never = () => () => {};

/**
 * False during server render and the hydration pass, true afterwards.
 *
 * Anything that portals into document.body needs this — `document` does not
 * exist on the server, and rendering the portal during hydration mismatches.
 *
 * Written with useSyncExternalStore rather than useState + useEffect because
 * the effect form is a setState inside an effect, which lints as a cascading
 * render. The store never actually changes: getServerSnapshot returns false,
 * getSnapshot returns true, and subscribe is a no-op.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
}
