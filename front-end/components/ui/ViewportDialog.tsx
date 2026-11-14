"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const DialogTheme = createContext<"light" | "dark" | null>(null);
const subscribe = () => () => {};

export default function ViewportDialog({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const theme = useContext(DialogTheme);
  if (!mounted) return null;
  return createPortal(
    theme ? <div className="admin-theme" data-admin-theme={theme} style={{ colorScheme: theme }}>{children}</div> : children,
    document.body,
  );
}
