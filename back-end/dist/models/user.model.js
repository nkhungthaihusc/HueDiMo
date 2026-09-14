"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const db_1 = require("../config/db");
exports.UserModel = {
    /**
     * Tìm người dùng theo địa chỉ email (bao gồm cả password_hash để so khớp)
     */
    async findByEmail(email) {
        const res = await db_1.pool.query("SELECT id, email, password_hash, name, avatar_url, role, COALESCE(points, 0) as points, COALESCE(checkin_count, 0) as checkin_count, provider, created_at, updated_at FROM public.users WHERE email = $1", [email.toLowerCase().trim()]);
        return res.rows[0] || null;
    },
    /**
     * Tìm người dùng theo ID (trả về dữ liệu an toàn, không có password_hash)
     */
    async findById(id) {
        const res = await db_1.pool.query("SELECT id, email, name, avatar_url, role, COALESCE(points, 0) as points, COALESCE(checkin_count, 0) as checkin_count, provider, created_at, updated_at FROM public.users WHERE id = $1", [id]);
        return res.rows[0] || null;
    },
    /**
     * Tạo người dùng mới trong database
     */
    async create(data) {
        const res = await db_1.pool.query(`INSERT INTO public.users (name, email, password_hash, avatar_url, provider, points, checkin_count)
       VALUES ($1, $2, $3, $4, $5, 0, 0)
       RETURNING id, name, email, avatar_url, role, points, checkin_count, provider, created_at, updated_at`, [
            data.name.trim(),
            data.email.toLowerCase().trim(),
            data.passwordHash || null,
            data.avatar_url || "",
            data.provider || "local",
        ]);
        return res.rows[0];
    },
    /**
     * Cập nhật thông tin người dùng (họ tên, ảnh đại diện)
     */
    async update(id, updates) {
        const fields = [];
        const values = [];
        let idx = 1;
        if (updates.name !== undefined) {
            fields.push(`name = $${idx++}`);
            values.push(updates.name.trim());
        }
        if (updates.avatar_url !== undefined) {
            fields.push(`avatar_url = $${idx++}`);
            values.push(updates.avatar_url.trim());
        }
        if (fields.length === 0)
            return this.findById(id);
        fields.push("updated_at = NOW()");
        values.push(id);
        const res = await db_1.pool.query(`UPDATE public.users 
       SET ${fields.join(", ")} 
       WHERE id = $${idx} 
       RETURNING id, name, email, avatar_url, role, COALESCE(points, 0) as points, COALESCE(checkin_count, 0) as checkin_count, created_at, updated_at`, values);
        return res.rows[0] || null;
    }
};
