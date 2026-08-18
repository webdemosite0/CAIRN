"use client";

import { useCallback, useRef } from "react";

export interface SavedMessage {
  role: "user" | "model";
  text: string;
}

/**
 * Persists a thread after each completed exchange.
 *
 * The server streams the model response straight through to the browser, so
 * the client is the only place that holds the finished text — which is why the
 * save is issued from here rather than inside the API route.
 *
 * The conversation id is kept in a ref, not state: it must be readable by the
 * next save immediately, and it never affects what is rendered.
 */
export function useSaved(kind: string, initialId?: string | null) {
  const idRef = useRef<string | null>(initialId ?? null);

  const save = useCallback(
    async (messages: SavedMessage[], title?: string) => {
      const usable = messages.filter((m) => m.text.trim());
      if (!usable.length) return;

      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: idRef.current,
            kind,
            title: title ?? usable[0].text,
            messages: usable,
            // Where this thread lives. Reported by the page that owns it
            // rather than derived from `kind` on the server: a central map
            // silently produced "/?c=..." for kinds missing from it, which
            // landed on the marketing page instead of the conversation.
            path: window.location.pathname,
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.id) {
          idRef.current = data.id;
          // Reflect the thread in the URL so a reload or a shared link lands
          // back on it. replaceState keeps it out of the back-button history.
          const url = new URL(window.location.href);
          if (url.searchParams.get("c") !== data.id) {
            url.searchParams.set("c", data.id);
            window.history.replaceState(null, "", url.toString());
          }
        }
      } catch {
        // Saving is best-effort: never surface a bookkeeping failure over an
        // answer the user already has on screen.
      }
    },
    [kind],
  );

  const reset = useCallback(() => {
    idRef.current = null;
    const url = new URL(window.location.href);
    if (url.searchParams.has("c")) {
      url.searchParams.delete("c");
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  return { save, reset, id: idRef };
}
