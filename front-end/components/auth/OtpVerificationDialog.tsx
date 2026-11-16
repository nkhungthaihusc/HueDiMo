"use client";

import { useEffect, useId, useImperativeHandle, useRef, useState, type FormEvent, type Ref } from "react";
import { useOtpCooldown } from "@/lib/auth/useOtpCooldown";

export interface OtpChallenge {
  scope: string;
  deliveryMessage: string;
  confirmLabel?: string;
  requestCode: () => Promise<unknown>;
  confirmCode: (otp: string) => Promise<void>;
}

export interface OtpVerificationDialogHandle {
  open: (challenge: OtpChallenge) => void;
  openAfterSend: (challenge: OtpChallenge) => Promise<void>;
}

export default function OtpVerificationDialog({ ref }: { ref: Ref<OtpVerificationDialogHandle> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { remainingFor, startCooldown, resumeCooldown } = useOtpCooldown();
  const remaining = challenge ? remainingFor(challenge.scope) : 0;

  useEffect(() => {
    if (challenge && sent && !sending) codeInput.current?.focus();
  }, [challenge, sent, sending]);

  async function requestCode(current: OtpChallenge) {
    setSending(true);
    setError("");
    try {
      await current.requestCode();
      setSent(true);
      setOtp("");
      startCooldown(current.scope);
    } catch (failure) {
      if (resumeCooldown(current.scope, failure)) {
        setSent(true);
      } else {
        setError(failure instanceof Error ? failure.message : "Không thể gửi mã OTP. Vui lòng thử lại.");
      }
    } finally {
      setSending(false);
    }
  }

  useImperativeHandle(ref, () => {
    function show(current: OtpChallenge, codeSent: boolean) {
      if (!dialog.current || dialog.current.open) return false;
      setChallenge(current);
      setOtp("");
      setSent(codeSent);
      setError("");
      dialog.current.showModal();
      return true;
    }

    return {
      open(current) {
        const coolingDown = remainingFor(current.scope) > 0;
        if (show(current, coolingDown) && !coolingDown) void requestCode(current);
      },
      async openAfterSend(current) {
        if (!dialog.current || dialog.current.open) return;
        if (remainingFor(current.scope) === 0) {
          await current.requestCode();
          if (!dialog.current) return;
          startCooldown(current.scope);
        }
        show(current, true);
      },
    };
  });

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || !sent || sending || saving || !/^[0-9]{6}$/.test(otp)) return;

    setError("");
    setSaving(true);
    try {
      await challenge.confirmCode(otp);
      dialog.current?.close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Không thể hoàn tất xác minh.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => { if (sending || saving) event.preventDefault(); }}
      onClose={() => { if (!dialog.current?.open) { setChallenge(null); setOtp(""); } }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-purple-100 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/50">
      <form onSubmit={verify} className="space-y-4">
        <div>
          <h2 id={titleId} className="text-xl font-bold">Xác minh mã OTP</h2>
          <p id={descriptionId} className="mt-1.5 break-words text-sm leading-relaxed text-slate-600">
            {sending ? "Đang gửi mã OTP qua email…" : sent ? challenge?.deliveryMessage
              : "Gửi mã qua email để hoàn tất xác minh."}
          </p>
        </div>
        {sent && (
          <label className="block text-sm font-semibold">
            Mã OTP gồm 6 chữ số
            <input ref={codeInput} name="email-verification-otp" type="text" inputMode="numeric"
              autoComplete="section-email-verification one-time-code"
              required pattern="[0-9]{6}" value={otp}
              disabled={sending || saving}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1.5 w-full rounded-xl border border-purple-200 bg-purple-50/40 px-3 py-2.5 font-mono text-lg tracking-widest" />
          </label>
        )}
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <button type="button" onClick={() => { if (challenge) void requestCode(challenge); }}
          disabled={sending || saving || remaining > 0}
          className="text-sm font-semibold text-brand-700 hover:underline disabled:opacity-60">
          {sending ? "Đang gửi…" : remaining > 0 ? `Gửi lại mã (${remaining}s)` : sent ? "Gửi lại mã" : "Gửi mã OTP"}
        </button>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => dialog.current?.close()} disabled={sending || saving}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
            Quay lại
          </button>
          <button type="submit" disabled={sending || saving || otp.length !== 6}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Đang xác minh…" : challenge?.confirmLabel ?? "Xác minh và lưu"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
