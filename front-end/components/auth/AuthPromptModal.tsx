"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, LogIn, UserPlus, ShieldAlert, Sparkles } from "lucide-react";

export interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  icon?: string;
  redirectPath?: string;
}

export default function AuthPromptModal({
  isOpen,
  onClose,
  title = "Đăng nhập để tiếp tục",
  description = "Tính năng này yêu cầu bạn đăng nhập tài khoản HueDiMo để cá nhân hóa và lưu trữ dữ liệu.",
  icon = "🔐",
  redirectPath,
}: AuthPromptModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const loginHref = redirectPath
    ? `/login?redirect=${encodeURIComponent(redirectPath)}`
    : "/login";
  const registerHref = redirectPath
    ? `/register?redirect=${encodeURIComponent(redirectPath)}`
    : "/register";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop kính mờ */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white/95 p-6 shadow-2xl border border-slate-100 backdrop-blur-xl transition-all duration-200 animate-in fade-in zoom-in-95 sm:p-7 z-10 select-none">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition active:scale-95 cursor-pointer"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Nội dung */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-100 via-teal-50 to-indigo-100 text-3xl shadow-inner border border-emerald-200/50 mb-4">
            {icon}
          </div>

          <h3 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
            {title}
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs sm:max-w-sm">
            {description}
          </p>

          <div className="mt-6 w-full space-y-2.5">
            <Link
              href={loginHref}
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              <span>Đăng nhập ngay</span>
            </Link>

            <Link
              href={registerHref}
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100/90 border border-slate-200/70 px-4 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 transition-all active:scale-[0.99] cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Tạo tài khoản mới</span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              Để sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
