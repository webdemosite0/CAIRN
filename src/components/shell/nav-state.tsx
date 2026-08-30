"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * Shell navigation state.
 *
 * `open` is the mobile drawer. `collapsed` is the desktop rail, lifted out of
 * Sidebar so a page can narrow the chrome when it needs the room — the builder
 * collapses it the moment a build starts, because at that point the preview is
 * the thing worth looking at and the nav is not.
 *
 * The rail starts expanded. Every destination reads as a word rather than a
 * glyph, which is what makes the workspace legible on the first visit; the
 * icon rail is there for anyone who wants the room back. Collapsing lasts the
 * session: this is React state, so a full page load starts expanded again.
 */
const NavContext = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}>({
  open: false,
  setOpen: () => {},
  collapsed: false,
  setCollapsed: () => {},
});

export const useNav = () => useContext(NavContext);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const value = useMemo(
    () => ({ open, setOpen, collapsed, setCollapsed }),
    [open, collapsed],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
