"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../config/db");
async function seedAdmin() {
    console.log("=== THIẾT LẬP TÀI KHOẢN ADMIN CHO HUEDIMO ===");
    const adminEmail = "admin@huedimo.vn";
    const adminPassword = "Admin@123456";
    const adminName = "HueDiMo Administrator";
    // Check if admin email exists
    const check = await db_1.pool.query("SELECT id, email, role FROM public.users WHERE email = $1", [adminEmail]);
    if (check.rows.length > 0) {
        console.log(`Tài khoản ${adminEmail} đã tồn tại. Đang cập nhật role thành 'admin'...`);
        await db_1.pool.query("UPDATE public.users SET role = 'admin', updated_at = NOW() WHERE email = $1", [adminEmail]);
        console.log("✅ Đã cập nhật thành công role 'admin'.");
    }
    else {
        console.log(`Đang tạo mới tài khoản admin: ${adminEmail} ...`);
        const passwordHash = await bcryptjs_1.default.hash(adminPassword, 10);
        await db_1.pool.query(`INSERT INTO public.users (name, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, 'admin', NOW(), NOW())`, [adminName, adminEmail, passwordHash]);
        console.log("✅ Đã tạo tài khoản admin thành công!");
        console.log(`👉 Email: ${adminEmail}`);
        console.log(`👉 Mật khẩu: ${adminPassword}`);
    }
    // Also promote hungthaithcstb@gmail.com if exists
    await db_1.pool.query("UPDATE public.users SET role = 'admin' WHERE email = 'hungthaithcstb@gmail.com'");
    console.log("✅ Đã cấp quyền admin cho 'hungthaithcstb@gmail.com'.");
    const list = await db_1.pool.query("SELECT id, name, email, role FROM public.users WHERE role = 'admin'");
    console.log("Danh sách Admin hiện tại:", list.rows);
    await db_1.pool.end();
}
seedAdmin().catch((err) => {
    console.error("Lỗi khi tạo admin:", err);
    process.exit(1);
});
