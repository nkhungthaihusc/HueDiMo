import type { Request, Response, NextFunction } from "express";
import { WeatherService } from "../services/weather.service";
import { sendSuccess, sendError } from "../utils/response";

export class WeatherController {
  public static async getRainfall(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await WeatherService.getRainfall();
      sendSuccess(res, data);
    } catch (error: any) {
      console.error("[WeatherController] getRainfall error:", error);
      sendError(res, "UPSTREAM_ERROR", "Không thể lấy dữ liệu lượng mưa tại thời điểm này.", 502);
    }
  }
}
