"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const db_1 = __importDefault(require("./config/db"));
const PORT = Number(process.env.PORT) || 3000;
// Kết nối database trước rồi mới chạy server
(0, db_1.default)()
    .then(() => {
    app_1.default.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
    });
})
    .catch((err) => {
    console.error("❌ Không thể khởi động server do lỗi kết nối database:", err);
    process.exit(1);
});
