import jwt, { type JwtPayload } from "jsonwebtoken";
import { pool } from "../config/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { UserModel, type SafeUser } from "../models/user.model";
import { RefreshTokenModel } from "../models/refresh-token.model";
import { sendEmailOtp, withVerifiedEmailOtp } from "./email-otp.service";
import type { PoolClient } from "pg";

const JWT_ACCESS_SECRET = process.env.JWT_SECRET || "huedimo_default_secret_key_change_in_production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "huedimo_default_refresh_secret_key_2026";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "30d";
const ACCESS_TOKEN_MINUTES = 15;
const REFRESH_TOKEN_DAYS = 30;
const SALT_ROUNDS = 10;
const PASSWORD_RESET_AUDIENCE = "huedimo-password-reset";
export const PASSWORD_RESET_TOKEN_TTL_SECONDS = 300;

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

interface PasswordAccount {
  id: string;
  email: string;
  password_hash: string;
}

async function findPasswordAccount(id: string) {
  const { rows: [user] } = await pool.query<PasswordAccount>(
    `SELECT id, email, password_hash FROM public.users
     WHERE id = $1 AND provider = 'local' AND password_hash IS NOT NULL AND status IS DISTINCT FROM 'banned'`,
    [id],
  );
  return user;
}

function passwordOtpSubject(user: PasswordAccount): string {
  return JSON.stringify([user.id, user.password_hash]);
}

async function findPasswordAccountByEmail(email: string): Promise<PasswordAccount | null> {
  const user = await UserModel.findByEmail(email);
  if (!user?.password_hash || user.provider !== "local" || user.status === "banned") return null;
  return { id: user.id, email: user.email, password_hash: user.password_hash };
}

function passwordResetSigningKey(user: PasswordAccount, secret: string): Buffer {
  // A successful password update changes the signing key, invalidating any outstanding reset token.
  return crypto.createHmac("sha256", secret)
    .update(JSON.stringify([PASSWORD_RESET_AUDIENCE, user.id, user.email, user.password_hash]))
    .digest();
}

async function replacePassword(client: Pick<PoolClient, "query">, user: PasswordAccount, nextHash: string): Promise<boolean> {
  const result = await client.query(
    `WITH changed AS (
       UPDATE public.users SET password_hash = $1, updated_at = NOW()
       WHERE id = $2 AND password_hash = $3 AND email = $4 AND provider = 'local'
         AND status IS DISTINCT FROM 'banned'
       RETURNING id
     ), revoked AS (
       UPDATE public.refresh_tokens SET revoked = TRUE, updated_at = NOW()
       WHERE user_id IN (SELECT id FROM changed)
     )
     SELECT id FROM changed`,
    [nextHash, user.id, user.password_hash, user.email],
  );
  return result.rowCount === 1;
}

export const AuthService = {
  async requestPasswordOtp(userId: string, secret: string) {
    const user = await findPasswordAccount(userId);
    if (!user) return "ineligible";
    return sendEmailOtp(user.email, "change_password", passwordOtpSubject(user), secret);
  },

  async requestPasswordResetOtp(email: string, secret: string) {
    const user = await findPasswordAccountByEmail(email);
    if (!user) return "ineligible";
    return sendEmailOtp(user.email, "reset_password", passwordOtpSubject(user), secret);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string, otp: string, otpSecret: string) {
    const user = await findPasswordAccount(userId);
    if (!user || !await bcrypt.compare(currentPassword, user.password_hash)) return "invalid_password";

    const changed = await withVerifiedEmailOtp(
      user.email, "change_password", passwordOtpSubject(user), otp, otpSecret,
      async (client) => replacePassword(client, user, await bcrypt.hash(newPassword, SALT_ROUNDS)),
    );
    return changed ? "changed" : "invalid_otp";
  },

  async verifyPasswordResetOtp(email: string, otp: string, secret: string) {
    const user = await findPasswordAccountByEmail(email);
    if (!user) return null;
    return withVerifiedEmailOtp(
      user.email, "reset_password", passwordOtpSubject(user), otp, secret,
      async () => jwt.sign({}, passwordResetSigningKey(user, secret), {
        algorithm: "HS256",
        audience: PASSWORD_RESET_AUDIENCE,
        subject: user.id,
        expiresIn: PASSWORD_RESET_TOKEN_TTL_SECONDS,
      }),
    );
  },

  async resetPassword(email: string, newPassword: string, resetToken: string, secret: string) {
    const user = await findPasswordAccountByEmail(email);
    if (!user) return false;
    try {
      jwt.verify(resetToken, passwordResetSigningKey(user, secret), {
        algorithms: ["HS256"],
        audience: PASSWORD_RESET_AUDIENCE,
        subject: user.id,
      });
    } catch {
      return false;
    }
    return replacePassword(pool, user, await bcrypt.hash(newPassword, SALT_ROUNDS));
  },
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
   * Đăng nhập / Đăng ký bằng OAuth (Google)
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
  async register(name: string, email: string, password: string, otp: string, secret: string): Promise<AuthResult | null> {
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      const conflictError: any = new Error("Email này đã được đăng ký.");
      conflictError.code = "CONFLICT";
      throw conflictError;
    }

    const user = await withVerifiedEmailOtp(email, "register", "", otp, secret, async (client) =>
      UserModel.create({ name, email, passwordHash: await bcrypt.hash(password, SALT_ROUNDS) }, client),
    );
    if (!user) return null;

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

