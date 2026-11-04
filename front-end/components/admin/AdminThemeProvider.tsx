"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const STORAGE_KEY = "huedimo_admin_theme";
const listeners = new Set<() => void>();
let memoryTheme: Theme | null = null;

function getTheme(): Theme {
  if (memoryTheme) return memoryTheme;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* Use the current-session preference if storage is unavailable. */ }
  return memoryTheme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      memoryTheme = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", listener);
  };
}

function setTheme(theme: Theme) {
  memoryTheme = theme;
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* Session-only preference. */ }
  listeners.forEach((listener) => listener());
}

const ThemeContext = createContext<Theme | null>(null);

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as const);
  return (
    <ThemeContext.Provider value={theme}>
      <div data-admin-theme={theme} className="admin-theme h-full min-h-0 w-full" style={{ colorScheme: theme }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function AdminThemeToggle() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("AdminThemeToggle requires AdminThemeProvider");
  const label = theme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối";
  return (
    <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={label} title={label} aria-pressed={theme === "dark"}
      className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-admin-border bg-admin-surface px-3 text-sm font-medium text-admin-body hover:bg-admin-muted">
      {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      <span className="hidden sm:inline">{theme === "dark" ? "Sáng" : "Tối"}</span>
    </button>
  );
}
