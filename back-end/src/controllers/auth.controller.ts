import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { sendSuccess, sendError } from "../utils/response";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AuthController = {
  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const { currentPassword, newPassword, confirmPassword, captchaToken } = req.body ?? {};
    if (typeof currentPassword !== "string" || !currentPassword || Buffer.byteLength(currentPassword) > 256 ||
        typeof newPassword !== "string" || newPassword.length < 8 || Buffer.byteLength(newPassword) > 72 ||
        newPassword !== confirmPassword || newPassword === currentPassword) {
      sendError(res, "VALIDATION_ERROR", "Mật khẩu mới phải khác mật khẩu hiện tại, từ 8 ký tự và tối đa 72 byte. Hai lần nhập phải khớp.", 422);
      return;
    }
    if (typeof captchaToken !== "string" || !captchaToken || captchaToken.length > 2048) {
      sendError(res, "VALIDATION_ERROR", "Vui lòng hoàn thành CAPTCHA.", 422);
      return;
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      sendError(res, "UPSTREAM_ERROR", "Máy chủ chưa cấu hình CAPTCHA.", 503);
      return;
    }

    try {
      const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({ secret, response: captchaToken }),
        signal: AbortSignal.timeout(5000),
      });
      if (!verification.ok) {
        sendError(res, "UPSTREAM_ERROR", "Không thể xác minh CAPTCHA lúc này.", 503);
        return;
      }
      const result = await verification.json() as { success?: boolean; action?: string };
      if (!result.success || result.action !== "change_password") {
        sendError(res, "VALIDATION_ERROR", "CAPTCHA không hợp lệ hoặc đã hết hạn.", 422);
        return;
      }

      if (!await AuthService.changePassword(req.user!.id, currentPassword, newPassword)) {
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
      const { accessToken } = req.body ?? {};
      if (typeof accessToken !== "string" || !accessToken || accessToken.length > 8192) {
        sendError(res, "UNAUTHORIZED", "Vui lòng xác thực với nhà cung cấp đăng nhập.", 401);
        return;
      }

      const { supabase } = await import("../config/supabase.js");
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      const provider = user?.app_metadata?.provider;
      if (error || !user?.email || !user.email_confirmed_at ||
          (provider !== "google" && provider !== "facebook")) {
        sendError(res, "UNAUTHORIZED", "Phiên đăng nhập mạng xã hội không hợp lệ.", 401);
        return;
      }

      const metadata = user.user_metadata;
      const name = typeof metadata.full_name === "string" ? metadata.full_name : undefined;
      const avatar = typeof metadata.avatar_url === "string" ? metadata.avatar_url : undefined;
      const result = await AuthService.oauthLogin(user.email, name, avatar, provider);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      if (error.code === "FORBIDDEN") {
        sendError(res, "FORBIDDEN", error.message, 403);
        return;
      }
      next(error);
    }
  },



  /**
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body || {};

      // Validate boundary inputs
      if (!name || typeof name !== "string" || !name.trim()) {
        sendError(res, "VALIDATION_ERROR", "Vui lòng nhập họ và tên.", 422, { field: "name" });
        return;
      }

      if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
        sendError(res, "VALIDATION_ERROR", "Email không hợp lệ.", 422, { field: "email" });
        return;
      }

      if (!password || typeof password !== "string" || password.length < 6) {
        sendError(res, "VALIDATION_ERROR", "Mật khẩu phải có ít nhất 6 ký tự.", 422, { field: "password" });
        return;
      }

      const result = await AuthService.register(name, email, password);
      sendSuccess(res, result, 201);
    } catch (error: any) {
      if (error.code === "CONFLICT") {
        sendError(res, "CONFLICT", error.message, 409);
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
