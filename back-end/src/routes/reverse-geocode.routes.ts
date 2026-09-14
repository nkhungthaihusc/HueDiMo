import { Router } from "express";
import { ReverseGeocodeController } from "../controllers/reverse-geocode.controller";

const router = Router();

// GET /api/reverse-geocode?lat=...&lng=...
router.get("/", ReverseGeocodeController.reverse);

export default router;
