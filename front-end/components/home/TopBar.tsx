"use client";

import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, MapPin, Sparkles, Route, Globe, Wallet, Trophy, UserRound, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

interface TopBarProps {
  isAddMode?: boolean;
  onAddPlace?: () => void;
  onOpenItinerary?: () => void;
  onOpenSaved?: () => void;
  onOpenCommunity?: () => void;
  onBudget?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
}

export default function TopBar(props: TopBarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const menuRef = useRef<HTMLDialogElement>(null);
  const actions = [
    { label: "Lịch trình của tôi", icon: Route, action: props.onOpenSaved },
    { label: "Khám phá cộng đồng", icon: Globe, action: props.onOpenCommunity },
    { label: "Dự toán chuyến đi", icon: Wallet, action: props.onBudget },
    { label: "Bảng xếp hạng", icon: Trophy, action: props.onOpenLeaderboard },
    { label: props.isAddMode ? "Hủy thêm địa điểm" : "Đóng góp địa điểm", icon: MapPin, action: props.onAddPlace },
  ];
  const runAction = (action?: () => void) => {
    menuRef.current?.close();
    action?.();
  };
  const handleLogout = () => runAction(() => {
    logout();
    props.onLogout?.();
    router.refresh();
  });

  return (
    <header className="app-topbar pointer-events-auto flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm md:px-5 md:py-3">
      <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="HueDiMo — Trang chủ">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="" className="h-9 w-9 rounded-xl object-cover md:h-10 md:w-10" />
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-ink-900">Hue<span className="text-brand-600">DiMo</span></h1>
          <p className="hidden text-xs text-ink-500 md:block">Khám phá Huế theo cách của bạn</p>
        </div>
      </Link>
      <nav aria-label="Chức năng chính" className="hidden items-center gap-1 xl:flex">
        {actions.slice(0, 3).map(({ label, icon: Icon, action }) => action && (
          <button key={label} type="button" onClick={action} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700">
            <Icon size={17} aria-hidden="true" />{label}
          </button>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={props.onOpenItinerary} className="hidden min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 md:flex">
          <Sparkles size={17} aria-hidden="true" />Tạo lịch trình AI
        </button>
        {user ? (
          <button type="button" onClick={props.onOpenProfile} className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700" aria-label={`Hồ sơ ${user.name}`}>
            {user.name.charAt(0).toUpperCase()}
          </button>
        ) : (
          <Link href="/login" className="flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-brand-700 md:px-3">Đăng nhập</Link>
        )}
        <button type="button" onClick={() => menuRef.current?.showModal()} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label="Mở menu">
          <Menu size={21} />
        </button>
      </div>
      <dialog ref={menuRef} aria-labelledby="app-menu-title" className="app-menu m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/40" onClick={(event) => { if (event.target === event.currentTarget) menuRef.current?.close(); }}>
        <div className="mb-4 flex items-center justify-between">
          <div><h2 id="app-menu-title" className="text-lg font-bold">Khám phá HueDiMo</h2><p className="mt-1 text-sm text-slate-500">Mỗi hành trình, một câu chuyện.</p></div>
          <button type="button" onClick={() => menuRef.current?.close()} aria-label="Đóng menu" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100"><X size={21} /></button>
        </div>
        <nav aria-label="Tất cả chức năng" className="space-y-1">
          <button type="button" onClick={() => runAction(props.onOpenItinerary)} className="mb-3 flex min-h-12 w-full items-center gap-3 rounded-xl bg-brand-600 px-4 text-left text-sm font-semibold text-white"><Sparkles size={19} />Tạo lịch trình với AI</button>
          {actions.map(({ label, icon: Icon, action }) => action && <button key={label} type="button" onClick={() => runAction(action)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium hover:bg-brand-50 hover:text-brand-700"><Icon size={19} aria-hidden="true" />{label}</button>)}
          <div className="mt-3 border-t border-slate-100 pt-3">
            {user ? <>
              <button type="button" onClick={() => runAction(props.onOpenProfile)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm hover:bg-slate-50"><UserRound size={19} />Hồ sơ cá nhân</button>
              {user.role === "admin" && <Link href="/admin" className="flex min-h-12 items-center rounded-xl px-3 text-sm font-semibold text-brand-700">Trang quản trị →</Link>}
              <button type="button" onClick={handleLogout} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm text-rose-600 hover:bg-rose-50"><LogOut size={19} />Đăng xuất</button>
            </> : <Link href="/register" className="flex min-h-12 items-center justify-center rounded-xl bg-brand-50 text-sm font-semibold text-brand-700">Tạo tài khoản miễn phí</Link>}
          </div>
        </nav>
      </dialog>
    </header>
  );
}
