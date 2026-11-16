"use client";

import { useState } from "react";
import { authFetch, readApiResponse } from "@/lib/api/client";
import { toast } from "@/components/ui/Toast";
import { useOtpCooldown } from "@/lib/auth/useOtpCooldown";

const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export default function ChangePasswordForm({ onChanged }: { onChanged: () => void }) {
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { remaining, startCooldown, resumeCooldown } = useOtpCooldown("change-password");

  async function requestOtp() {
    if (sending || busy || remaining > 0) return;
    setSending(true);
    setError("");
    try {
      await readApiResponse(await authFetch(`${backend}/api/auth/password/otp`, { method: "POST" }));
      setOtp("");
      setSent(true);
      startCooldown();
    } catch (failure) {
      if (!resumeCooldown(failure)) {
        setError(failure instanceof Error ? failure.message : "Không thể gửi mã OTP.");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={async (event) => {
      event.preventDefault();
      if (busy || sending || !sent || otp.length !== 6) return;
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
          body: JSON.stringify({ currentPassword, newPassword, confirmPassword, otp }),
        }));
        toast.success("Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
        onChanged();
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Không thể đổi mật khẩu.");
      } finally {
        setBusy(false);
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
      <div className="flex flex-wrap items-end gap-2">
        {sent && (
          <label className="block min-w-36 flex-1 text-sm font-medium">
            Mã OTP qua email
            <input name="change-password-otp" type="text" inputMode="numeric"
              autoComplete="section-change-otp one-time-code"
              required maxLength={6} pattern="[0-9]{6}" value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900" />
          </label>
        )}
        <button type="button" onClick={requestOtp} disabled={sending || busy || remaining > 0}
          className="rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 disabled:opacity-50">
          {sending ? "Đang gửi…" : remaining > 0 ? `Gửi lại mã (${remaining}s)` : sent ? "Gửi lại mã" : "Gửi mã OTP"}
        </button>
      </div>
      {sent && <p role="status" className="text-sm">Mã đã được gửi đến email tài khoản và có hiệu lực trong 5 phút.</p>}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <button type="submit" disabled={busy || sending || !sent || otp.length !== 6}
        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Đang đổi mật khẩu…" : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
