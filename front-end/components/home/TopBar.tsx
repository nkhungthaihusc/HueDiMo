"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";

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

export default function TopBar({
  isAddMode,
  onAddPlace,
  onOpenItinerary,
  onOpenSaved,
  onOpenCommunity,
  onBudget,
  onOpenLeaderboard,
  onOpenProfile,
  onLogout,
}: TopBarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const {
    containerRef: navScrollRef,
    hasDraggedRef: hasNavDraggedRef,
    dragProps: navDragProps,
  } = useHorizontalScroll<HTMLDivElement>({ scrollAmount: 160, wheelMultiplier: 1.1 });

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    router.refresh();
  };

  return (
    <header className="glass-strong pointer-events-auto flex items-center justify-between gap-2 sm:gap-4 rounded-3xl border border-white/70 px-3 sm:px-5 py-2.5 sm:py-3 shadow-xl backdrop-blur-xl">
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-brand-600 to-indigo-600 p-0.5 shadow-md shadow-brand-500/20">
          <img
            src="/logo.jpg"
            alt="HueDiMo Logo"
            className="h-full w-full rounded-[14px] object-cover"
          />
        </div>
        <div className="flex flex-col select-none">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-ink-900 leading-none">
            Hue<span className="text-brand-600">DiMo</span>
          </h1>
          <span className="hidden sm:inline-block text-[10px] sm:text-[11px] font-medium text-ink-500 tracking-tight mt-0.5">
            Di sản văn hóa với hội nhập và phát triển
          </span>
        </div>
      </div>

      <div
        ref={navScrollRef}
        {...navDragProps}
        className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-ink-700 select-none overflow-x-auto no-scrollbar py-0.5 cursor-grab active:cursor-grabbing touch-pan-x overscroll-x-contain"
      >
        {onOpenLeaderboard && (
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 px-2.5 sm:px-3 py-1.5 text-amber-900 font-bold transition shadow-xs cursor-pointer select-none"
            title="Bảng xếp hạng du khách"
          >
            <span className="pointer-events-none select-none">🏆</span>
            <span className="hidden md:inline pointer-events-none select-none">BXH Du Khách</span>
          </button>
        )}

        {onOpenSaved && (
          <button
            type="button"
            onClick={onOpenSaved}
            className="shrink-0 rounded-xl bg-white/70 px-2.5 sm:px-3 py-1.5 text-ink-800 transition hover:bg-white border border-slate-200/60 cursor-pointer select-none"
          >
            <span className="pointer-events-none select-none">🛠</span> <span className="hidden sm:inline pointer-events-none select-none">Lộ trình</span>
          </button>
        )}

        {onOpenCommunity && (
          <button
            type="button"
            onClick={onOpenCommunity}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200/80 px-2.5 sm:px-3 py-1.5 text-indigo-900 font-bold transition shadow-xs cursor-pointer select-none"
            title="Lịch trình chia sẻ từ cộng đồng du khách"
          >
            <span className="pointer-events-none select-none">🌍</span>
            <span className="hidden sm:inline pointer-events-none select-none">Cộng đồng</span>
          </button>
        )}

        {onBudget && (
          <button
            type="button"
            onClick={onBudget}
            className="shrink-0 rounded-xl bg-white/70 px-2.5 sm:px-3 py-1.5 text-ink-800 transition hover:bg-white border border-slate-200/60 cursor-pointer select-none"
          >
            <span className="pointer-events-none select-none">💰</span> <span className="hidden sm:inline pointer-events-none select-none">Dự toán</span>
          </button>
        )}

        {onOpenItinerary && (
          <button
            type="button"
            onClick={onOpenItinerary}
            className="shrink-0 rounded-xl bg-emerald-600 px-3 sm:px-3.5 py-1.5 text-white font-semibold transition hover:bg-emerald-700 shadow-sm cursor-pointer select-none"
          >
            <span className="pointer-events-none select-none">✨</span> <span className="hidden sm:inline pointer-events-none select-none">Lộ trình AI</span>
          </button>
        )}

        {onAddPlace && (
          <button
            type="button"
            onClick={onAddPlace}
            className={`shrink-0 cursor-pointer select-none ${isAddMode
                ? "rounded-xl bg-emerald-700 px-2.5 sm:px-3 py-1.5 text-white transition hover:bg-emerald-800"
                : "rounded-xl bg-emerald-50 px-2.5 sm:px-3 py-1.5 text-emerald-700 border border-emerald-200/60 transition hover:bg-emerald-100"
              }`}
          >
            <span className="pointer-events-none select-none">{isAddMode ? "Hủy" : "+ Địa Điểm"}</span>
          </button>
        )}

        {user ? (
          <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 pl-1 border-l border-slate-200 dark:border-slate-700">
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="shrink-0 flex items-center gap-1 rounded-xl bg-purple-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-950 cursor-pointer select-none"
              >
                <span className="pointer-events-none select-none">⚙️</span>
                <span className="hidden lg:inline pointer-events-none select-none">Admin</span>
              </Link>
            )}

            {/* Profile Avatar / Name button */}
            <button
              type="button"
              onClick={onOpenProfile}
              className="shrink-0 flex items-center gap-1.5 sm:gap-2 rounded-xl p-1 pr-2 hover:bg-slate-100/80 transition cursor-pointer select-none"
              title="Xem và chỉnh sửa hồ sơ cá nhân"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-emerald-100 ring-2 ring-emerald-500/20 flex items-center justify-center pointer-events-none">
                {(user.avatarUrl || user.avatar_url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl || user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-emerald-700">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-left hidden sm:block pointer-events-none">
                <p className="text-xs font-bold text-slate-800 leading-tight max-w-[90px] truncate">
                  {user.name}
                </p>
                <p className="text-[10px] text-amber-600 font-extrabold leading-none">
                  {user.points || 0} pts
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-xl px-2 sm:px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer select-none"
              title="Đăng xuất"
            >
              <span className="pointer-events-none select-none">Thoát</span>
            </button>
          </div>
        ) : (
          <div className="shrink-0 flex items-center gap-1 sm:gap-1.5 pl-1 border-l border-slate-200">
            <Link
              href="/login"
              className="shrink-0 whitespace-nowrap rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition hover:bg-white/70 cursor-pointer select-none"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="shrink-0 whitespace-nowrap rounded-xl bg-emerald-600 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 shadow-sm cursor-pointer select-none"
            >
              Đăng ký
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
