"use client";

import { useCallback, useReducer } from "react";
import type { Slide } from "@/lib/slides";
import * as ops from "@/lib/deck-ops";

/**
 * An editable deck, with history.
 *
 * Slides used to be derived — `useMemo(() => parseDeck(text))`, recomputed
 * from the model's markdown on every render. That made the deck a *view* of
 * the answer, and a view cannot be edited: changing a title meant editing
 * markdown and hoping the parser agreed. So the slides are the state now, and
 * the markdown is only how they arrive.
 *
 * Past, present and future live in one reducer rather than in three refs. With
 * refs, an undo that lands in the same render as an edit reads a stale stack
 * and silently loses a step; a reducer sees them in order because React
 * applies actions in order.
 *
 * The edits themselves are in lib/deck-ops — pure array transforms, tested
 * without React.
 */

const HISTORY_LIMIT = 60;

interface State {
  past: Slide[][];
  present: Slide[];
  future: Slide[][];
  /** True once anything has been changed by hand. */
  edited: boolean;
  /**
   * What the last edit was.
   *
   * Typing a title emits one action per keystroke. Without this, undoing a
   * sentence takes forty presses — so consecutive edits carrying the same key
   * replace the present rather than pushing a new history entry.
   */
  lastKey: string | null;
}

type Action =
  | { type: "load"; slides: Slide[] }
  | { type: "edit"; slides: Slide[]; key?: string }
  | { type: "undo" }
  | { type: "redo" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "load":
      return { past: [], present: action.slides, future: [], edited: false, lastKey: null };

    case "edit": {
      // Nothing actually changed — an op that hit a no-op guard.
      if (action.slides === state.present) return state;

      const coalesced = action.key != null && action.key === state.lastKey;
      return {
        past: coalesced
          ? state.past
          : [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: action.slides,
        future: [],
        edited: true,
        lastKey: action.key ?? null,
      };
    }

    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        edited: true,
        lastKey: null,
      };
    }

    case "redo": {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return {
        past: [...state.past, state.present],
        present: next,
        future: rest,
        edited: true,
        lastKey: null,
      };
    }
  }
}

export function useDeck(initial: Slide[] = []) {
  const [state, dispatch] = useReducer(reducer, {
    past: [],
    present: initial,
    future: [],
    edited: false,
    lastKey: null,
  });

  const edit = useCallback(
    (slides: Slide[], key?: string) => dispatch({ type: "edit", slides, key }),
    [],
  );

  const slides = state.present;

  return {
    slides,
    edited: state.edited,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,

    undo: useCallback(() => dispatch({ type: "undo" }), []),
    redo: useCallback(() => dispatch({ type: "redo" }), []),
    load: useCallback((next: Slide[]) => dispatch({ type: "load", slides: next }), []),

    // Text edits coalesce per field; structural ones never do, because each is
    // a deliberate single action someone may want back.
    setTitle: (i: number, v: string) => edit(ops.setTitle(slides, i, v), `title:${i}`),
    setNote: (i: number, v: string) => edit(ops.setNote(slides, i, v), `note:${i}`),
    setBullet: (i: number, b: number, v: string) =>
      edit(ops.setBullet(slides, i, b, v), `bullet:${i}:${b}`),

    addBullet: (i: number, at?: number) => edit(ops.addBullet(slides, i, at)),
    removeBullet: (i: number, b: number) => edit(ops.removeBullet(slides, i, b)),
    addSlide: (after: number) => edit(ops.addSlide(slides, after)),
    duplicateSlide: (i: number) => edit(ops.duplicateSlide(slides, i)),
    removeSlide: (i: number) => edit(ops.removeSlide(slides, i)),
    moveSlide: (from: number, to: number) => edit(ops.moveSlide(slides, from, to)),
  };
}
