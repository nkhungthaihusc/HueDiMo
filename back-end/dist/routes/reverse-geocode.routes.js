"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reverse_geocode_controller_1 = require("../controllers/reverse-geocode.controller");
const router = (0, express_1.Router)();
// GET /api/reverse-geocode?lat=...&lng=...
router.get("/", reverse_geocode_controller_1.ReverseGeocodeController.reverse);
exports.default = router;
