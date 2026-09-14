"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/components/ui/Toast";
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ArrowRight } from "lucide-react";

interface AuthFormProps {
  mode: "login" | "register";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { login, register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);

  const isLogin = mode === "login";

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
    setError(null);
    setSubmitting(true);

    try {
      if (isLogin) {
        const res = await login(email, password);
        if (!res.ok) {
          const err = res.error || "Email hoặc mật khẩu không đúng.";
          setError(err);
          toast.error(err, "Đăng nhập thất bại");
          return;
        }
        toast.success("Chào mừng bạn trở lại với HueDiMo!", "Đăng nhập thành công");
      } else {
        const res = await register(name, email, password);
        if (!res.ok) {
          const err = res.error ?? "Đăng ký thất bại.";
          setError(err);
          toast.error(err, "Đăng ký thất bại");
          return;
        }
        toast.success("Tài khoản của bạn đã được khởi tạo!", "Đăng ký thành công");
      }
      router.push("/");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      const redirectTo = `${window.location.origin}/auth/callback`;
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

  const handleFacebookLogin = async () => {
    try {
      setFacebookLoading(true);
      setError(null);
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo,
        },
      });
      if (oauthError) {
        setError(oauthError.message || "Không thể kết nối đến Facebook.");
        toast.error(oauthError.message || "Lỗi Facebook Auth");
        setFacebookLoading(false);
      }
    } catch {
      const msg = "Đã xảy ra lỗi khi kết nối Facebook.";
      setError(msg);
      toast.error(msg);
      setFacebookLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] rounded-[32px] border border-purple-100/90 bg-white/95 p-7 sm:p-9 shadow-[0_20px_60px_-12px_rgba(109,40,217,0.12)] backdrop-blur-2xl transition-all ring-1 ring-purple-500/5">
      {/* Tab Switcher mượt mà giữa Đăng nhập và Đăng ký */}
      <div className="mb-6 flex rounded-2xl bg-purple-100/50 border border-purple-200/50 p-1 text-xs font-semibold text-purple-900/70">
        <Link
          href="/login"
          className={`flex-1 rounded-xl py-2 text-center transition-all ${
            isLogin
              ? "bg-white text-brand-700 shadow-xs font-bold ring-1 ring-purple-200/60"
              : "hover:text-purple-900"
          }`}
        >
          Đăng nhập
        </Link>
        <Link
          href="/register"
          className={`flex-1 rounded-xl py-2 text-center transition-all ${
            !isLogin
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
          {isLogin ? "Mừng bạn trở lại" : "Tạo tài khoản mới"}
        </h1>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          {isLogin
            ? "Đăng nhập để lưu lịch trình và đồng bộ điểm check-in"
            : "Bắt đầu trải nghiệm bản đồ du lịch số Cố đô Huế"}
        </p>
      </div>

      {/* Các nút Social OAuth (Google & Facebook) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Nút Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={submitting || googleLoading || facebookLoading}
          className="group relative flex items-center justify-center gap-2.5 rounded-2xl border border-purple-100/90 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-purple-200 hover:bg-purple-50/40 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
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
          <span>Google</span>
        </button>

        {/* Nút Facebook */}
        <button
          type="button"
          onClick={handleFacebookLogin}
          disabled={submitting || googleLoading || facebookLoading}
          className="group relative flex items-center justify-center gap-2.5 rounded-2xl border border-purple-100/90 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-purple-200 hover:bg-purple-50/40 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {facebookLoading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#1877F2] border-t-transparent" />
          ) : (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
          <span>Facebook</span>
        </button>
      </div>

      {/* Đường phân cách thanh lịch */}
      <div className="relative my-5 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-purple-100" />
        </div>
        <span className="relative bg-white px-3 text-[11px] font-medium tracking-wider text-purple-400 uppercase">
          hoặc email
        </span>
      </div>

      {/* Form nhập thông tin */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {!isLogin && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Họ và tên
            </label>
            <div className="relative flex items-center rounded-2xl border border-purple-100/90 bg-purple-50/25 transition-all focus-within:border-brand-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-500/10">
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
                className="w-full bg-transparent px-3 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Địa chỉ Email
          </label>
          <div className="relative flex items-center rounded-2xl border border-purple-100/90 bg-purple-50/25 transition-all focus-within:border-brand-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-500/10">
            <span className="pl-3.5 text-purple-400">
              <Mail className="h-4 w-4" />
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-transparent px-3 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700">
              Mật khẩu
            </label>
            {isLogin && (
              <span className="text-[11px] font-medium text-brand-600 hover:underline cursor-pointer">
                Quên mật khẩu?
              </span>
            )}
          </div>
          <div className="relative flex items-center rounded-2xl border border-purple-100/90 bg-purple-50/25 transition-all focus-within:border-brand-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-500/10">
            <span className="pl-3.5 text-purple-400">
              <Lock className="h-4 w-4" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              autoComplete={isLogin ? "current-password" : "new-password"}
              className="w-full bg-transparent px-3 py-2.5 pr-10 text-xs text-slate-900 outline-none placeholder:text-slate-400"
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
        </div>

        {/* Thông báo lỗi nội tuyến */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        {/* Nút gửi chính */}
        <button
          type="submit"
          disabled={submitting || googleLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3 text-xs font-semibold text-white shadow-md shadow-brand-600/20 transition-all hover:bg-brand-700 hover:shadow-brand-600/30 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <>
              <span>{isLogin ? "Đăng nhập" : "Tạo tài khoản"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Footer chuyển đổi */}
      <p className="mt-6 text-center text-xs text-slate-500">
        {isLogin ? "Chưa có tài khoản HueDiMo?" : "Đã có tài khoản?"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-bold text-brand-600 hover:text-brand-700 hover:underline"
        >
          {isLogin ? "Đăng ký ngay" : "Đăng nhập"}
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
