"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminThemeToggle } from "@/components/admin/AdminThemeProvider";

export default function AdminLoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("admin@huedimo.vn");
  const [password, setPassword] = useState("Admin@123456");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (!res.ok) {
        setErrorMsg(res.error || "Đăng nhập không thành công.");
        return;
      }

      // Check role
      if (res.user?.role !== "admin") {
        setErrorMsg("Tài khoản của bạn không có quyền Quản trị viên (Role Admin).");
        return;
      }

      router.push("/admin");
    } catch {
      setErrorMsg("Không thể kết nối đến máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-dvh overflow-y-auto items-center justify-center bg-admin-canvas p-4 font-sans text-admin-strong">
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))]"><AdminThemeToggle /></div>
      <div className="w-full max-w-md py-16">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 relative h-16 w-16 overflow-hidden rounded-2xl shadow-sm ring-2 ring-purple-500/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/avatars/473616240_1779979822801506_5513169442076253620_n.jpg"
              alt="HueDiMo Admin"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-admin-strong">HueDiMo Console</h1>
          <p className="mt-1 text-xs text-purple-700 dark:text-purple-300 font-medium">
            Di sản văn hóa với hội nhập và phát triển
          </p>
          <p className="mt-0.5 text-xs text-admin-subtle">
            Hệ thống Quản trị & Điều hành Dữ liệu Du lịch Huế
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-admin-border bg-admin-surface p-8 shadow-2xl backdrop-blur-xl">
          {errorMsg && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-medium text-red-600 dark:text-red-300">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-login-form space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-admin-body">
                Email Quản trị
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@huedimo.vn"
                className="mt-1.5 w-full rounded-xl border border-admin-border bg-admin-canvas px-4 py-2.5 text-sm text-admin-strong placeholder-admin-subtle transition focus:border-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-admin-body">
                  Mật khẩu
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-xl border border-admin-border bg-admin-canvas px-4 py-2.5 text-sm text-admin-strong placeholder-admin-subtle transition focus:border-slate-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <span>Xác thực Quản trị</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          {/* Preset Hint */}
          <div className="mt-6 rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-950/50 p-3 text-xs text-purple-700/80 dark:text-purple-300">
            <div className="font-semibold text-purple-700 dark:text-purple-300">Tài khoản Admin mặc định:</div>
            <div className="mt-1 flex justify-between">
              <span>Email: <code>admin@huedimo.vn</code></span>
            </div>
            <div className="flex justify-between">
              <span>Mật khẩu: <code>Admin@123456</code></span>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-admin-subtle transition hover:text-admin-strong"
          >
            ← Quay lại trang bản đồ du khách
          </Link>
        </div>
      </div>
    </div>
  );
}
