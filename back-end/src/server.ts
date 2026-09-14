import "dotenv/config";
import app from "./app";
import connectDB from "./config/db";

const PORT = Number(process.env.PORT) || 3000;

// Kết nối database trước rồi mới chạy server
connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Không thể khởi động server do lỗi kết nối database:", err);
    process.exit(1);
  });