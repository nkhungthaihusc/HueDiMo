import { Router } from "express";
import { WaterLevelController } from "../controllers/water-level.controller";

const router = Router();

// GET /api/water-levels
router.get("/", WaterLevelController.getWaterLevels);

export default router;
