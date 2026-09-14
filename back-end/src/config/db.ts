import "dotenv/config";
import pg from "pg";

const { Pool } = pg;


const baseConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]+/, "") }
  : {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_NAME || "postgres",
    };

export const pool = new Pool({
  ...baseConfig,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("connect", () => {
  console.log("🐘 Supabase PostgreSQL client connected");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL error:", err);
});

export const connectDB = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT NOW() as current_time, current_database()");
    console.log(`✅ Kết nối database thành công: ${res.rows[0].current_database} lúc ${res.rows[0].current_time}`);
    return pool;
  } finally {
    client.release();
  }
};

export default connectDB;