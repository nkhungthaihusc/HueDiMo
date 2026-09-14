"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leaderboard_controller_1 = require("../controllers/leaderboard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// GET /api/leaderboard - Công khai xem bảng xếp hạng
router.get("/leaderboard", leaderboard_controller_1.LeaderboardController.getLeaderboard);
// POST /api/checkins - Yêu cầu đăng nhập để check-in
router.post("/checkins", auth_middleware_1.authenticate, leaderboard_controller_1.LeaderboardController.checkin);
// GET /api/checkins/me - Lấy các địa điểm đã check-in của user
router.get("/checkins/me", auth_middleware_1.authenticate, leaderboard_controller_1.LeaderboardController.getMyCheckins);
exports.default = router;
