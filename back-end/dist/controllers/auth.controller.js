"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const response_1 = require("../utils/response");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
exports.AuthController = {
    /**
     * POST /api/auth/oauth-login
     * Đăng nhập hoặc đăng ký tài khoản qua OAuth (Google)
     */
    async oauthLogin(req, res, next) {
        try {
            const { email, name, avatarUrl, provider } = req.body || {};
            if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Email không hợp lệ.", 422, { field: "email" });
                return;
            }
            const result = await auth_service_1.AuthService.oauthLogin(email.trim(), name, avatarUrl, provider);
            (0, response_1.sendSuccess)(res, result, 200);
        }
        catch (error) {
            if (error.code === "FORBIDDEN") {
                (0, response_1.sendError)(res, "FORBIDDEN", error.message, 403);
                return;
            }
            next(error);
        }
    },
    /**
     * POST /api/auth/register
     */
    async register(req, res, next) {
        try {
            const { name, email, password } = req.body || {};
            // Validate boundary inputs
            if (!name || typeof name !== "string" || !name.trim()) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Vui lòng nhập họ và tên.", 422, { field: "name" });
                return;
            }
            if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Email không hợp lệ.", 422, { field: "email" });
                return;
            }
            if (!password || typeof password !== "string" || password.length < 6) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Mật khẩu phải có ít nhất 6 ký tự.", 422, { field: "password" });
                return;
            }
            const result = await auth_service_1.AuthService.register(name, email, password);
            (0, response_1.sendSuccess)(res, result, 201);
        }
        catch (error) {
            if (error.code === "CONFLICT") {
                (0, response_1.sendError)(res, "CONFLICT", error.message, 409);
                return;
            }
            next(error);
        }
    },
    /**
     * POST /api/auth/login
     */
    async login(req, res, next) {
        try {
            const { email, password } = req.body || {};
            // Validate boundary inputs
            if (!email || typeof email !== "string" || !email.trim()) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Vui lòng nhập địa chỉ email.", 422, { field: "email" });
                return;
            }
            if (!password || typeof password !== "string") {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Vui lòng nhập mật khẩu.", 422, { field: "password" });
                return;
            }
            const result = await auth_service_1.AuthService.login(email, password);
            (0, response_1.sendSuccess)(res, result, 200);
        }
        catch (error) {
            if (error.code === "UNAUTHORIZED") {
                (0, response_1.sendError)(res, "UNAUTHORIZED", error.message, 401);
                return;
            }
            if (error.code === "FORBIDDEN") {
                (0, response_1.sendError)(res, "FORBIDDEN", error.message, 403);
                return;
            }
            next(error);
        }
    },
    /**
     * GET /api/auth/me
     */
    async getMe(req, res, next) {
        try {
            if (!req.user) {
                (0, response_1.sendError)(res, "UNAUTHORIZED", "Không tìm thấy thông tin xác thực.", 401);
                return;
            }
            const profile = await auth_service_1.AuthService.getProfile(req.user.id);
            if (!profile) {
                (0, response_1.sendError)(res, "NOT_FOUND", "Không tìm thấy thông tin tài khoản người dùng.", 404);
                return;
            }
            (0, response_1.sendSuccess)(res, { user: profile }, 200);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * PATCH /api/auth/profile
     * Cập nhật thông tin cá nhân (name, avatar_url)
     */
    async updateProfile(req, res, next) {
        try {
            if (!req.user) {
                (0, response_1.sendError)(res, "UNAUTHORIZED", "Không tìm thấy thông tin xác thực.", 401);
                return;
            }
            const { name, avatar_url } = req.body || {};
            if (name !== undefined && (typeof name !== "string" || !name.trim())) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Họ và tên không được để trống.", 422, { field: "name" });
                return;
            }
            if (avatar_url !== undefined && typeof avatar_url !== "string") {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Đường dẫn ảnh đại diện không hợp lệ.", 422, { field: "avatar_url" });
                return;
            }
            const updated = await auth_service_1.AuthService.updateProfile(req.user.id, {
                name: name !== undefined ? name.trim() : undefined,
                avatar_url: avatar_url !== undefined ? avatar_url.trim() : undefined,
            });
            if (!updated) {
                (0, response_1.sendError)(res, "NOT_FOUND", "Không tìm thấy người dùng.", 404);
                return;
            }
            (0, response_1.sendSuccess)(res, { user: updated }, 200);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * POST /api/auth/refresh
  
     * Xoay vòng Refresh Token (hạn 30 ngày) để lấy cặp token mới
     */
    async refresh(req, res, next) {
        try {
            const { refreshToken } = req.body || {};
            if (!refreshToken || typeof refreshToken !== "string" || !refreshToken.trim()) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Vui lòng cung cấp refresh token.", 422, { field: "refreshToken" });
                return;
            }
            const result = await auth_service_1.AuthService.refresh(refreshToken.trim());
            (0, response_1.sendSuccess)(res, result, 200);
        }
        catch (error) {
            if (error.code === "UNAUTHORIZED") {
                (0, response_1.sendError)(res, "UNAUTHORIZED", error.message, 401);
                return;
            }
            next(error);
        }
    },
    /**
     * POST /api/auth/logout
     */
    async logout(req, res, next) {
        try {
            const { refreshToken } = req.body || {};
            if (refreshToken && typeof refreshToken === "string") {
                await auth_service_1.AuthService.logout(refreshToken.trim());
            }
            (0, response_1.sendSuccess)(res, { message: "Đăng xuất thành công." }, 200);
        }
        catch (error) {
            next(error);
        }
    },
};
