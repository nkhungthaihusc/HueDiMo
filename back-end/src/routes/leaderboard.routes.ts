import { Router } from "express";
import { LeaderboardController } from "../controllers/leaderboard.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// GET /api/leaderboard - Công khai xem bảng xếp hạng
router.get("/leaderboard", LeaderboardController.getLeaderboard);

// POST /api/checkins - Yêu cầu đăng nhập để check-in
router.post("/checkins", authenticate, LeaderboardController.checkin);

// GET /api/checkins/me - Lấy các địa điểm đã check-in của user
router.get("/checkins/me", authenticate, LeaderboardController.getMyCheckins);

export default router;
