"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthContextValue, User } from "@/lib/types";
import {
  loginUser,
  registerUser,
  logoutUser,
  fetchCurrentUser,
  updateUserProfile,
} from "@/lib/auth/logic";
import { toast } from "@/components/ui/Toast";

const SESSION_EVENT = "huedimo-session-changed";
const SESSION_KEY = "huedimo_session";

let cachedRaw: string | null = null;
let cachedUser: User | null = null;

function getSnapshot(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedUser = raw ? (JSON.parse(raw) as User) : null;
    }
    return cachedUser;
  } catch {
    return null;
  }
}

function getServerSnapshot(): User | null {
  return null;
}

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener(SESSION_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener(SESSION_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function refreshSession() {
  window.dispatchEvent(new Event(SESSION_EVENT));
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Tự động kiểm tra tính hợp lệ của token khi khởi động app
    fetchCurrentUser().then(() => {
      const currentRaw = localStorage.getItem(SESSION_KEY);
      if (currentRaw !== cachedRaw) {
        refreshSession();
      }
    });
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await loginUser(email, password);
      if (res.ok) refreshSession();
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await registerUser(name, email, password);
      if (res.ok) refreshSession();
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: { name?: string; avatarUrl?: string; avatar_url?: string }) => {
    setIsLoading(true);
    try {
      const res = await updateUserProfile(data);
      if (res.ok) refreshSession();
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    const updated = await fetchCurrentUser();
    refreshSession();
    return updated;
  };

  const logout = () => {
    logoutUser();
    refreshSession();
    toast.info("Bạn đã đăng xuất an toàn khỏi tài khoản.", "Đăng xuất thành công");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        updateProfile,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được dùng trong AuthProvider");
  return ctx;
}
