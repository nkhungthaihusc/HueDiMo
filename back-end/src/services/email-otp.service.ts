import { createHmac, randomInt } from "node:crypto";
import nodemailer from "nodemailer";
import { pool } from "../config/db";
import { buildOtpEmailHtml } from "./email-otp.template";
import type { PoolClient } from "pg";

const purposes = {
  change_password: "đổi mật khẩu",
  reset_password: "đặt lại mật khẩu",
  register: "đăng ký tài khoản",
};
export type OtpPurpose = keyof typeof purposes;
export type EmailOtpResult = "sent" | "unconfigured" | "delivery_failed" | { retryAfterSeconds: number };

const OTP_RESEND_SECONDS = 60;

type OtpEmail = { to: string; subject: string; text: string; html: string };

function createMailSender(): ((message: OtpEmail) => Promise<void>) | undefined {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) {
    const from = process.env.MAIL_FROM?.trim();
    if (!from) return;
    return async (message) => {
      const result = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...message, from }),
        signal: AbortSignal.timeout(10_000),
      });
      await result.body?.cancel();
      if (!result.ok) throw new Error(`Resend HTTP ${result.status}`);
    };
  }

  const { MAIL_HOST = "smtp.gmail.com", MAIL_PORT = "587", MAIL_USERNAME, MAIL_PASSWORD } = process.env;
  const port = Number(MAIL_PORT);
  if (!MAIL_USERNAME || !MAIL_PASSWORD || !MAIL_HOST || !Number.isInteger(port) || port < 1 || port > 65535) return;
  const transport = nodemailer.createTransport({
    host: MAIL_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: MAIL_USERNAME, pass: MAIL_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    dnsTimeout: 5_000,
  });
  return async (message) => {
    await transport.sendMail({
      ...message,
      from: { name: "HueDiMo", address: MAIL_USERNAME },
      to: { name: "", address: message.to },
    });
  };
}

function hashOtp(secret: string, purpose: OtpPurpose, email: string, subject: string, otp: string): string {
  return createHmac("sha256", secret)
    .update(JSON.stringify(["email-otp", purpose, email, subject, otp]))
    .digest("hex");
}

export async function sendEmailOtp(email: string, purpose: OtpPurpose, subject: string, secret: string): Promise<EmailOtpResult> {
  const sendMail = createMailSender();
  if (!sendMail) {
    console.warn("OTP email configuration incomplete", { provider: process.env.RESEND_API_KEY?.trim() ? "resend" : "smtp" });
    return "unconfigured";
  }

  const otp = String(randomInt(1_000_000)).padStart(6, "0");
  const codeHash = hashOtp(secret, purpose, email, subject, otp);
  const reservation = await pool.query(
    `INSERT INTO public.otps (email, purpose, otp_code, created_at, expiry_time, used, verified)
     VALUES ($1, $2, $3, NOW() AT TIME ZONE 'UTC', (NOW() AT TIME ZONE 'UTC') + INTERVAL '5 minutes', FALSE, FALSE)
     ON CONFLICT (email, purpose) WHERE purpose IS NOT NULL DO UPDATE
     SET otp_code = EXCLUDED.otp_code, created_at = EXCLUDED.created_at,
         expiry_time = EXCLUDED.expiry_time, attempts = 0, used = FALSE, verified = FALSE
     WHERE otps.created_at <= EXCLUDED.created_at - make_interval(secs => $4)`,
    [email, purpose, codeHash, OTP_RESEND_SECONDS],
  );
  if (!reservation.rowCount) {
    const { rows: [existing] } = await pool.query<{ retry_after_seconds: number }>(
      `SELECT GREATEST(1, CEIL(EXTRACT(EPOCH FROM
         (created_at + make_interval(secs => $3) - (NOW() AT TIME ZONE 'UTC'))
       )))::int AS retry_after_seconds
       FROM public.otps WHERE email = $1 AND purpose = $2`,
      [email, purpose, OTP_RESEND_SECONDS],
    );
    return { retryAfterSeconds: existing?.retry_after_seconds ?? 1 };
  }

  try {
    await sendMail({
      to: email,
      subject: `Mã xác nhận ${purposes[purpose]} HueDiMo`,
      text: `Mã xác nhận ${purposes[purpose]} của bạn là ${otp}. Mã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.`,
      html: buildOtpEmailHtml(otp, purposes[purpose]),
    });
    return "sent";
  } catch (error) {
    const failure = error as { name?: string; code?: string; responseCode?: number; message?: string };
    console.warn("OTP email delivery failed", {
      provider: process.env.RESEND_API_KEY?.trim() ? "resend" : "smtp",
      reason: /^Resend HTTP \d{3}$/.test(failure.message ?? "") ? failure.message : failure.code ?? failure.name,
      smtpStatus: failure.responseCode,
    });
    await pool.query(
      "UPDATE public.otps SET used = TRUE WHERE email = $1 AND purpose = $2 AND otp_code = $3 AND used = FALSE",
      [email, purpose, codeHash],
    );
    return "delivery_failed";
  }
}

export async function withVerifiedEmailOtp<T>(
  email: string,
  purpose: OtpPurpose,
  subject: string,
  otp: string,
  secret: string,
  action: (client: PoolClient) => Promise<T>,
): Promise<T | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [attempt] } = await client.query<{ verified: boolean }>(
      `UPDATE public.otps
       SET attempts = attempts + 1, used = (otp_code = $3), verified = (otp_code = $3)
       WHERE email = $1 AND purpose = $2 AND attempts < 5 AND used = FALSE
         AND expiry_time > (NOW() AT TIME ZONE 'UTC')
       RETURNING verified`,
      [email, purpose, hashOtp(secret, purpose, email, subject, otp)],
    );
    const result = attempt?.verified ? await action(client) : null;
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
