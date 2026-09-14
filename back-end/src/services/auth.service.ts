import jwt, { type JwtPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { UserModel, type SafeUser } from "../models/user.model";
import { RefreshTokenModel } from "../models/refresh-token.model";

const JWT_ACCESS_SECRET = process.env.JWT_SECRET || "huedimo_default_secret_key_change_in_production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "huedimo_default_refresh_secret_key_2026";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "30d";
const ACCESS_TOKEN_MINUTES = 15;
const REFRESH_TOKEN_DAYS = 30;
const SALT_ROUNDS = 10;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface AccessTokenPayload extends JwtPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

export type AuthUserPayload = AccessTokenPayload;

export interface RefreshTokenPayload extends JwtPayload {
  id: string;
  tokenId: string;
}

export const AuthService = {
  /**
   * Tạo cặp Access Token (15 phút) và Refresh Token (30 ngày)
   * Kèm ngày giờ hết hạn chi tiết (ISO 8601 string)
   * Đồng thời lưu mã băm của Refresh Token vào database
   */
  async generateTokens(user: SafeUser): Promise<AuthTokens> {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    const tokenId = crypto.randomUUID();
    const refreshToken = jwt.sign(
      { id: user.id, tokenId },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    const now = Date.now();
    const accessExpiresDate = new Date(now + ACCESS_TOKEN_MINUTES * 60 * 1000);
    const refreshExpiresDate = new Date(now + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    const accessTokenExpiresAt = accessExpiresDate.toISOString();
    const refreshTokenExpiresAt = refreshExpiresDate.toISOString();

    await RefreshTokenModel.create(user.id, refreshToken, refreshExpiresDate);

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
  async oauthLogin(
    email: string,
    name?: string,
    avatarUrl?: string,
    provider: string = "oauth"
  ): Promise<AuthResult> {
    const normalizedEmail = email.toLowerCase().trim();
    let user = await UserModel.findByEmail(normalizedEmail);
    let safeUser: SafeUser;

    if (!user) {
      safeUser = await UserModel.create({
        name: (name && name.trim()) || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        passwordHash: null,
        avatar_url: avatarUrl || "",
        provider: provider || "oauth",
      });
    } else {
      // Kiểm tra tài khoản có bị khóa không (cả OAuth)
      if (user.status === "banned") {
        const bannedError: any = new Error("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        bannedError.code = "FORBIDDEN";
        throw bannedError;
      }
      if (avatarUrl && !user.avatar_url) {
        await UserModel.update(user.id, { avatar_url: avatarUrl });
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
  async register(name: string, email: string, password: string): Promise<AuthResult> {
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      const conflictError: any = new Error("Email này đã được đăng ký.");
      conflictError.code = "CONFLICT";
      throw conflictError;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await UserModel.create({
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
  async login(email: string, password: string): Promise<AuthResult> {
    const user = await UserModel.findByEmail(email);
    if (!user || !user.password_hash) {
      const authError: any = new Error("Email hoặc mật khẩu không chính xác.");
      authError.code = "UNAUTHORIZED";
      throw authError;
    }

    // Kiểm tra tài khoản có bị khóa không
    if (user.status === "banned") {
      const bannedError: any = new Error("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
      bannedError.code = "FORBIDDEN";
      throw bannedError;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const authError: any = new Error("Email hoặc mật khẩu không chính xác.");
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
  async refresh(oldRefreshToken: string): Promise<AuthResult> {
    let decoded: RefreshTokenPayload;
    try {
      decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET) as RefreshTokenPayload;
    } catch {
      const authError: any = new Error("Refresh token không hợp lệ hoặc đã hết hạn.");
      authError.code = "UNAUTHORIZED";
      throw authError;
    }

    const tokenRecord = await RefreshTokenModel.findByToken(oldRefreshToken);

    if (!tokenRecord) {
      const authError: any = new Error("Refresh token không tồn tại trong hệ thống.");
      authError.code = "UNAUTHORIZED";
      throw authError;
    }

    // Phát hiện tái sử dụng token đã thu hồi (Reuse Detection)
    if (tokenRecord.revoked) {
      await RefreshTokenModel.revokeAllForUser(tokenRecord.user_id);
      const authError: any = new Error("Phát hiện phiên làm việc bất thường. Vui lòng đăng nhập lại.");
      authError.code = "UNAUTHORIZED";
      throw authError;
    }

    // Kiểm tra thời hạn
    if (new Date(tokenRecord.expires_at) < new Date()) {
      const authError: any = new Error("Refresh token đã hết hạn. Vui lòng đăng nhập lại.");
      authError.code = "UNAUTHORIZED";
      throw authError;
    }

    // Lấy thông tin người dùng
    const user = await UserModel.findById(tokenRecord.user_id);
    if (!user) {
      const authError: any = new Error("Người dùng không còn tồn tại.");
      authError.code = "UNAUTHORIZED";
      throw authError;
    }

    // Thu hồi token cũ (Rotation)
    await RefreshTokenModel.revoke(oldRefreshToken);

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
  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await RefreshTokenModel.revoke(refreshToken);
    }
  },

  /**
   * Lấy profile người dùng
   */
  async getProfile(userId: string): Promise<SafeUser | null> {
    return UserModel.findById(userId);
  },

  /**
   * Cập nhật thông tin tài khoản (tên, avatarUrl)
   */
  async updateProfile(userId: string, updates: { name?: string; avatar_url?: string }): Promise<SafeUser | null> {
    return UserModel.update(userId, updates);
  },

  /**
   * Xác minh Access Token
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, JWT_ACCESS_SECRET) as AccessTokenPayload;
  },
};

