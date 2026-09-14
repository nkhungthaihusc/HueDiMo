"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.pool = void 0;
require("dotenv/config");
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
const baseConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]+/, "") }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_NAME || "postgres",
    };
exports.pool = new Pool({
    ...baseConfig,
    ssl: {
        rejectUnauthorized: false,
    },
});
exports.pool.on("connect", () => {
    console.log("🐘 Supabase PostgreSQL client connected");
});
exports.pool.on("error", (err) => {
    console.error("❌ PostgreSQL error:", err);
});
const connectDB = async () => {
    const client = await exports.pool.connect();
    try {
        const res = await client.query("SELECT NOW() as current_time, current_database()");
        console.log(`✅ Kết nối database thành công: ${res.rows[0].current_database} lúc ${res.rows[0].current_time}`);
        return exports.pool;
    }
    finally {
        client.release();
    }
};
exports.connectDB = connectDB;
exports.default = exports.connectDB;
