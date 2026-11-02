import { useCallback, useState } from "react";

export const SIDEBAR_COLLAPSED_KEY = "ispsystem.sidebarCollapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Whether the desktop sidebar is shrunk to icons. Remembered in this browser; the app works fine if storage is blocked. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(readCollapsed);

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // private window or blocked storage: the choice just won't be remembered
    }
  }, []);

  const toggle = useCallback(() => setCollapsed(!collapsed), [collapsed, setCollapsed]);

  return { collapsed, setCollapsed, toggle };
}
