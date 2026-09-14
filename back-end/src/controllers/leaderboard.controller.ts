import type { Request, Response, NextFunction } from "express";
import { LeaderboardService } from "../services/leaderboard.service";
import { sendSuccess, sendError } from "../utils/response";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";

export class LeaderboardController {
  /**
   * GET /api/leaderboard
   * Lấy danh sách bảng xếp hạng du khách
   */
  public static async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(50, Math.max(5, parseInt(req.query.limit as string, 10) || 20));
      const topUsers = await LeaderboardService.getTopUsers(limit);
      sendSuccess(res, topUsers);
    } catch (error: any) {
      console.error("[LeaderboardController] getLeaderboard error:", error);
      sendError(res, "INTERNAL_ERROR", "Không thể lấy bảng xếp hạng lúc này.", 500);
    }
  }

  /**
   * POST /api/checkins
   * Check-in địa điểm nhận điểm thưởng (cần xác thực)
   */
  public static async checkin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Vui lòng đăng nhập để check-in và nhận điểm.", 401);
        return;
      }

      const { placeId, note, userLat, userLng } = req.body || {};

      if (!placeId || typeof placeId !== "string" || !placeId.trim()) {
        sendError(res, "VALIDATION_ERROR", "Vui lòng cung cấp mã địa điểm (placeId).", 422, { field: "placeId" });
        return;
      }

      const parsedLat = typeof userLat === "number" && Number.isFinite(userLat) ? userLat : undefined;
      const parsedLng = typeof userLng === "number" && Number.isFinite(userLng) ? userLng : undefined;

      const result = await LeaderboardService.checkin(req.user.id, placeId.trim(), note, parsedLat, parsedLng);
      sendSuccess(res, result, 201);
    } catch (error: any) {
      if (error?.message?.startsWith("LOCATION_TOO_FAR")) {
        sendError(res, "FORBIDDEN", error.message.replace("LOCATION_TOO_FAR: ", ""), 403);
        return;
      }
      if (error?.message?.startsWith("ALREADY_CHECKED_IN")) {
        sendError(res, "CONFLICT", error.message.replace("ALREADY_CHECKED_IN: ", ""), 409);
        return;
      }
      console.error("[LeaderboardController] checkin error:", error);
      sendError(res, "INTERNAL_ERROR", "Không thể thực hiện check-in lúc này.", 500);
    }
  }

  /**
   * GET /api/checkins/me
   * Lấy danh sách ID các địa điểm đã check-in của user hiện tại
   */
  public static async getMyCheckins(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, "UNAUTHORIZED", "Vui lòng đăng nhập để xem lịch sử check-in.", 401);
        return;
      }

      const placeIds = await LeaderboardService.getUserCheckins(req.user.id);
      sendSuccess(res, { checkedPlaceIds: placeIds });
    } catch (error: any) {
      console.error("[LeaderboardController] getMyCheckins error:", error);
      sendError(res, "INTERNAL_ERROR", "Không thể lấy lịch sử check-in.", 500);
    }
  }
}
