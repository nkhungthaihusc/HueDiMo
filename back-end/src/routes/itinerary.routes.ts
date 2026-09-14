import { Router } from "express";
import { ItineraryController } from "../controllers/itinerary.controller";

const router = Router();

// POST /api/itinerary
router.post("/", ItineraryController.generate);

export default router;
