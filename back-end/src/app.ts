import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { pool } from "./config/db";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import uploadRoutes from "./routes/upload.routes";
import reviewRoutes from "./routes/review.routes";
import placesRoutes from "./routes/places.routes";
import weatherRoutes from "./routes/weather.routes";
import waterLevelRoutes from "./routes/water-level.routes";
import reverseGeocodeRoutes from "./routes/reverse-geocode.routes";
import itineraryRoutes from "./routes/itinerary.routes";
import leaderboardRoutes from "./routes/leaderboard.routes";
import { sendSuccess, sendError } from "./utils/response";
import { swaggerDocument } from "./docs/swagger";
import { requestLogger } from "./middleware/logger.middleware";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(requestLogger);


// Swagger API Documentation
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get("/api/docs.json", (_req: Request, res: Response) => {
  res.json(swaggerDocument);
});

// Auth routes
app.use("/api/auth", authRoutes);

// Admin routes (Protected by authenticate and requireAdmin)
app.use("/api/admin", adminRoutes);

// Places routes (Get places, Search places, Contribute place)
app.use("/api/places", placesRoutes);

// Media Upload routes (Upload ảnh lên Supabase Storage bucket huedimo-media)
app.use("/api/upload", uploadRoutes);

// Place Review routes (Đánh giá kèm ảnh của địa điểm)
app.use("/api/places/:placeId/reviews", reviewRoutes);

// HueDiMo Core Domain Services (Weather, Water Levels, Reverse Geocode, AI Itinerary, Check-ins & Leaderboard)
app.use("/api/weather", weatherRoutes);
app.use("/api/water-levels", waterLevelRoutes);
app.use("/api/reverse-geocode", reverseGeocodeRoutes);
app.use("/api/itinerary", itineraryRoutes);
app.use("/api/itineraries", itineraryRoutes);
app.use("/api", leaderboardRoutes);



// Health check endpoint
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT NOW() as now, count(*)::int as total_places FROM public.places");
    sendSuccess(res, {
      status: "ok",
      database: "connected",
      timestamp: result.rows[0].now,
      totalPlaces: result.rows[0].total_places,
    });
  } catch (error: any) {
    sendError(res, "INTERNAL_ERROR", "Không thể kết nối đến cơ sở dữ liệu.", 500);
  }
});



// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  sendError(res, "INTERNAL_ERROR", "Đã xảy ra lỗi máy chủ nội bộ.", 500);
});

export default app;
