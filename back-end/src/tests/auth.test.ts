import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mock } from "node:test";
import nodemailer from "nodemailer";
import { pool } from "../config/db";
import type { Server } from "http";

async function runTests() {
  process.env.AUTH_OTP_SECRET = randomBytes(32).toString("hex");
  process.env.MAIL_USERNAME = "sender@example.com";
  process.env.MAIL_PASSWORD = "smtp-mock";
  delete process.env.RESEND_API_KEY;
  const otpEmails: { text: string; html: string }[] = [];
  const transport = nodemailer.createTransport({ jsonTransport: true });
  transport.use("compile", (mail, done) => {
    otpEmails.push({ text: String(mail.data.text), html: String(mail.data.html) });
    done();
  });
  const smtpMock = mock.method(nodemailer, "createTransport", () => transport);
  const { default: app } = require("../app") as typeof import("../app");
  const PORT = 3097;
  const server: Server = app.listen(PORT);

  const baseUrl = `http://127.0.0.1:${PORT}`;
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  const testEmail = `test_${Date.now()}@huedimo.vn`;
  const testPassword = "Password123@";
  const testName = "Du Khách Huế";
  let accessToken = "";
  let refreshToken = "";

  function authRequest(path: string, body: object, token?: string, method = "POST") {
    return fetch(`${baseUrl}/api/auth/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    });
  }

  async function readOtp(purpose: string) {
    for (let attempt = 0; attempt < 50 && !otpEmails.length; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const email = otpEmails.shift();
    assert.ok(email, "Expected an OTP email");
    const otp = email.text.match(/\b\d{6}\b/)?.[0];
    assert.ok(otp, "Expected a six-digit code in the text fallback");
    assert.ok(email.html.includes(`<span dir="ltr">${otp}</span>`));
    assert.doesNotMatch(email.html, /\/copy-otp/);
    assert.ok(email.html.includes(purpose));
    assert.ok(email.html.includes("5 phút"));
    return otp;
  }

  console.log("=== BẮT ĐẦU KIỂM THỬ AUTH DUAL TOKEN & REFRESH ROTATION ===");

  // 1. Validation test: empty name
  await test("POST /api/auth/register - Thiếu tên phải trả về 422 VALIDATION_ERROR", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", email: testEmail, password: testPassword }),
    });
    const json: any = await res.json();
    if (res.status !== 422 || json.error?.code !== "VALIDATION_ERROR") {
      throw new Error(`Expected 422 VALIDATION_ERROR, got ${res.status}: ${JSON.stringify(json)}`);
    }
  });

  // 2. Validation test: invalid email
  await test("POST /api/auth/register - Email sai định dạng phải trả về 422 VALIDATION_ERROR", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: testName, email: "invalid-email", password: testPassword }),
    });
    const json: any = await res.json();
    if (res.status !== 422 || json.error?.code !== "VALIDATION_ERROR") {
      throw new Error(`Expected 422 VALIDATION_ERROR, got ${res.status}: ${JSON.stringify(json)}`);
    }
  });

  // 3. Validation test: short password
  await test("POST /api/auth/register - Password < 6 ký tự phải trả về 422 VALIDATION_ERROR", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: testName, email: testEmail, password: "123" }),
    });
    const json: any = await res.json();
    if (res.status !== 422 || json.error?.code !== "VALIDATION_ERROR") {
      throw new Error(`Expected 422 VALIDATION_ERROR, got ${res.status}: ${JSON.stringify(json)}`);
    }
  });

  // 4. Register successful -> returns accessToken (15m) & refreshToken (30d) with expiry dates
  await test("POST /api/auth/register - Đăng ký thành công trả về 201 và cặp accessToken (15p) + refreshToken (30 ngày) kèm ngày hết hạn", async () => {
    assert.equal((await authRequest("register", { name: testName, email: testEmail, password: testPassword })).status, 422);
    await pool.query(
      `INSERT INTO public.otps (email, otp_code, expiry_time, used, verified, created_at)
       VALUES ($1, '381749', (NOW() AT TIME ZONE 'UTC') + INTERVAL '5 minutes', FALSE, FALSE, NOW() AT TIME ZONE 'UTC')`,
      [testEmail],
    );
    assert.equal((await authRequest("register", { name: testName, email: testEmail, password: testPassword, otp: "381749" })).status, 422);
    assert.equal((await authRequest("register/otp", { email: testEmail.toUpperCase() })).status, 200);
    const otp = await readOtp("đăng ký tài khoản");
    await pool.query(
      `UPDATE public.otps SET created_at = (NOW() AT TIME ZONE 'UTC') - INTERVAL '40 seconds'
       WHERE email = $1 AND purpose = 'register'`,
      [testEmail],
    );
    const cooldown = await authRequest("register/otp", { email: testEmail });
    assert.equal(cooldown.status, 429);
    const { error } = await cooldown.json();
    assert.ok(error.details.retryAfterSeconds > 0 && error.details.retryAfterSeconds <= 20);
    assert.equal(cooldown.headers.get("retry-after"), String(error.details.retryAfterSeconds));
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: testName, email: testEmail, password: testPassword, otp }),
    });
    const json: any = await res.json();
    if (
      res.status !== 201 ||
      !json.data?.accessToken ||
      !json.data?.refreshToken ||
      !json.data?.accessTokenExpiresAt ||
      !json.data?.refreshTokenExpiresAt ||
      isNaN(Date.parse(json.data.accessTokenExpiresAt)) ||
      isNaN(Date.parse(json.data.refreshTokenExpiresAt)) ||
      json.data?.user?.email !== testEmail
    ) {
      throw new Error(`Expected 201 with accessToken, refreshToken and expiry dates, got ${res.status}: ${JSON.stringify(json)}`);
    }
    accessToken = json.data.accessToken;
    refreshToken = json.data.refreshToken;
    const { rows } = await pool.query("SELECT used FROM public.otps WHERE email = $1 AND purpose IS NULL", [testEmail]);
    assert.deepEqual(rows, [{ used: false }]);
  });

  // 5. Register conflict
  await test("POST /api/auth/register - Đăng ký trùng email trả về 409 CONFLICT", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: testName, email: testEmail, password: testPassword, otp: "123456" }),
    });
    const json: any = await res.json();
    if (res.status !== 409 || json.error?.code !== "CONFLICT") {
      throw new Error(`Expected 409 CONFLICT, got ${res.status}: ${JSON.stringify(json)}`);
    }
  });

  // 6. Login wrong password
  await test("POST /api/auth/login - Mật khẩu sai trả về 401 UNAUTHORIZED", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "WrongPassword@" }),
    });
    const json: any = await res.json();
    if (res.status !== 401 || json.error?.code !== "UNAUTHORIZED") {
      throw new Error(`Expected 401 UNAUTHORIZED, got ${res.status}: ${JSON.stringify(json)}`);
    }
  });

  // 7. Login successful -> returns accessToken & refreshToken with expiry dates
  await test("POST /api/auth/login - Đăng nhập đúng trả về 200 và cặp accessToken + refreshToken kèm ngày hết hạn", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const json: any = await res.json();
    if (
      res.status !== 200 ||
      !json.data?.accessToken ||
      !json.data?.refreshToken ||
      !json.data?.accessTokenExpiresAt ||
      !json.data?.refreshTokenExpiresAt ||
      isNaN(Date.parse(json.data.accessTokenExpiresAt)) ||
      isNaN(Date.parse(json.data.refreshTokenExpiresAt))
    ) {
      throw new Error(`Expected 200 with dual tokens and expiry dates, got ${res.status}: ${JSON.stringify(json)}`);
    }
    accessToken = json.data.accessToken;
    refreshToken = json.data.refreshToken;
  });

  // 8. Get Me with accessToken
  await test("GET /api/auth/me - Có accessToken hợp lệ trả về 200 và user profile", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json: any = await res.json();
    if (res.status !== 200 || json.data?.user?.email !== testEmail) {
      throw new Error(`Expected 200 with user, got ${res.status}: ${JSON.stringify(json)}`);
    }
  });

  // 9. Rotate refresh token -> POST /api/auth/refresh
  let newAccessToken = "";
  let newRefreshToken = "";
  await test("POST /api/auth/refresh - Xoay vòng refreshToken lấy accessToken mới và refreshToken mới kèm ngày hết hạn", async () => {
    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const json: any = await res.json();
    if (
      res.status !== 200 ||
      !json.data?.accessToken ||
      !json.data?.refreshToken ||
      !json.data?.accessTokenExpiresAt ||
      !json.data?.refreshTokenExpiresAt ||
      isNaN(Date.parse(json.data.accessTokenExpiresAt)) ||
      isNaN(Date.parse(json.data.refreshTokenExpiresAt)) ||
      json.data?.refreshToken === refreshToken
    ) {
      throw new Error(`Expected 200 with new rotated tokens and expiry dates, got ${res.status}: ${JSON.stringify(json)}`);
    }
    newAccessToken = json.data.accessToken;
    newRefreshToken = json.data.refreshToken;
  });

  // 10. Reuse detection: Using old refreshToken must be rejected
  await test("POST /api/auth/refresh - Dùng lại refreshToken cũ đã xoay vòng phải bị từ chối 401 UNAUTHORIZED", async () => {
    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }), // old token
    });
    const json: any = await res.json();
    if (res.status !== 401 || json.error?.code !== "UNAUTHORIZED") {
      throw new Error(`Expected 401 UNAUTHORIZED on reused token, got ${res.status}: ${JSON.stringify(json)}`);
    }
  });

  // 11. Get Me with newAccessToken
  await test("GET /api/auth/me - Dùng accessToken mới được cấp vẫn xác thực thành công 200", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${newAccessToken}` },
    });
    const json: any = await res.json();
    if (res.status !== 200 || json.data?.user?.email !== testEmail) {
      throw new Error(`Expected 200 with user from new token, got ${res.status}: ${JSON.stringify(json)}`);
    }
  });

  // 12. Logout revokes refreshToken
  await test("POST /api/auth/logout - Đăng xuất và thu hồi refreshToken thành công", async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: newRefreshToken }),
    });
    const json: any = await res.json();
    if (res.status !== 200 || !json.data?.message) {
      throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(json)}`);
    }
  });

  // 13. Refresh with logged-out refreshToken must fail
  await test("POST /api/auth/refresh - Dùng refreshToken sau khi đã logout phải bị từ chối 401", async () => {
    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: newRefreshToken }),
    });
    const json: any = await res.json();
    if (res.status !== 401 || json.error?.code !== "UNAUTHORIZED") {
      throw new Error(`Expected 401 on logged-out token, got ${res.status}: ${JSON.stringify(json)}`);
    }
  });

  await test("Quên mật khẩu - xác minh OTP trước, sau đó dùng token một lần để đổi mật khẩu", async () => {
    const signedIn = await (await authRequest("login", { email: testEmail, password: testPassword })).json();
    const missing = await authRequest("password/reset/otp", { email: `missing_${testEmail}` });
    const requested = await authRequest("password/reset/otp", { email: testEmail });
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, "NOT_FOUND");
    assert.equal(requested.status, 200);
    const expiredOtp = await readOtp("đặt lại mật khẩu");
    const newPassword = "ResetPassword123@";
    const verify = (otp: string) => authRequest("password/reset/verify", { email: testEmail, otp });
    const reset = (resetToken?: string) => authRequest("password/reset", {
      email: testEmail, resetToken, newPassword, confirmPassword: newPassword,
    });
    assert.equal((await reset()).status, 422);
    await pool.query(
      `UPDATE public.otps
       SET created_at = (NOW() AT TIME ZONE 'UTC') - INTERVAL '6 minutes',
           expiry_time = (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 minute'
       WHERE email = $1 AND purpose = 'reset_password'`,
      [testEmail],
    );
    assert.equal((await verify(expiredOtp)).status, 422);
    assert.equal((await authRequest("password/reset/otp", { email: testEmail })).status, 200);
    const otp = await readOtp("đặt lại mật khẩu");
    assert.equal((await reset(otp)).status, 422);
    const verification = await verify(otp);
    assert.equal(verification.status, 200);
    assert.equal(verification.headers.get("cache-control"), "no-store");
    const { data: { resetToken } } = await verification.json();
    assert.equal(typeof resetToken, "string");
    assert.equal((await verify(otp)).status, 422);
    assert.equal((await authRequest("login", { email: testEmail, password: testPassword })).status, 200);
    assert.equal((await authRequest("login", { email: testEmail, password: newPassword })).status, 401);
    assert.equal((await reset(resetToken)).status, 200);
    assert.equal((await reset(resetToken)).status, 422);
    assert.equal((await authRequest("refresh", { refreshToken: signedIn.data.refreshToken })).status, 401);
    assert.equal((await authRequest("login", { email: testEmail, password: testPassword })).status, 401);
    assert.equal((await authRequest("login", { email: testEmail, password: newPassword })).status, 200);
  });

  await test("Đổi mật khẩu - cần đăng nhập, kiểm tra mật khẩu hiện tại và giới hạn 5 lượt OTP", async () => {
    const currentPassword = "ResetPassword123@";
    const newPassword = "ChangedPassword123@";
    const login = await authRequest("login", { email: testEmail, password: currentPassword });
    assert.equal(login.status, 200);
    const { data } = await login.json();
    assert.equal((await authRequest("password/otp", {})).status, 401);
    const change = (otp: string, current = currentPassword) => authRequest("password", {
      currentPassword: current, otp, newPassword, confirmPassword: newPassword,
    }, data.accessToken, "PATCH");
    assert.equal((await authRequest("password/otp", {}, data.accessToken)).status, 200);
    const otp = await readOtp("đổi mật khẩu");
    const wrongOtp = otp === "000000" ? "999999" : "000000";
    for (let attempt = 0; attempt < 5; attempt++) {
      assert.equal((await change(wrongOtp)).status, 422);
    }
    assert.equal((await change(otp)).status, 422);
    await pool.query(
      `UPDATE public.otps SET created_at = (NOW() AT TIME ZONE 'UTC') - INTERVAL '61 seconds'
       WHERE email = $1 AND purpose = 'change_password'`,
      [testEmail],
    );
    assert.equal((await authRequest("password/otp", {}, data.accessToken)).status, 200);
    const nextOtp = await readOtp("đổi mật khẩu");
    assert.equal((await change(nextOtp, "WrongPassword@")).status, 422);
    assert.equal((await change(nextOtp)).status, 200);
    assert.equal((await authRequest("login", { email: testEmail, password: newPassword })).status, 200);
  });

  await test("Đăng ký - gửi OTP qua HTTPS khi cấu hình Resend", async () => {
    const realFetch = globalThis.fetch;
    const email = `https_${testEmail}`;
    process.env.RESEND_API_KEY = "fixture-resend-key";
    process.env.MAIL_FROM = "HueDiMo <otp@example.com>";
    let sent = false;
    const fetchMock = mock.method(globalThis, "fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      if (input !== "https://api.resend.com/emails") return realFetch(input, init);
      assert.equal(init?.method, "POST");
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer fixture-resend-key");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.to, email);
      assert.equal(body.from, process.env.MAIL_FROM);
      otpEmails.push({ text: body.text, html: body.html });
      sent = true;
      return Promise.resolve(Response.json({ id: "fixture-message" }));
    });
    try {
      assert.equal((await authRequest("register/otp", { email })).status, 200);
      assert.ok(sent);
      await readOtp("đăng ký tài khoản");
    } finally {
      fetchMock.mock.restore();
      delete process.env.RESEND_API_KEY;
      delete process.env.MAIL_FROM;
    }
  });

  await test("Đăng nhập Google - xác minh danh tính Google của tài khoản đã đăng ký qua email", async () => {
    const email = `google_${testEmail}`;
    const { supabase } = require("../config/supabase") as typeof import("../config/supabase");
    const supabaseMock = mock.method(supabase.auth, "getUser", async () => ({
      data: { user: {
        id: "fixture-supabase-id",
        email,
        email_confirmed_at: "2026-01-01T00:00:00Z",
        app_metadata: { provider: "email", providers: ["email", "google"] },
        user_metadata: { full_name: "Google Tester" },
        identities: [{ provider: "google", identity_data: { sub: "1234567890" } }],
      } },
      error: null,
    }));
    const realFetch = globalThis.fetch;
    const googleMock = mock.method(globalThis, "fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      if (input !== "https://openidconnect.googleapis.com/v1/userinfo") return realFetch(input, init);
      const token = new Headers(init?.headers).get("authorization");
      const sub = token === "Bearer matching-google-token" ? "1234567890" : "different-google-user";
      return Promise.resolve(Response.json({ sub, email, email_verified: true }));
    });
    try {
      assert.equal((await authRequest("oauth-login", { accessToken: "supabase-token" })).status, 401);
      assert.equal((await authRequest("oauth-login", {
        accessToken: "supabase-token", googleAccessToken: "different-google-token",
      })).status, 401);
      const login = await authRequest("oauth-login", {
        accessToken: "supabase-token", googleAccessToken: "matching-google-token",
      });
      assert.equal(login.status, 200);
      const { data } = await login.json();
      assert.equal(data.user.email, email);
      assert.equal(data.user.provider, "google");
      assert.ok(data.accessToken);
    } finally {
      googleMock.mock.restore();
      supabaseMock.mock.restore();
    }
  });

  await test("Tải ảnh đại diện - báo rõ khóa Storage thiếu hoặc bị từ chối và dùng được Secret key", async () => {
    const config = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;
    const previous = config.map((key) => [key, process.env[key]] as const);
    process.env.SUPABASE_URL = "https://storage-fixture.example.com";
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const realFetch = globalThis.fetch;
    const storageMock = mock.method(globalThis, "fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input !== "string" || !input.startsWith("https://storage-fixture.example.com/")) {
        return realFetch(input, init);
      }
      const key = new Headers(init?.headers).get("apikey");
      if (key !== "sb_secret_fixture") return Promise.resolve(Response.json({ message: "Invalid key" }, { status: 403 }));
      const path = new URL(input).pathname.replace("/storage/v1", "");
      return Promise.resolve(Response.json({ url: `${path}?token=fixture` }));
    });
    const presign = () => fetch(`${baseUrl}/api/upload/presign`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ folder: "avatars", files: [{ contentType: "image/png", size: 1024 }] }),
    });
    try {
      const missing = await presign();
      assert.equal(missing.status, 503);
      assert.match((await missing.json()).error.message, /chưa cấu hình/);
      process.env.SUPABASE_SECRET_KEY = "sb_secret_invalid_fixture";
      const rejected = await presign();
      assert.equal(rejected.status, 503);
      assert.match((await rejected.json()).error.message, /từ chối khóa/);
      process.env.SUPABASE_SECRET_KEY = "sb_secret_fixture";
      const signed = await presign();
      assert.equal(signed.status, 200);
      const { data: [avatar] } = await signed.json();
      assert.match(avatar.uploadUrl, /\/huedimo-media\/avatars\/[\w-]+\.png\?token=fixture$/);
      assert.match(avatar.publicUrl, /\/object\/public\/huedimo-media\/avatars\/[\w-]+\.png$/);
    } finally {
      storageMock.mock.restore();
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  console.log(`\n=== TỔNG KẾT: ${passed} PASS, ${failed} FAIL ===\n`);

  server.close();
  smtpMock.mock.restore();
  await pool.end();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Lỗi khi chạy test:", err);
  process.exit(1);
});
