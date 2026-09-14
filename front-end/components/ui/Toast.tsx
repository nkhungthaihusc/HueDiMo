"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "error" | "success" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (item: Omit<ToastItem, "id">) => void;
  error: (message: string, title?: string, duration?: number) => void;
  success: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_EVENT = "huedimo-toast-event";

/**
 * Hàm gọi toast toàn cục có thể dùng ở BẤT CỨ ĐÂU (cả bên ngoài React components)
 */
export const toast = {
  error: (message: string, title: string = "Đã xảy ra lỗi", duration: number = 4500) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
          detail: { type: "error", message, title, duration },
        })
      );
    }
  },
  success: (message: string, title: string = "Thành công", duration: number = 3500) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
          detail: { type: "success", message, title, duration },
        })
      );
    }
  },
  warning: (message: string, title: string = "Chú ý", duration: number = 4000) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
          detail: { type: "warning", message, title, duration },
        })
      );
    }
  },
  info: (message: string, title: string = "Thông báo", duration: number = 3500) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
          detail: { type: "info", message, title, duration },
        })
      );
    }
  },
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback sang global toast nếu nằm ngoài context
    return {
      showToast: (item: Omit<ToastItem, "id">) => {
        if (item.type === "error") toast.error(item.message, item.title, item.duration);
        else if (item.type === "success") toast.success(item.message, item.title, item.duration);
        else if (item.type === "warning") toast.warning(item.message, item.title, item.duration);
        else toast.info(item.message, item.title, item.duration);
      },
      error: toast.error,
      success: toast.success,
      warning: toast.warning,
      info: toast.info,
      removeToast: () => {},
    };
  }
  return ctx;
}

const TYPE_CONFIG: Record<
  ToastType,
  {
    icon: React.ComponentType<{ className?: string }>;
    accentBorder: string;
    iconBg: string;
    iconColor: string;
    progressBar: string;
    badgeText: string;
  }
> = {
  error: {
    icon: AlertCircle,
    accentBorder: "border-red-500/30",
    iconBg: "bg-red-50 ring-1 ring-red-500/20",
    iconColor: "text-red-600",
    progressBar: "bg-red-500",
    badgeText: "Lỗi",
  },
  success: {
    icon: CheckCircle2,
    accentBorder: "border-emerald-500/30",
    iconBg: "bg-emerald-50 ring-1 ring-emerald-500/20",
    iconColor: "text-emerald-600",
    progressBar: "bg-emerald-500",
    badgeText: "Thành công",
  },
  warning: {
    icon: AlertTriangle,
    accentBorder: "border-amber-500/30",
    iconBg: "bg-amber-50 ring-1 ring-amber-500/20",
    iconColor: "text-amber-600",
    progressBar: "bg-amber-500",
    badgeText: "Cảnh báo",
  },
  info: {
    icon: Info,
    accentBorder: "border-sky-500/30",
    iconBg: "bg-sky-50 ring-1 ring-sky-500/20",
    iconColor: "text-sky-600",
    progressBar: "bg-sky-500",
    badgeText: "Thông tin",
  },
};

function ToastCard({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const config = TYPE_CONFIG[item.type];
  const Icon = config.icon;
  const duration = item.duration || 4500;

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(item.id);
    }, 250);
  }, [item.id, onClose]);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        handleClose();
      }
    }, 30);

    return () => clearInterval(interval);
  }, [duration, handleClose]);

  return (
    <div
      role="alert"
      className={`group relative pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-2xl border ${config.accentBorder} bg-white/95 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out hover:scale-[1.01] ${
        isExiting
          ? "translate-x-full opacity-0 scale-95"
          : "translate-x-0 opacity-100 scale-100 animate-in slide-in-from-top-3 fade-in duration-300"
      }`}
    >
      <div className="flex w-full items-start gap-3">
        {/* Icon */}
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}>
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 pr-6">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-ink-900 leading-tight">
              {item.title || config.badgeText}
            </h4>
          </div>
          <p className="mt-1 text-xs text-ink-700 leading-relaxed break-words font-medium">
            {item.message}
          </p>
        </div>

        {/* Nút đóng */}
        <button
          onClick={handleClose}
          aria-label="Đóng thông báo"
          className="absolute top-3 right-3 rounded-lg p-1 text-ink-400 opacity-60 transition hover:bg-black/5 hover:opacity-100 hover:text-ink-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Thanh tiến trình thời gian tự động đóng */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5">
        <div
          className={`h-full ${config.progressBar} transition-all duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((item: Omit<ToastItem, "id">) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { ...item, id }]); // Giữ tối đa 5 toast cùng lúc
  }, []);

  const error = useCallback(
    (message: string, title: string = "Đã xảy ra lỗi", duration: number = 4500) => {
      showToast({ type: "error", message, title, duration });
    },
    [showToast]
  );

  const success = useCallback(
    (message: string, title: string = "Thành công", duration: number = 3500) => {
      showToast({ type: "success", message, title, duration });
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, title: string = "Chú ý", duration: number = 4000) => {
      showToast({ type: "warning", message, title, duration });
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, title: string = "Thông báo", duration: number = 3500) => {
      showToast({ type: "info", message, title, duration });
    },
    [showToast]
  );

  // Lắng nghe sự kiện toàn cục huedimo-toast-event
  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent<Omit<ToastItem, "id">>;
      if (customEvent.detail) {
        showToast(customEvent.detail);
      }
    };

    window.addEventListener(TOAST_EVENT, handleCustomToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleCustomToast);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        error,
        success,
        warning,
        info,
        removeToast,
      }}
    >
      {children}

      {/* Vị trí cố định ở góc trên bên phải màn hình */}
      <aside
        aria-live="assertive"
        className="pointer-events-none fixed top-4 right-4 z-[99999] flex w-full max-w-sm flex-col gap-2.5 p-2 sm:p-0"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onClose={removeToast} />
        ))}
      </aside>
    </ToastContext.Provider>
  );
}
