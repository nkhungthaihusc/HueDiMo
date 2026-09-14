"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 font-sans text-slate-100">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 relative h-16 w-16 overflow-hidden rounded-2xl shadow-xl shadow-purple-900/50 ring-2 ring-purple-500/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/avatars/473616240_1779979822801506_5513169442076253620_n.jpg"
              alt="HueDiMo Admin"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">HueDiMo Console</h1>
          <p className="mt-1 text-xs text-purple-400 font-medium">
            Di sản văn hóa với hội nhập và phát triển
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Hệ thống Quản trị & Điều hành Dữ liệu Du lịch Huế
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          {errorMsg && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-medium text-red-400">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Email Quản trị
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@huedimo.vn"
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Mật khẩu
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-900/30 transition hover:bg-purple-500 disabled:opacity-50"
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
          <div className="mt-6 rounded-xl border border-purple-900/30 bg-purple-950/20 p-3 text-xs text-purple-300/80">
            <div className="font-semibold text-purple-200">Tài khoản Admin mặc định:</div>
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
            className="text-xs font-medium text-slate-400 transition hover:text-slate-200"
          >
            ← Quay lại trang bản đồ du khách
          </Link>
        </div>
      </div>
    </div>
  );
}
