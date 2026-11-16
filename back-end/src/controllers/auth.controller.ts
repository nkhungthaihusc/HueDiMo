import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { sendEmailOtp, type EmailOtpResult } from "../services/email-otp.service";
import { UserModel } from "../models/user.model";
import { sendSuccess, sendError } from "../utils/response";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";

const EMAIL_REGEX = /^[^\s@,<>:;"()\\]+@[a-z\d-]+(?:\.[a-z\d-]+)+$/i;
const OTP_REGEX = /^\d{6}$/;

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_REGEX.test(email) ? email : null;
}

function sendOtpResponse(res: Response, result: EmailOtpResult): void {
  if (result === "sent") {
    sendSuccess(res, { sent: true });
  } else if (typeof result === "object") {
    res.set("Retry-After", String(result.retryAfterSeconds));
    sendError(res, "RATE_LIMITED", "Vui lòng chờ trước khi yêu cầu mã OTP mới.", 429, result);
  } else {
    sendError(res, "UPSTREAM_ERROR", "Không thể gửi mã OTP. Vui lòng thử lại sau.", 503);
  }
}

export const AuthController = {
  async requestPasswordOtp(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const secret = process.env.AUTH_OTP_SECRET;
    if (!secret) {
      sendError(res, "UPSTREAM_ERROR", "Máy chủ chưa cấu hình gửi mã OTP.", 503);
      return;
    }

    try {
      const result = await AuthService.requestPasswordOtp(req.user!.id, secret);
      if (result === "ineligible") {
        sendError(res, "FORBIDDEN", "Tài khoản này không dùng mật khẩu HueDiMo.", 403);
        return;
      }
      sendOtpResponse(res, result);
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const { currentPassword, newPassword, confirmPassword, otp } = req.body ?? {};
    if (typeof currentPassword !== "string" || !currentPassword || Buffer.byteLength(currentPassword) > 256 ||
        typeof newPassword !== "string" || newPassword.length < 8 || Buffer.byteLength(newPassword) > 72 ||
        newPassword !== confirmPassword || newPassword === currentPassword) {
      sendError(res, "VALIDATION_ERROR", "Mật khẩu mới phải khác mật khẩu hiện tại, từ 8 ký tự và tối đa 72 byte. Hai lần nhập phải khớp.", 422);
      return;
    }
    if (typeof otp !== "string" || !OTP_REGEX.test(otp)) {
      sendError(res, "VALIDATION_ERROR", "Vui lòng nhập mã OTP gồm 6 chữ số.", 422);
      return;
    }

    const secret = process.env.AUTH_OTP_SECRET;
    if (!secret) {
      sendError(res, "UPSTREAM_ERROR", "Máy chủ chưa cấu hình xác thực OTP.", 503);
      return;
    }

    try {
      const result = await AuthService.changePassword(req.user!.id, currentPassword, newPassword, otp, secret);
      if (result === "invalid_otp") {
        sendError(res, "VALIDATION_ERROR", "Mã OTP không đúng, đã hết hạn hoặc đã hết lượt thử.", 422);
        return;
      }

      if (result === "invalid_password") {
        sendError(res, "VALIDATION_ERROR", "Mật khẩu hiện tại không đúng hoặc tài khoản không dùng mật khẩu HueDiMo.", 422);
        return;
      }
      sendSuccess(res, { changed: true });
    } catch (error) {
      next(error);
    }
  },


  /**
   * POST /api/auth/oauth-login
   * Đăng nhập hoặc đăng ký tài khoản qua OAuth (Google)
   */
  async oauthLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accessToken, googleAccessToken } = req.body ?? {};
      if (typeof accessToken !== "string" || !accessToken || accessToken.length > 8192) {
        sendError(res, "UNAUTHORIZED", "Vui lòng xác thực với nhà cung cấp đăng nhập.", 401);
        return;
      }

      const { supabase } = await import("../config/supabase.js");
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      if (error || !user?.email || !user.email_confirmed_at) {
        sendError(res, "UNAUTHORIZED", "Phiên đăng nhập mạng xã hội không hợp lệ.", 401);
        return;
      }

      // Supabase's primary provider describes sign-up, not the current Google identity.
      if (user.app_metadata?.provider !== "google" || googleAccessToken !== undefined) {
        const googleIdentity = user.identities?.find((identity) => identity.provider === "google");
        if (!googleIdentity || typeof googleAccessToken !== "string" || !googleAccessToken || googleAccessToken.length > 8192) {
          sendError(res, "UNAUTHORIZED", "Không thể xác minh phiên Google. Vui lòng đăng nhập lại bằng Google.", 401);
          return;
        }

        try {
          const google = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
            headers: { Authorization: `Bearer ${googleAccessToken}` },
            signal: AbortSignal.timeout(5000),
            redirect: "error",
          });
          if (google.status >= 500 || google.status === 429) {
            sendError(res, "UPSTREAM_ERROR", "Google chưa phản hồi xác thực. Vui lòng thử lại sau.", 503);
            return;
          }
          const identity = google.ok ? await google.json() as {
            sub?: unknown; email?: unknown; email_verified?: unknown;
          } : null;
          if (!identity || typeof identity.sub !== "string" || identity.sub !== googleIdentity.identity_data?.sub ||
              typeof identity.email !== "string" || identity.email_verified !== true ||
              identity.email.toLowerCase() !== user.email.toLowerCase()) {
            sendError(res, "UNAUTHORIZED", "Không thể xác minh phiên Google. Vui lòng đăng nhập lại bằng Google.", 401);
            return;
          }
        } catch {
          sendError(res, "UPSTREAM_ERROR", "Không thể kết nối để xác thực Google. Vui lòng thử lại sau.", 503);
          return;
        }
      }

      const metadata = user.user_metadata;
      const name = typeof metadata.full_name === "string" ? metadata.full_name : undefined;
      const avatar = typeof metadata.avatar_url === "string" ? metadata.avatar_url : undefined;
      const result = await AuthService.oauthLogin(user.email, name, avatar, "google");
      sendSuccess(res, result, 200);
    } catch (error: any) {
      if (error.code === "FORBIDDEN") {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      next(error);
    }
  },

  async requestRegistrationOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      sendError(res, "VALIDATION_ERROR", "Email không hợp lệ.", 422);
      return;
    }
    const secret = process.env.AUTH_OTP_SECRET;
    if (!secret) {
      sendError(res, "UPSTREAM_ERROR", "Máy chủ chưa cấu hình gửi mã OTP.", 503);
      return;
    }

    try {
      if (await UserModel.findByEmail(email)) {
        sendError(res, "CONFLICT", "Email này đã được đăng ký.", 409);
        return;
      }
      sendOtpResponse(res, await sendEmailOtp(email, "register", "", secret));
    } catch (error) {
      next(error);
    }
  },

  async requestPasswordResetOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      sendError(res, "VALIDATION_ERROR", "Email không hợp lệ.", 422);
      return;
    }
    const secret = process.env.AUTH_OTP_SECRET;
    if (!secret) {
      sendError(res, "UPSTREAM_ERROR", "Máy chủ chưa cấu hình gửi mã OTP.", 503);
      return;
    }

    try {
      const result = await AuthService.requestPasswordResetOtp(email, secret);
      if (result === "ineligible") {
        sendError(res, "NOT_FOUND", "Email này chưa được đăng ký.", 404);
        return;
      }
      sendOtpResponse(res, result);
    } catch (error) {
      next(error);
    }
  },

  async verifyPasswordResetOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    const email = normalizeEmail(req.body?.email);
    const { otp } = req.body ?? {};
    if (!email || typeof otp !== "string" || !OTP_REGEX.test(otp)) {
      sendError(res, "VALIDATION_ERROR", "Vui lòng nhập email hợp lệ và mã OTP gồm 6 chữ số.", 422);
      return;
    }
    const secret = process.env.AUTH_OTP_SECRET;
    if (!secret) {
      sendError(res, "UPSTREAM_ERROR", "Máy chủ chưa cấu hình xác thực OTP.", 503);
      return;
    }
    try {
      const resetToken = await AuthService.verifyPasswordResetOtp(email, otp, secret);
      if (!resetToken) {
        sendError(res, "VALIDATION_ERROR", "Mã OTP không đúng, đã hết hạn hoặc đã hết lượt thử.", 422);
        return;
      }
      res.set("Cache-Control", "no-store");
      sendSuccess(res, { resetToken });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    const email = normalizeEmail(req.body?.email);
    const { newPassword, confirmPassword, resetToken } = req.body ?? {};
    if (!email || typeof resetToken !== "string" || !resetToken || resetToken.length > 2048) {
      sendError(res, "VALIDATION_ERROR", "Vui lòng xác minh OTP trước khi đặt lại mật khẩu.", 422, { field: "resetToken" });
      return;
    }
    if (typeof newPassword !== "string" || newPassword.length < 8 ||
        Buffer.byteLength(newPassword) > 72 || newPassword !== confirmPassword) {
      sendError(res, "VALIDATION_ERROR", "Mật khẩu mới phải có từ 8 ký tự và tối đa 72 byte. Hai lần nhập phải khớp.", 422);
      return;
    }
    const secret = process.env.AUTH_OTP_SECRET;
    if (!secret) {
      sendError(res, "UPSTREAM_ERROR", "Máy chủ chưa cấu hình xác thực OTP.", 503);
      return;
    }

    try {
      if (!await AuthService.resetPassword(email, newPassword, resetToken, secret)) {
        sendError(res, "VALIDATION_ERROR", "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng xác minh lại OTP.", 422, { field: "resetToken" });
        return;
      }
      sendSuccess(res, { changed: true });
    } catch (error) {
      next(error);
    }
  },
  /**
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, password, otp } = req.body ?? {};
      const email = normalizeEmail(req.body?.email);

      // Validate boundary inputs
      if (!name || typeof name !== "string" || !name.trim()) {
        sendError(res, "VALIDATION_ERROR", "Vui lòng nhập họ và tên.", 422, { field: "name" });
        return;
      }

      if (!email) {
        sendError(res, "VALIDATION_ERROR", "Email không hợp lệ.", 422, { field: "email" });
        return;
      }

      if (typeof password !== "string" || password.length < 6 || Buffer.byteLength(password) > 72) {
        sendError(res, "VALIDATION_ERROR", "Mật khẩu phải có ít nhất 6 ký tự và tối đa 72 byte.", 422, { field: "password" });
        return;
      }
      if (typeof otp !== "string" || !OTP_REGEX.test(otp)) {
        sendError(res, "VALIDATION_ERROR", "Vui lòng nhập mã OTP gồm 6 chữ số.", 422, { field: "otp" });
        return;
      }
      const secret = process.env.AUTH_OTP_SECRET;
      if (!secret) {
        sendError(res, "UPSTREAM_ERROR", "Máy chủ chưa cấu hình xác thực OTP.", 503);
        return;
      }

      const result = await AuthService.register(name, email, password, otp, secret);
      if (!result) {
        sendError(res, "VALIDATION_ERROR", "Mã OTP không đúng, đã hết hạn hoặc đã hết lượt thử.", 422, { field: "otp" });
        return;
      }
      sendSuccess(res, result, 201);
    } catch (error: any) {
      if (error.code === "CONFLICT" || error.code === "23505") {
        sendError(res, "CONFLICT", "Email này đã được đăng ký.", 409);
        return;
      }
      next(error);
    }
  },

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body || {};

      // Validate boundary inputs
      if (!email || typeof email !== "string" || !email.trim()) {
        sendError(res, "VALIDATION_ERROR", "Vui lòng nhập địa chỉ email.", 422, { field: "email" });
        return;
      }

      if (!password || typeof password !== "string") {
        sendError(res, "VALIDATION_ERROR", "Vui lòng nhập mật khẩu.", 422, { field: "password" });
        return;
      }

      const result = await AuthService.login(email, password);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      if (error.code === "UNAUTHORIZED") {
        sendError(res, "UNAUTHORIZED", error.message, 401);
        return;
      }
      if (error.code === "FORBIDDEN") {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      next(error);
    }
  },

  /**
   * GET /api/auth/me
   */
  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Không tìm thấy thông tin xác thực.", 401);
        return;
      }

      const profile = await AuthService.getProfile(req.user.id);
      if (!profile) {
        sendError(res, "NOT_FOUND", "Không tìm thấy thông tin tài khoản người dùng.", 404);
        return;
      }

      sendSuccess(res, { user: profile }, 200);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/auth/profile
   * Cập nhật thông tin cá nhân (name, avatar_url)
   */
  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Không tìm thấy thông tin xác thực.", 401);
        return;
      }

      const { name, avatar_url } = req.body || {};

      if (name !== undefined && (typeof name !== "string" || !name.trim())) {
        sendError(res, "VALIDATION_ERROR", "Họ và tên không được để trống.", 422, { field: "name" });
        return;
      }

      if (avatar_url !== undefined && typeof avatar_url !== "string") {
        sendError(res, "VALIDATION_ERROR", "Đường dẫn ảnh đại diện không hợp lệ.", 422, { field: "avatar_url" });
        return;
      }

      const updated = await AuthService.updateProfile(req.user.id, {
        name: name !== undefined ? name.trim() : undefined,
        avatar_url: avatar_url !== undefined ? avatar_url.trim() : undefined,
      });

      if (!updated) {
        sendError(res, "NOT_FOUND", "Không tìm thấy người dùng.", 404);
        return;
      }

      sendSuccess(res, { user: updated }, 200);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/refresh

   * Xoay vòng Refresh Token (hạn 30 ngày) để lấy cặp token mới
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body || {};

      if (!refreshToken || typeof refreshToken !== "string" || !refreshToken.trim()) {
        sendError(res, "VALIDATION_ERROR", "Vui lòng cung cấp refresh token.", 422, { field: "refreshToken" });
        return;
      }

      const result = await AuthService.refresh(refreshToken.trim());
      sendSuccess(res, result, 200);
    } catch (error: any) {
      if (error.code === "UNAUTHORIZED") {
        sendError(res, "UNAUTHORIZED", error.message, 401);
        return;
      }
      next(error);
    }
  },

  /**
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body || {};
      if (refreshToken && typeof refreshToken === "string") {
        await AuthService.logout(refreshToken.trim());
      }
      sendSuccess(res, { message: "Đăng xuất thành công." }, 200);
    } catch (error) {
      next(error);
    }
  },
};
