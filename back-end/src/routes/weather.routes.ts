import { Router } from "express";
import { WeatherController } from "../controllers/weather.controller";

const router = Router();

// GET /api/weather/rainfall
router.get("/rainfall", WeatherController.getRainfall);

export default router;
