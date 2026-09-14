"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { oauthLoginUser } from "@/lib/auth/logic";
import { toast } from "@/components/ui/Toast";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [statusText, setStatusText] = useState("Đang kết nối tài khoản...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const handleOAuthSync = async () => {
      try {
        // Lấy session từ Supabase sau khi Google / Facebook redirect về
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw new Error(error.message || "Xác thực qua Supabase thất bại.");
        }

        let targetUser = session?.user;

        // Nếu chưa có session ngay, lắng nghe qua onAuthStateChange
        if (!targetUser) {
          const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
            if (currentSession?.user && active) {
              authListener.subscription.unsubscribe();
              await syncWithBackend(currentSession.user);
            }
          });

          // Timeout 6 giây nếu không nhận được session
          setTimeout(() => {
            if (active && !targetUser) {
              authListener.subscription.unsubscribe();
              setErrorMsg("Không tìm thấy phiên đăng nhập. Đang quay lại trang đăng nhập...");
              setTimeout(() => router.replace("/login?error=oauth_timeout"), 1500);
            }
          }, 6000);
          return;
        }

        if (active) {
          await syncWithBackend(targetUser);
        }
      } catch (err: any) {
        if (active) {
          setErrorMsg(err.message || "Đã xảy ra lỗi khi đăng nhập.");
          setTimeout(() => router.replace("/login?error=oauth_failed"), 2000);
        }
      }
    };

    const syncWithBackend = async (oauthUser: any) => {
      const provider = oauthUser.app_metadata?.provider || "oauth";
      const providerName =
        provider === "google"
          ? "Google"
          : provider === "facebook"
          ? "Facebook"
          : "mạng xã hội";

      setStatusText(`Đang đồng bộ hồ sơ HueDiMo từ ${providerName}...`);

      const metadata = oauthUser.user_metadata || {};
      const name =
        metadata.full_name ||
        metadata.name ||
        metadata.user_name ||
        oauthUser.email?.split("@")[0] ||
        "Người dùng";

      // Xử lý avatar an toàn cho cả Google và Facebook (Facebook đôi khi trả về object picture.data.url)
      let avatarUrl = metadata.avatar_url;
      if (!avatarUrl && metadata.picture) {
        if (typeof metadata.picture === "string") {
          avatarUrl = metadata.picture;
        } else if (typeof metadata.picture === "object" && metadata.picture.data?.url) {
          avatarUrl = metadata.picture.data.url;
        }
      }
      avatarUrl = typeof avatarUrl === "string" ? avatarUrl : "";

      const email = oauthUser.email || `${oauthUser.id}@${provider}.huedimo.vn`;

      const res = await oauthLoginUser(email, name, avatarUrl, provider);
      if (res.ok) {
        toast.success(`Xin chào ${name}!`, `Đăng nhập ${providerName} thành công`);
        // Kích hoạt sự kiện để AuthProvider cập nhật session
        window.dispatchEvent(new Event("huedimo-session-changed"));
        router.replace("/");
      } else {
        const msg = res.error || "Không thể khởi tạo phiên làm việc tại hệ thống.";
        setErrorMsg(msg);
        toast.error(msg, "Lỗi đồng bộ");
        setTimeout(() => router.replace("/login?error=sync_failed"), 2000);
      }
    };

    handleOAuthSync();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50/60 via-amber-50/40 to-sky-50/50 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-brand-200/60 bg-white/80 p-8 text-center shadow-xl backdrop-blur-xl">
        {errorMsg ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-2xl text-red-600 shadow-sm">
              ⚠️
            </div>
            <h3 className="text-lg font-bold text-ink-900">Đăng nhập thất bại</h3>
            <p className="text-xs text-red-600 leading-relaxed">{errorMsg}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-brand-400/20" />
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink-900">{statusText}</h3>
              <p className="mt-1 text-xs text-ink-500">Vui lòng không đóng trình duyệt lúc này...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
