"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardController = void 0;
const leaderboard_service_1 = require("../services/leaderboard.service");
const response_1 = require("../utils/response");
class LeaderboardController {
    /**
     * GET /api/leaderboard
     * Lấy danh sách bảng xếp hạng du khách
     */
    static async getLeaderboard(req, res, next) {
        try {
            const limit = Math.min(50, Math.max(5, parseInt(req.query.limit, 10) || 20));
            const topUsers = await leaderboard_service_1.LeaderboardService.getTopUsers(limit);
            (0, response_1.sendSuccess)(res, topUsers);
        }
        catch (error) {
            console.error("[LeaderboardController] getLeaderboard error:", error);
            (0, response_1.sendError)(res, "INTERNAL_ERROR", "Không thể lấy bảng xếp hạng lúc này.", 500);
        }
    }
    /**
     * POST /api/checkins
     * Check-in địa điểm nhận điểm thưởng (cần xác thực)
     */
    static async checkin(req, res, next) {
        try {
            if (!req.user) {
                (0, response_1.sendError)(res, "UNAUTHORIZED", "Vui lòng đăng nhập để check-in và nhận điểm.", 401);
                return;
            }
            const { placeId, note, userLat, userLng } = req.body || {};
            if (!placeId || typeof placeId !== "string" || !placeId.trim()) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Vui lòng cung cấp mã địa điểm (placeId).", 422, { field: "placeId" });
                return;
            }
            const parsedLat = typeof userLat === "number" && Number.isFinite(userLat) ? userLat : undefined;
            const parsedLng = typeof userLng === "number" && Number.isFinite(userLng) ? userLng : undefined;
            const result = await leaderboard_service_1.LeaderboardService.checkin(req.user.id, placeId.trim(), note, parsedLat, parsedLng);
            (0, response_1.sendSuccess)(res, result, 201);
        }
        catch (error) {
            if (error?.message?.startsWith("LOCATION_TOO_FAR")) {
                (0, response_1.sendError)(res, "FORBIDDEN", error.message.replace("LOCATION_TOO_FAR: ", ""), 403);
                return;
            }
            if (error?.message?.startsWith("ALREADY_CHECKED_IN")) {
                (0, response_1.sendError)(res, "CONFLICT", error.message.replace("ALREADY_CHECKED_IN: ", ""), 409);
                return;
            }
            console.error("[LeaderboardController] checkin error:", error);
            (0, response_1.sendError)(res, "INTERNAL_ERROR", "Không thể thực hiện check-in lúc này.", 500);
        }
    }
    /**
     * GET /api/checkins/me
     * Lấy danh sách ID các địa điểm đã check-in của user hiện tại
     */
    static async getMyCheckins(req, res, next) {
        try {
            if (!req.user) {
                (0, response_1.sendError)(res, "UNAUTHORIZED", "Vui lòng đăng nhập để xem lịch sử check-in.", 401);
                return;
            }
            const placeIds = await leaderboard_service_1.LeaderboardService.getUserCheckins(req.user.id);
            (0, response_1.sendSuccess)(res, { checkedPlaceIds: placeIds });
        }
        catch (error) {
            console.error("[LeaderboardController] getMyCheckins error:", error);
            (0, response_1.sendError)(res, "INTERNAL_ERROR", "Không thể lấy lịch sử check-in.", 500);
        }
    }
}
exports.LeaderboardController = LeaderboardController;
