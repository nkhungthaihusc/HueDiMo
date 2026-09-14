"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Prevents hydration mismatch: loading UI only rendered after client mount
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth Guard: Bỏ qua trang /admin/login
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoading) return;
    if (isLoginPage) return;

    if (!user) {
      router.replace("/admin/login");
    } else if (user.role !== "admin") {
      alert("Bạn không có quyền truy cập trang quản trị!");
      router.replace("/");
    }
  }, [user, isLoading, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  // SSR + client initial render: always return null to prevent hydration mismatch.
  // The server never knows auth state, so we must render nothing until client mounts.
  if (!mounted) return null;

  // After client mount: show loading or redirect guard
  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-400">Đang xác thực quyền Quản trị viên...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: "📊" },
    { label: "Quản lý Địa điểm", href: "/admin/places", icon: "📍" },
    { label: "Quản lý Người dùng", href: "/admin/users", icon: "👥" },
    { label: "Đánh giá & Phản hồi", href: "/admin/reviews", icon: "💬" },
    { label: "Nhật ký API (Logs)", href: "/admin/logs", icon: "⚡" },
    { label: "Tài liệu API (Swagger)", href: "http://localhost:3002/api/docs", icon: "📖", external: true },
  ];


  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-purple-600 selection:text-white">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-900/95 p-5 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo & Brand */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl shadow-lg shadow-purple-900/40 ring-1 ring-purple-500/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/avatars/473616240_1779979822801506_5513169442076253620_n.jpg"
                alt="HueDiMo Admin"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <div className="text-lg font-bold tracking-wide text-white leading-tight">
                Hue<span className="text-purple-400">DiMo</span>
              </div>
              <div className="text-[11px] font-semibold tracking-wider text-purple-400 uppercase leading-none mt-0.5">
                Console Admin
              </div>
              <div className="text-[9px] font-medium text-slate-400 leading-none mt-1">
                Di sản văn hóa với hội nhập và phát triển
              </div>
            </div>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            ✕
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="mt-6 flex-1 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            Quản trị hệ thống
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-100"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="ml-auto text-xs text-slate-600">↗</span>
                </a>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40 font-semibold"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Back to Client Web */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl bg-slate-800/50 px-3.5 py-2.5 text-sm font-medium text-purple-300 transition hover:bg-purple-950/40 hover:text-purple-200 border border-purple-800/20"
          >
            <span>🗺️</span>
            <span>Về Bản Đồ Du Khách</span>
          </Link>

          {/* User profile & Logout */}
          <div className="flex items-center justify-between rounded-xl bg-slate-950/80 p-3 border border-slate-800/60">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-700 text-sm font-bold text-white shadow">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="truncate text-xs font-semibold text-white">{user.name}</div>
                <div className="text-[10px] text-purple-400 font-medium capitalize">
                  {user.role}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                router.push("/admin/login");
              }}
              title="Đăng xuất"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-950/50 hover:text-red-400 transition"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            >
              ☰
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Admin</span>
              <span>/</span>
              <span className="font-semibold text-slate-100 capitalize">
                {pathname.split("/")[2] || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Hệ thống Hoạt động</span>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 flex flex-col p-6 md:p-8 min-h-0">{children}</main>
      </div>
    </div>
  );
}
