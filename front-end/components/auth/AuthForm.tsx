"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { getOAuthRedirectUrl } from "@/lib/auth/oauth";
import OtpVerificationDialog, { type OtpChallenge, type OtpVerificationDialogHandle } from "@/components/auth/OtpVerificationDialog";
import { toast } from "@/components/ui/Toast";
import { ApiError, apiFetch } from "@/lib/api/client";
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ArrowRight } from "lucide-react";

interface AuthFormProps {
  mode: "login" | "register" | "reset";
}

const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { login, register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const otpDialog = useRef<OtpVerificationDialogHandle>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isLogin = mode === "login";
  const isReset = mode === "reset";
  const isRegister = mode === "register";

  // Lắng nghe lỗi từ callback URL (nếu có)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err === "oauth_failed") {
        const msg = "Đăng nhập mạng xã hội thất bại hoặc bị hủy.";
        setError(msg);
        toast.error(msg, "Lỗi đăng nhập");
      } else if (err === "sync_failed") {
        const msg = "Không thể đồng bộ tài khoản mạng xã hội vào hệ thống.";
        setError(msg);
        toast.error(msg, "Lỗi đồng bộ");
      } else if (err === "oauth_timeout") {
        const msg = "Quá thời gian chờ phản hồi từ nhà cung cấp.";
        setError(msg);
        toast.warning(msg, "Hết thời gian chờ");
      }
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || googleLoading) return;
    if (isRegister && !name.trim()) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }
    if (isReset && resetToken && password !== confirmPassword) {
      setError("Hai lần nhập mật khẩu mới phải khớp.");
      return;
    }
    if ((isRegister || (isReset && resetToken)) && new TextEncoder().encode(password).length > 72) {
      setError("Mật khẩu phải có tối đa 72 byte.");
      return;
    }
    setError(null);
    const targetEmail = email.trim().toLowerCase();
    if (isRegister || (isReset && !resetToken)) {
      const challenge: OtpChallenge = {
        scope: `${mode}:${targetEmail}`,
        deliveryMessage: `Nhập mã gửi đến ${targetEmail}. Mã có hiệu lực trong 5 phút.`,
        confirmLabel: isReset ? "Xác minh OTP" : undefined,
        requestCode: async () => {
          const result = await apiFetch<{ sent: boolean }>(`${backend}/api/auth/${isReset ? "password/reset/otp" : "register/otp"}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: targetEmail }),
          });
          if (isReset && result.sent !== true) throw new Error("Máy chủ chưa xác nhận gửi mã OTP. Vui lòng thử lại.");
        },
        confirmCode: async (otp) => {
          if (isReset) {
            const result = await apiFetch<{ resetToken: string }>(`${backend}/api/auth/password/reset/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: targetEmail, otp }),
            });
            setResetToken(result.resetToken);
            return;
          }
          const res = await register(name, targetEmail, password, otp);
          if (!res.ok) throw new Error(res.error ?? "Đăng ký thất bại.");
          toast.success("Tài khoản của bạn đã được khởi tạo!", "Đăng ký thành công");
          router.push("/");
        },
      };
      if (isReset) {
        setSubmitting(true);
        try {
          await otpDialog.current?.openAfterSend(challenge);
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : "Không thể gửi mã OTP.");
        } finally {
          setSubmitting(false);
        }
      } else {
        otpDialog.current?.open(challenge);
      }
      return;
    }

    setSubmitting(true);

    try {
      if (isReset) {
        await apiFetch(`${backend}/api/auth/password/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: targetEmail, resetToken, newPassword: password, confirmPassword }),
        });
        toast.success("Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.");
        router.push("/login");
        return;
      }
      const res = await login(email, password);
      if (!res.ok) {
        const err = res.error || "Email hoặc mật khẩu không đúng.";
        setError(err);
        toast.error(err, "Đăng nhập thất bại");
        return;
      }
      toast.success("Chào mừng bạn trở lại với HueDiMo!", "Đăng nhập thành công");
      router.push("/");
    } catch (failure) {
      if (isReset && failure instanceof ApiError &&
          (failure.details as { field?: string } | undefined)?.field === "resetToken") {
        setResetToken("");
        setPassword("");
        setConfirmPassword("");
      }
      setError(failure instanceof Error ? failure.message : "Không thể hoàn tất yêu cầu.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      const redirectTo = getOAuthRedirectUrl(window.location.origin);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (oauthError) {
        setError(oauthError.message || "Không thể kết nối đến Google.");
        toast.error(oauthError.message || "Lỗi Google Auth");
        setGoogleLoading(false);
      }
    } catch {
      const msg = "Đã xảy ra lỗi khi kết nối Google.";
      setError(msg);
      toast.error(msg);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
      {/* Tab Switcher mượt mà giữa Đăng nhập và Đăng ký */}
      <div className="mb-6 flex rounded-2xl bg-purple-100/50 border border-purple-200/50 p-1 text-xs font-semibold text-purple-900/70">
        <Link
          href="/login"
          className={`flex-1 rounded-xl py-3 text-center transition-ui ${
            isLogin
              ? "bg-white text-brand-700 shadow-xs font-bold ring-1 ring-purple-200/60"
              : "hover:text-purple-900"
          }`}
        >
          Đăng nhập
        </Link>
        <Link
          href="/register"
          className={`flex-1 rounded-xl py-3 text-center transition-ui ${
              isRegister
              ? "bg-white text-brand-700 shadow-xs font-bold ring-1 ring-purple-200/60"
              : "hover:text-purple-900"
          }`}
        >
          Đăng ký
        </Link>
      </div>

      {/* Header tinh gọn, không rườm rà */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[26px]">
          {isReset ? (resetToken ? "Đặt lại mật khẩu" : "Quên mật khẩu") : isLogin ? "Mừng bạn trở lại" : "Tạo tài khoản mới"}
        </h1>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          {isReset
            ? resetToken ? "Email đã được xác minh. Hãy nhập mật khẩu mới." : "Nhập email tài khoản HueDiMo để nhận mã đặt lại mật khẩu."
            : isLogin
            ? "Đăng nhập để lưu lịch trình và đồng bộ điểm check-in"
            : "Bắt đầu trải nghiệm bản đồ du lịch số Cố đô Huế"}
        </p>
      </div>

      {!isReset && <div className="grid">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={submitting || googleLoading}
          className="group relative flex items-center justify-center min-h-11 gap-2.5 rounded-xl border border-purple-100/90 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition-ui hover:border-purple-200 hover:bg-purple-50/40 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          ) : (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Tiếp tục với Google</span>
        </button>

      </div>}

      {/* Đường phân cách thanh lịch */}
      {!isReset && <div className="relative my-5 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-purple-100" />
        </div>
        <span className="relative bg-white px-3 text-[11px] font-medium tracking-wider text-purple-400 uppercase">
          hoặc email
        </span>
      </div>}

      {/* Form nhập thông tin */}
      <form onSubmit={handleSubmit} className="auth-form flex flex-col gap-3.5">
        {isRegister && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Họ và tên
            </label>
            <div className="relative flex items-center rounded-2xl border border-purple-100/90 bg-purple-50/25 transition-ui focus-within:border-slate-400 focus-within:bg-white">
              <span className="pl-3.5 text-purple-400">
                <UserIcon className="h-4 w-4" />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
                className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Địa chỉ Email
          </label>
          <div className="relative flex items-center rounded-2xl border border-purple-100/90 bg-purple-50/25 transition-ui focus-within:border-slate-400 focus-within:bg-white">
            <span className="pl-3.5 text-purple-400">
              <Mail className="h-4 w-4" />
            </span>
            <input
              id="auth-email"
              type="email"
              required
              maxLength={254}
              readOnly={submitting || Boolean(resetToken)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {(!isReset || resetToken) && <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700">
              {isReset ? "Mật khẩu mới" : "Mật khẩu"}
            </label>
            {isLogin && (
              <Link href="/forgot-password" className="text-[11px] font-medium text-brand-600 hover:underline">
                Quên mật khẩu?
              </Link>
            )}
          </div>
          <div className="relative flex items-center rounded-2xl border border-purple-100/90 bg-purple-50/25 transition-ui focus-within:border-slate-400 focus-within:bg-white">
            <span className="pl-3.5 text-purple-400">
              <Lock className="h-4 w-4" />
            </span>
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={isReset ? 8 : isRegister ? 6 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isReset ? "Tối thiểu 8 ký tự" : isRegister ? "Tối thiểu 6 ký tự" : undefined}
              autoComplete={isLogin ? "current-password" : "new-password"}
              className="w-full bg-transparent px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute right-3 text-slate-400 transition hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>}

        {isReset && resetToken && (
          <label className="block text-xs font-semibold text-slate-700">
            Nhập lại mật khẩu mới
            <input type="password" required minLength={8} autoComplete="new-password"
              value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-purple-100 bg-purple-50/25 px-3 py-2.5 text-sm" />
          </label>
        )}
        {/* Thông báo lỗi nội tuyến */}
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        {/* Nút gửi chính */}
        <button
          type="submit"
          disabled={submitting || googleLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3 text-xs font-semibold text-white shadow-md shadow-brand-600/20 transition-ui hover:bg-brand-700 hover:shadow-brand-600/30 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <>
              <span>{isReset ? (resetToken ? "Đặt lại mật khẩu" : "Gửi mã OTP") : isLogin ? "Đăng nhập" : "Tạo tài khoản"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </form>
      {!isLogin && <OtpVerificationDialog ref={otpDialog} />}

      {/* Footer chuyển đổi */}
      <p className="mt-6 text-center text-xs text-slate-500">
        {!isReset && (isLogin ? "Chưa có tài khoản HueDiMo? " : "Đã có tài khoản? ")}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-bold text-brand-600 hover:text-brand-700 hover:underline"
        >
          {isReset ? "Quay lại đăng nhập" : isLogin ? "Đăng ký ngay" : "Đăng nhập"}
        </Link>
      </p>

      {/* Điều khoản & Quyền riêng tư */}
      <p className="mt-4 text-center text-[11px] text-slate-400">
        Bằng việc tiếp tục, bạn đồng ý với{" "}
        <Link href="/terms" className="underline hover:text-slate-600 transition">
          Điều khoản
        </Link>{" "}
        &amp;{" "}
        <Link href="/privacy" className="underline hover:text-slate-600 transition">
          Chính sách quyền riêng tư
        </Link>
      </p>
    </div>
  );
}
