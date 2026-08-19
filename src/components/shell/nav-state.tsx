"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * Shell navigation state.
 *
 * `open` is the mobile drawer. `collapsed` is the desktop rail, lifted out of
 * Sidebar so a page can narrow the chrome when it needs the room — the builder
 * collapses it the moment a build starts, because at that point the preview is
 * the thing worth looking at and the nav is not.
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
