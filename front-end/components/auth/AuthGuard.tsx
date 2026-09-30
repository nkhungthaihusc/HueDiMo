"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSession, getAccessToken } from "@/lib/auth/logic";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/auth/callback",
  "/admin/login",
  "/privacy",
  "/terms",
  "/data-deletion",
];

function checkIsPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)));
}

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Bỏ qua các route tĩnh / asset hoặc API
    if (pathname.startsWith("/api") || pathname.includes(".")) {
      return;
    }

    const isPublic = checkIsPublic(pathname);
    const hasSession = Boolean(getSession() && getAccessToken());

    if (!hasSession && !isPublic) {
      // Chưa đăng nhập và vào trang yêu cầu đăng nhập
      const redirectParam = pathname !== "/" ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${redirectParam}`);
    } else if (hasSession && (pathname === "/login" || pathname === "/register")) {
      // Đã đăng nhập nhưng vẫn vào /login hoặc /register -> Đưa về trang chủ
      router.replace("/");
    }
  }, [pathname, user, mounted, router]);

  // Kiểm tra trạng thái hiện tại
  const isPublic = checkIsPublic(pathname);

  // Trước khi mounted trên client, server và client render giống nhau (children)
  // để tránh Hydration Mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  const hasSession = Boolean(getSession() && getAccessToken());

  // Trong lúc đang kiểm tra phiên làm việc mà chưa đăng nhập tại trang được bảo vệ
  if (!isPublic && !hasSession) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-brand-50 via-white to-amber-50/50 p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-brand-400/20" />
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink-900">HueDiMo</h3>
            <p className="mt-1 text-xs text-ink-500">Đang chuyển hướng đến trang đăng nhập...</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
