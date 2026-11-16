"use client";

import { useRef, useState, type FormEvent } from "react";
import { authFetch, readApiResponse } from "@/lib/api/client";
import { toast } from "@/components/ui/Toast";
import OtpVerificationDialog, { type OtpVerificationDialogHandle } from "@/components/auth/OtpVerificationDialog";

const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export default function ChangePasswordForm({ email, onChanged }: { email: string; onChanged: () => void }) {
  const otpDialog = useRef<OtpVerificationDialogHandle>(null);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const currentPassword = data.get("currentPassword");
    const newPassword = data.get("newPassword");
    const confirmPassword = data.get("confirmPassword");
    if (newPassword !== confirmPassword) {
      setError("Hai lần nhập mật khẩu mới phải khớp.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }
    if (typeof newPassword !== "string" || new TextEncoder().encode(newPassword).length > 72) {
      setError("Mật khẩu mới phải có tối đa 72 byte.");
      return;
    }
    setError("");
    otpDialog.current?.open({
      scope: `change-password:${email}`,
      deliveryMessage: `Nhập mã gửi đến ${email}. Mã có hiệu lực trong 5 phút.`,
      requestCode: async () => readApiResponse(await authFetch(`${backend}/api/auth/password/otp`, { method: "POST" })),
      confirmCode: async (otp) => {
        await readApiResponse(await authFetch(`${backend}/api/auth/password`, {
          method: "PATCH",
          body: JSON.stringify({ currentPassword, newPassword, confirmPassword, otp }),
        }));
        toast.success("Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
        onChanged();
      },
    });
  }

  return (
    <>
      <form className="space-y-3" onSubmit={handleSubmit}>
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
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          Đổi mật khẩu
        </button>
      </form>
      <OtpVerificationDialog ref={otpDialog} />
    </>
  );
}
