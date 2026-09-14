import type { Request, Response, NextFunction } from "express";
import { ReverseGeocodeService } from "../services/reverse-geocode.service";
import { sendSuccess, sendError } from "../utils/response";

export class ReverseGeocodeController {
  public static async reverse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const latStr = req.query.lat as string;
      const lngStr = req.query.lng as string;

      if (!latStr || !lngStr) {
        sendError(res, "VALIDATION_ERROR", "Thiếu toạ độ lat hoặc lng.", 400);
        return;
      }

      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        sendError(res, "VALIDATION_ERROR", "Toạ độ không hợp lệ (lat: -90 đến 90, lng: -180 đến 180).", 400);
        return;
      }

      const result = await ReverseGeocodeService.reverse(lat, lng);
      sendSuccess(res, result);
    } catch (error: any) {
      console.error("[ReverseGeocodeController] error:", error);
      sendError(res, "INTERNAL_ERROR", "Không thể giải mã địa chỉ từ toạ độ.", 500);
    }
  }
}
