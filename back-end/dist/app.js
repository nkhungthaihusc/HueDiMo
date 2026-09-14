"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const db_1 = require("./config/db");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const review_routes_1 = __importDefault(require("./routes/review.routes"));
const places_routes_1 = __importDefault(require("./routes/places.routes"));
const weather_routes_1 = __importDefault(require("./routes/weather.routes"));
const water_level_routes_1 = __importDefault(require("./routes/water-level.routes"));
const reverse_geocode_routes_1 = __importDefault(require("./routes/reverse-geocode.routes"));
const itinerary_routes_1 = __importDefault(require("./routes/itinerary.routes"));
const leaderboard_routes_1 = __importDefault(require("./routes/leaderboard.routes"));
const response_1 = require("./utils/response");
const swagger_1 = require("./docs/swagger");
const logger_middleware_1 = require("./middleware/logger.middleware");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "10mb" }));
app.use(logger_middleware_1.requestLogger);
// Swagger API Documentation
app.use("/api/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerDocument));
app.get("/api/docs.json", (_req, res) => {
    res.json(swagger_1.swaggerDocument);
});
// Auth routes
app.use("/api/auth", auth_routes_1.default);
// Admin routes (Protected by authenticate and requireAdmin)
app.use("/api/admin", admin_routes_1.default);
// Places routes (Get places, Search places, Contribute place)
app.use("/api/places", places_routes_1.default);
// Media Upload routes (Upload ảnh lên Supabase Storage bucket huedimo-media)
app.use("/api/upload", upload_routes_1.default);
// Place Review routes (Đánh giá kèm ảnh của địa điểm)
app.use("/api/places/:placeId/reviews", review_routes_1.default);
// HueDiMo Core Domain Services (Weather, Water Levels, Reverse Geocode, AI Itinerary, Check-ins & Leaderboard)
app.use("/api/weather", weather_routes_1.default);
app.use("/api/water-levels", water_level_routes_1.default);
app.use("/api/reverse-geocode", reverse_geocode_routes_1.default);
app.use("/api/itinerary", itinerary_routes_1.default);
app.use("/api", leaderboard_routes_1.default);
// Health check endpoint
app.get("/api/health", async (_req, res) => {
    try {
        const result = await db_1.pool.query("SELECT NOW() as now, count(*)::int as total_places FROM public.places");
        (0, response_1.sendSuccess)(res, {
            status: "ok",
            database: "connected",
            timestamp: result.rows[0].now,
            totalPlaces: result.rows[0].total_places,
        });
    }
    catch (error) {
        (0, response_1.sendError)(res, "INTERNAL_ERROR", "Không thể kết nối đến cơ sở dữ liệu.", 500);
    }
});
// Global error handler
app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    (0, response_1.sendError)(res, "INTERNAL_ERROR", "Đã xảy ra lỗi máy chủ nội bộ.", 500);
});
exports.default = app;
