"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Minimal shape of the Web Speech API we rely on. */
interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >;
}

type Ctor = new () => Recognition;

function getCtor(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: Ctor;
    webkitSpeechRecognition?: Ctor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Speech-to-text for the composer.
 *
 * Uses the browser's own recognition, so nothing is uploaded by us and it costs
 * nothing. Support is uneven — Chrome and Edge have it, Firefox does not — so
 * the button is always shown and says plainly when the browser cannot do it.
 */
export function useVoice(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const sink = useRef(onText);

  // Keep the callback fresh without re-creating the recogniser on every render.
  useEffect(() => {
    sink.current = onText;
  }, [onText]);

  useEffect(() => {
    const Ctor = getCtor();
    if (!Ctor) return;

    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.continuous = true;
    r.interimResults = false;

    r.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript;
      }
      if (text.trim()) sink.current(text.trim());
    };

    r.onerror = (e) => {
      setListening(false);
      setError(
        e.error === "not-allowed"
          ? "Microphone access was blocked. Allow it in your browser settings."
          : e.error === "no-speech"
            ? "Didn't catch that — try again."
            : "Voice input failed. Try again.",
      );
    };

    r.onend = () => setListening(false);
    rec.current = r;

    return () => {
      r.onresult = null;
      r.onerror = null;
      r.onend = null;
      try {
        r.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  const toggle = useCallback(() => {
    const r = rec.current;
    if (!r) {
      setError(
        "Voice input is not available in this browser. Chrome or Edge support it.",
      );
      return;
    }
    setError(null);

    if (listening) {
      r.stop();
      setListening(false);
      return;
    }
    try {
      r.start();
      setListening(true);
    } catch {
      /* start() throws if already running */
    }
  }, [listening]);

  return { listening, error, toggle };
}
