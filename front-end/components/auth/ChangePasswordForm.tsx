"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { authFetch, readApiResponse } from "@/lib/api/client";
import { toast } from "@/components/ui/Toast";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export default function ChangePasswordForm({ onChanged }: { onChanged: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !sitekey || !container.current) return;
    const api = (window as Window & { turnstile?: Turnstile }).turnstile;
    if (!api) return;
    widget.current = api.render(container.current, {
      sitekey, action: "change_password", size: "flexible",
      callback: setToken,
      "expired-callback": () => setToken(""),
      "error-callback": () => { setToken(""); setError("Không thể tải CAPTCHA. Hãy mở lại biểu mẫu."); },
    });
    return () => {
      if (widget.current !== null) api.remove(widget.current);
      widget.current = null;
    };
  }, [ready]);

  return (
    <form className="space-y-3" onSubmit={async (event) => {
      event.preventDefault();
      if (busy || !token) return;
      const data = new FormData(event.currentTarget);
      const currentPassword = data.get("currentPassword");
      const newPassword = data.get("newPassword");
      const confirmPassword = data.get("confirmPassword");
      if (newPassword !== confirmPassword) {
        setError("Hai lần nhập mật khẩu mới phải khớp.");
        return;
      }
      setBusy(true);
      setError("");
      try {
        await readApiResponse(await authFetch(`${backend}/api/auth/password`, {
          method: "PATCH",
          body: JSON.stringify({ currentPassword, newPassword, confirmPassword, captchaToken: token }),
        }));
        toast.success("Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
        onChanged();
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Không thể đổi mật khẩu.");
      } finally {
        setBusy(false);
        setToken("");
        if (widget.current !== null) {
          (window as Window & { turnstile?: Turnstile }).turnstile?.reset(widget.current);
        }
      }
    }}>
      {([
        ["currentPassword", "Mật khẩu hiện tại"],
        ["newPassword", "Mật khẩu mới"],
        ["confirmPassword", "Nhập lại mật khẩu mới"],
      ] as const).map(([name, label]) => (
        <label key={name} className="block text-sm font-medium">
          {label}
          <input name={name} type="password" required minLength={name === "currentPassword" ? undefined : 8}
            autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900" />
        </label>
      ))}
      {sitekey ? (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            onReady={() => setReady(true)} onError={() => setError("Không thể tải CAPTCHA.")} />
          <div ref={container} />
        </>
      ) : <p role="status" className="text-sm">Tính năng đổi mật khẩu đang chờ cấu hình CAPTCHA.</p>}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <button type="submit" disabled={busy || !token}
        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Đang đổi mật khẩu…" : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
