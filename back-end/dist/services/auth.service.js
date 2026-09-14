"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const user_model_1 = require("../models/user.model");
const refresh_token_model_1 = require("../models/refresh-token.model");
const JWT_ACCESS_SECRET = process.env.JWT_SECRET || "huedimo_default_secret_key_change_in_production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "huedimo_default_refresh_secret_key_2026";
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "30d";
const ACCESS_TOKEN_MINUTES = 15;
const REFRESH_TOKEN_DAYS = 30;
const SALT_ROUNDS = 10;
exports.AuthService = {
    /**
     * Tạo cặp Access Token (15 phút) và Refresh Token (30 ngày)
     * Kèm ngày giờ hết hạn chi tiết (ISO 8601 string)
     * Đồng thời lưu mã băm của Refresh Token vào database
     */
    async generateTokens(user) {
        const accessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
        const tokenId = crypto_1.default.randomUUID();
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id, tokenId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
        const now = Date.now();
        const accessExpiresDate = new Date(now + ACCESS_TOKEN_MINUTES * 60 * 1000);
        const refreshExpiresDate = new Date(now + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
        const accessTokenExpiresAt = accessExpiresDate.toISOString();
        const refreshTokenExpiresAt = refreshExpiresDate.toISOString();
        await refresh_token_model_1.RefreshTokenModel.create(user.id, refreshToken, refreshExpiresDate);
        return {
            accessToken,
            refreshToken,
            accessTokenExpiresAt,
            refreshTokenExpiresAt,
        };
    },
    /**
     * Đăng nhập / Đăng ký bằng OAuth (Google, Facebook, etc.)
     */
    async oauthLogin(email, name, avatarUrl, provider = "oauth") {
        const normalizedEmail = email.toLowerCase().trim();
        let user = await user_model_1.UserModel.findByEmail(normalizedEmail);
        let safeUser;
        if (!user) {
            safeUser = await user_model_1.UserModel.create({
                name: (name && name.trim()) || normalizedEmail.split("@")[0],
                email: normalizedEmail,
                passwordHash: null,
                avatar_url: avatarUrl || "",
                provider: provider || "oauth",
            });
        }
        else {
            if (avatarUrl && !user.avatar_url) {
                await user_model_1.UserModel.update(user.id, { avatar_url: avatarUrl });
                user.avatar_url = avatarUrl;
            }
            const { password_hash: _, ...rest } = user;
            safeUser = rest;
        }
        const tokens = await this.generateTokens(safeUser);
        return {
            user: safeUser,
            ...tokens,
        };
    },
    /**
     * Đăng ký người dùng mới
     */
    async register(name, email, password) {
        const existing = await user_model_1.UserModel.findByEmail(email);
        if (existing) {
            const conflictError = new Error("Email này đã được đăng ký.");
            conflictError.code = "CONFLICT";
            throw conflictError;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
        const user = await user_model_1.UserModel.create({
            name,
            email,
            passwordHash,
        });
        const tokens = await this.generateTokens(user);
        return {
            user,
            ...tokens,
        };
    },
    /**
     * Đăng nhập người dùng
     */
    async login(email, password) {
        const user = await user_model_1.UserModel.findByEmail(email);
        if (!user || !user.password_hash) {
            const authError = new Error("Email hoặc mật khẩu không chính xác.");
            authError.code = "UNAUTHORIZED";
            throw authError;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            const authError = new Error("Email hoặc mật khẩu không chính xác.");
            authError.code = "UNAUTHORIZED";
            throw authError;
        }
        const { password_hash: _, ...safeUser } = user;
        const tokens = await this.generateTokens(safeUser);
        return {
            user: safeUser,
            ...tokens,
        };
    },
    /**
     * Xoay vòng Refresh Token (Refresh Token Rotation):
     * 1. Xác thực tính hợp lệ của Refresh Token
     * 2. Kiểm tra bản ghi trong DB
     * 3. Thu hồi token cũ và phát hành cặp Access Token (15p) + Refresh Token (30 ngày) mới kèm ngày hết hạn
     */
    async refresh(oldRefreshToken) {
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(oldRefreshToken, JWT_REFRESH_SECRET);
        }
        catch {
            const authError = new Error("Refresh token không hợp lệ hoặc đã hết hạn.");
            authError.code = "UNAUTHORIZED";
            throw authError;
        }
        const tokenRecord = await refresh_token_model_1.RefreshTokenModel.findByToken(oldRefreshToken);
        if (!tokenRecord) {
            const authError = new Error("Refresh token không tồn tại trong hệ thống.");
            authError.code = "UNAUTHORIZED";
            throw authError;
        }
        // Phát hiện tái sử dụng token đã thu hồi (Reuse Detection)
        if (tokenRecord.revoked) {
            await refresh_token_model_1.RefreshTokenModel.revokeAllForUser(tokenRecord.user_id);
            const authError = new Error("Phát hiện phiên làm việc bất thường. Vui lòng đăng nhập lại.");
            authError.code = "UNAUTHORIZED";
            throw authError;
        }
        // Kiểm tra thời hạn
        if (new Date(tokenRecord.expires_at) < new Date()) {
            const authError = new Error("Refresh token đã hết hạn. Vui lòng đăng nhập lại.");
            authError.code = "UNAUTHORIZED";
            throw authError;
        }
        // Lấy thông tin người dùng
        const user = await user_model_1.UserModel.findById(tokenRecord.user_id);
        if (!user) {
            const authError = new Error("Người dùng không còn tồn tại.");
            authError.code = "UNAUTHORIZED";
            throw authError;
        }
        // Thu hồi token cũ (Rotation)
        await refresh_token_model_1.RefreshTokenModel.revoke(oldRefreshToken);
        // Sinh cặp token mới kèm thời hạn
        const newTokens = await this.generateTokens(user);
        return {
            user,
            ...newTokens,
        };
    },
    /**
     * Đăng xuất và thu hồi Refresh Token
     */
    async logout(refreshToken) {
        if (refreshToken) {
            await refresh_token_model_1.RefreshTokenModel.revoke(refreshToken);
        }
    },
    /**
     * Lấy profile người dùng
     */
    async getProfile(userId) {
        return user_model_1.UserModel.findById(userId);
    },
    /**
     * Cập nhật thông tin tài khoản (tên, avatarUrl)
     */
    async updateProfile(userId, updates) {
        return user_model_1.UserModel.update(userId, updates);
    },
    /**
     * Xác minh Access Token
     */
    verifyAccessToken(token) {
        return jsonwebtoken_1.default.verify(token, JWT_ACCESS_SECRET);
    },
};
