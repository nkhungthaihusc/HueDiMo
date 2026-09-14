"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenModel = void 0;
exports.hashToken = hashToken;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../config/db");
function hashToken(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
}
exports.RefreshTokenModel = {
    /**
     * Lưu mã băm refresh token mới vào database
     */
    async create(userId, token, expiresAt) {
        const tokenHash = hashToken(token);
        const res = await db_1.pool.query(`INSERT INTO public.refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`, [userId, tokenHash, expiresAt.toISOString()]);
        return res.rows[0];
    },
    /**
     * Tìm refresh token theo mã băm
     */
    async findByToken(token) {
        const tokenHash = hashToken(token);
        const res = await db_1.pool.query("SELECT * FROM public.refresh_tokens WHERE token_hash = $1", [tokenHash]);
        return res.rows[0] || null;
    },
    /**
     * Thu hồi một refresh token (khi đã dùng để xoay vòng hoặc khi logout)
     */
    async revoke(token) {
        const tokenHash = hashToken(token);
        await db_1.pool.query("UPDATE public.refresh_tokens SET revoked = TRUE, updated_at = NOW() WHERE token_hash = $1", [tokenHash]);
    },
    /**
     * Thu hồi toàn bộ refresh token của một user (phát hiện tấn công dùng lại token cũ)
     */
    async revokeAllForUser(userId) {
        await db_1.pool.query("UPDATE public.refresh_tokens SET revoked = TRUE, updated_at = NOW() WHERE user_id = $1", [userId]);
    },
};
