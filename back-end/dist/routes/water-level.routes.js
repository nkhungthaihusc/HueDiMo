"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const water_level_controller_1 = require("../controllers/water-level.controller");
const router = (0, express_1.Router)();
// GET /api/water-levels
router.get("/", water_level_controller_1.WaterLevelController.getWaterLevels);
exports.default = router;
