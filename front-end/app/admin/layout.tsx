"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import UserAvatar from "@/components/ui/UserAvatar";
import { AdminThemeProvider, AdminThemeToggle } from "@/components/admin/AdminThemeProvider";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { LayoutDashboard, MapPin, Users, Route, MessageSquare, Sparkles, ScrollText, ArrowUpRight, Menu, X, LogOut, ArrowLeft } from "lucide-react";

const subscribeToMount = () => () => { };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminThemeProvider><AdminLayoutContent>{children}</AdminLayoutContent></AdminThemeProvider>;
}

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDialogElement>(null);
  const mounted = useSyncExternalStore(subscribeToMount, () => true, () => false);

  // Auth Guard: Bỏ qua trang /admin/login
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!mounted || isLoading) return;
    if (isLoginPage) return;

    if (!user) {
      router.replace("/admin/login");
    } else if (user.role !== "admin") {
      alert("Bạn không có quyền truy cập trang quản trị!");
      router.replace("/");
    }
  }, [user, isLoading, isLoginPage, mounted, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  // SSR + client initial render: always return null to prevent hydration mismatch.
  // The server never knows auth state, so we must render nothing until client mounts.
  if (!mounted) return null;

  // After client mount: show loading or redirect guard
  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-admin-canvas text-admin-strong">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="text-sm font-medium text-admin-subtle">Đang xác thực quyền Quản trị viên...</p>
        </div>
      </div>
    );
  }


  const navItems = [
    { label: "Tổng quan", href: "/admin", icon: LayoutDashboard },
    { label: "Địa điểm", href: "/admin/places", icon: MapPin },
    { label: "Người dùng", href: "/admin/users", icon: Users },
    { label: "Lịch trình", href: "/admin/itineraries", icon: Route },
    { label: "Đánh giá", href: "/admin/reviews", icon: MessageSquare },
    { label: "Cấu hình AI", href: "/admin/ai-settings", icon: Sparkles },
    { label: "Nhật ký hệ thống", href: "/admin/logs", icon: ScrollText },
  ];
  const currentPage = navItems.find((item) => item.href === pathname)?.label || "Quản trị";
  const navigation = <>
    <Link href="/admin" onClick={() => sidebarRef.current?.close()} className="mb-8 flex items-center gap-3 px-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.jpg" alt="" className="h-10 w-10 rounded-xl object-cover" />
      <div><span className="text-xl font-extrabold tracking-tight text-admin-strong">Hue<span className="text-admin-accent-ink">DiMo</span></span><p className="mt-0.5 text-xs font-medium text-admin-subtle">Không gian quản trị</p></div>
    </Link>
    <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-widest text-admin-subtle">Quản lý nội dung</p>
    <nav aria-label="Điều hướng quản trị" className="space-y-1">
      {navItems.map(({ label, href, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => sidebarRef.current?.close()} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${pathname === href ? "bg-admin-accent text-admin-accent-ink" : "text-admin-body hover:bg-admin-canvas hover:text-admin-strong"}`}><Icon size={19} aria-hidden="true" />{label}</Link>)}
    </nav>
    <div className="mt-auto space-y-3 border-t border-admin-border pt-5">
      <a href="http://huedimobe.hungthaisoft.id.vn/api/docs" target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between rounded-xl px-3 text-sm text-admin-subtle hover:bg-admin-canvas">Tài liệu API<ArrowUpRight size={16} /></a>
      <Link href="/" className="flex min-h-11 items-center gap-2 rounded-xl bg-admin-canvas px-3 text-sm font-medium text-admin-body"><ArrowLeft size={17} />Về bản đồ du lịch</Link>
      <div className="flex items-center gap-3 rounded-xl border border-admin-border p-3">
        <UserAvatar user={user} className="h-10 w-10" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-admin-strong">{user.name}</p><p className="text-xs text-admin-subtle">Quản trị viên</p></div>
        <button type="button" aria-label="Đăng xuất" onClick={() => { logout(); router.push("/admin/login"); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-admin-subtle hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-300"><LogOut size={18} /></button>
      </div>
    </div>
  </>;

  return (
    <div className="admin-shell flex w-full bg-admin-canvas text-admin-strong">
      <aside className="hidden w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-admin-border bg-admin-surface p-5 lg:flex">{navigation}</aside>
      <dialog ref={sidebarRef} aria-label="Menu quản trị" className="admin-drawer m-0 h-full max-h-none w-[min(20rem,100%-2rem)] max-w-none border-0 bg-admin-surface p-5 text-admin-strong backdrop:bg-slate-950/40" onClick={(event) => { if (event.target === event.currentTarget) sidebarRef.current?.close(); }}>
        <button type="button" onClick={() => sidebarRef.current?.close()} aria-label="Đóng menu quản trị" className="mb-3 ml-auto flex h-11 w-11 items-center justify-center rounded-xl bg-admin-canvas"><X size={20} /></button>
        <div className="flex min-h-[calc(100%-4rem)] flex-col gap-1">{navigation}</div>
      </dialog>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="admin-header flex shrink-0 items-center justify-between gap-3 border-b border-admin-border bg-admin-surface px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => sidebarRef.current?.showModal()} aria-label="Mở menu quản trị" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-admin-border lg:hidden"><Menu size={21} /></button>
            <div className="min-w-0"><p className="text-xs text-admin-subtle">HueDiMo / Quản trị</p><p className="truncate text-sm font-semibold text-admin-strong">{currentPage}</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
          <AdminThemeToggle />
          <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-admin-border px-3 text-xs font-medium text-admin-body hover:bg-admin-canvas">Xem website<ArrowUpRight size={16} /></Link>
          </div>
        </header>
        <main className="admin-content min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 xl:p-8"><div className="mx-auto flex min-h-full w-full max-w-[1440px] flex-col">{children}</div></main>
      </div>
    </div>
  );
}
