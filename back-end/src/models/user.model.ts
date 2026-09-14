import { pool } from "../config/db";

export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  avatar_url: string;
  role: string;
  status?: string;
  points?: number;
  checkin_count?: number;
  provider?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash?: string | null;
  avatar_url?: string;
  provider?: string;
}

export type SafeUser = Omit<User, "password_hash">;

export const UserModel = {
  /**
   * Tìm người dùng theo địa chỉ email (bao gồm cả password_hash để so khớp)
   */
  async findByEmail(email: string): Promise<User | null> {
    const res = await pool.query(
      "SELECT id, email, password_hash, name, avatar_url, role, COALESCE(status, 'active') as status, COALESCE(points, 0) as points, COALESCE(checkin_count, 0) as checkin_count, provider, created_at, updated_at FROM public.users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    return res.rows[0] || null;
  },

  /**
   * Tìm người dùng theo ID (trả về dữ liệu an toàn, không có password_hash)
   */
  async findById(id: string): Promise<SafeUser | null> {
    const res = await pool.query(
      "SELECT id, email, name, avatar_url, role, COALESCE(status, 'active') as status, COALESCE(points, 0) as points, COALESCE(checkin_count, 0) as checkin_count, provider, created_at, updated_at FROM public.users WHERE id = $1",
      [id]
    );
    return res.rows[0] || null;
  },

  /**
   * Tạo người dùng mới trong database
   */
  async create(data: CreateUserData): Promise<SafeUser> {
    const res = await pool.query(
      `INSERT INTO public.users (name, email, password_hash, avatar_url, provider, points, checkin_count, status)
       VALUES ($1, $2, $3, $4, $5, 0, 0, 'active')
       RETURNING id, name, email, avatar_url, role, COALESCE(status, 'active') as status, points, checkin_count, provider, created_at, updated_at`,
      [
        data.name.trim(),
        data.email.toLowerCase().trim(),
        data.passwordHash || null,
        data.avatar_url || "",
        data.provider || "local",
      ]
    );
    return res.rows[0];
  },

  /**
   * Cập nhật thông tin người dùng (họ tên, ảnh đại diện)
   */
  async update(id: string, updates: Partial<Pick<User, "name" | "avatar_url">>): Promise<SafeUser | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(updates.name.trim());
    }
    if (updates.avatar_url !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(updates.avatar_url.trim());
    }

    if (fields.length === 0) return this.findById(id);

    fields.push("updated_at = NOW()");
    values.push(id);
    const res = await pool.query(
      `UPDATE public.users 
       SET ${fields.join(", ")} 
       WHERE id = $${idx} 
       RETURNING id, name, email, avatar_url, role, COALESCE(points, 0) as points, COALESCE(checkin_count, 0) as checkin_count, created_at, updated_at`,
      values
    );
    return res.rows[0] || null;
  }
};

