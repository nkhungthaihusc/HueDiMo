"use client";

import { useEffect } from "react";
import { AlertTriangle, Trash2, X, CheckCircle2, HelpCircle } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const config = {
    danger: {
      icon: Trash2,
      iconBg: "bg-rose-100 text-rose-600 ring-4 ring-rose-50",
      confirmBtn: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/25",
      defaultTitle: "Xác nhận hành động",
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-amber-100 text-amber-600 ring-4 ring-amber-50",
      confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/25",
      defaultTitle: "Cảnh báo xác nhận",
    },
    primary: {
      icon: HelpCircle,
      iconBg: "bg-indigo-100 text-indigo-600 ring-4 ring-indigo-50",
      confirmBtn: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25",
      defaultTitle: "Xác nhận yêu cầu",
    },
  }[variant];

  const Icon = config.icon;
  const modalTitle = title || config.defaultTitle;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => !isLoading && onClose()}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 backdrop-blur-xl transition-all duration-200 animate-in fade-in zoom-in-95 sm:p-7 z-10 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={() => !isLoading && onClose()}
          disabled={isLoading}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition active:scale-95 cursor-pointer disabled:opacity-50"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left sm:flex-row sm:gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${config.iconBg} mb-3 sm:mb-0`}>
            <Icon className="h-6 w-6" />
          </div>

          <div className="flex-1">
            <h3 id="confirm-modal-title" className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              {modalTitle}
            </h3>
            <p className="mt-2 text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 ${config.confirmBtn}`}
          >
            {isLoading && (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
