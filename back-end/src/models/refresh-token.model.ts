import crypto from "crypto";
import { pool } from "../config/db";

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked: boolean;
  created_at: string;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const RefreshTokenModel = {
  /**
   * Lưu mã băm refresh token mới vào database
   */
  async create(userId: string, token: string, expiresAt: Date): Promise<RefreshTokenRecord> {
    const tokenHash = hashToken(token);
    const res = await pool.query(
      `INSERT INTO public.refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, tokenHash, expiresAt.toISOString()]
    );
    return res.rows[0];
  },

  /**
   * Tìm refresh token theo mã băm
   */
  async findByToken(token: string): Promise<RefreshTokenRecord | null> {
    const tokenHash = hashToken(token);
    const res = await pool.query(
      "SELECT * FROM public.refresh_tokens WHERE token_hash = $1",
      [tokenHash]
    );
    return res.rows[0] || null;
  },

  /**
   * Thu hồi một refresh token (khi đã dùng để xoay vòng hoặc khi logout)
   */
  async revoke(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    await pool.query(
      "UPDATE public.refresh_tokens SET revoked = TRUE, updated_at = NOW() WHERE token_hash = $1",
      [tokenHash]
    );
  },

  /**
   * Thu hồi toàn bộ refresh token của một user (phát hiện tấn công dùng lại token cũ)
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await pool.query(
      "UPDATE public.refresh_tokens SET revoked = TRUE, updated_at = NOW() WHERE user_id = $1",
      [userId]
    );
  },
};
