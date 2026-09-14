"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const itinerary_controller_1 = require("../controllers/itinerary.controller");
const router = (0, express_1.Router)();
// POST /api/itinerary
router.post("/", itinerary_controller_1.ItineraryController.generate);
exports.default = router;
