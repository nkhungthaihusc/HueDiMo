import type { Request, Response, NextFunction } from "express";
import { WaterLevelService } from "../services/water-level.service";
import { sendSuccess, sendError } from "../utils/response";

export class WaterLevelController {
  public static async getWaterLevels(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await WaterLevelService.getWaterLevels();
      sendSuccess(res, data);
    } catch (error: any) {
      console.error("[WaterLevelController] getWaterLevels error:", error);
      sendError(res, "UPSTREAM_ERROR", "Không thể lấy dữ liệu mực nước và quan trắc ngập lụt tại thời điểm này.", 502);
    }
  }
}
