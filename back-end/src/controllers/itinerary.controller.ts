import type { Request, Response, NextFunction } from "express";
import { ItineraryService, type ItineraryRequestInput } from "../services/itinerary.service";
import { sendSuccess, sendError } from "../utils/response";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TRANSPORTS = ["motorbike", "car", "bicycle", "walking"];

function validateRequest(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return "Dữ liệu gửi lên không hợp lệ.";
  const b = body as Record<string, unknown>;

  if (typeof b.startDate !== "string" || !DATE_RE.test(b.startDate)) return "Ngày bắt đầu không hợp lệ (định dạng YYYY-MM-DD).";
  if (typeof b.endDate !== "string" || !DATE_RE.test(b.endDate)) return "Ngày kết thúc không hợp lệ (định dạng YYYY-MM-DD).";
  if (b.startDate > b.endDate) return "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";

  if (typeof b.budget !== "number" || !Number.isFinite(b.budget) || b.budget <= 0) {
    return "Ngân sách phải là số dương.";
  }

  const prefs = Array.isArray(b.preferences) ? b.preferences : [];
  if (prefs.length === 0) return "Chọn ít nhất một sở thích.";

  if (typeof b.currentLocation !== "string") return "Nơi ở hiện tại không hợp lệ.";

  if (b.transportMode !== undefined && !VALID_TRANSPORTS.includes(b.transportMode as string)) {
    return "Phương tiện di chuyển không hợp lệ.";
  }

  if (b.groupSize !== undefined && (typeof b.groupSize !== "number" || !Number.isFinite(b.groupSize) || b.groupSize <= 0)) {
    return "Số lượng người phải là số nguyên dương.";
  }

  if (b.startPlaceId !== null && b.startPlaceId !== undefined && typeof b.startPlaceId !== "string") {
    return "Điểm bắt đầu không hợp lệ.";
  }
  if (b.endPlaceId !== null && b.endPlaceId !== undefined && typeof b.endPlaceId !== "string") {
    return "Điểm kết thúc không hợp lệ.";
  }

  if (!Array.isArray(b.places) || b.places.length === 0) return "Danh sách địa điểm trống.";

  const badPlace = b.places.some((p) => {
    if (typeof p !== "object" || p === null) return true;
    const pl = p as Record<string, unknown>;
    if (typeof pl.id !== "string" || pl.id.length === 0) return true;
    if (typeof pl.name !== "string" || pl.name.trim().length === 0) return true;
    if (typeof pl.lat !== "number" || !Number.isFinite(pl.lat)) return true;
    if (typeof pl.lng !== "number" || !Number.isFinite(pl.lng)) return true;
    if (typeof pl.category !== "string" || pl.category.length === 0) return true;
    return false;
  });
  if (badPlace) return "Một trong các địa điểm gửi lên không hợp lệ.";

  return null;
}

export class ItineraryController {
  public static async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validationError = validateRequest(req.body);
      if (validationError) {
        sendError(res, "VALIDATION_ERROR", validationError, 422);
        return;
      }

      const input = req.body as ItineraryRequestInput;
      const result = await ItineraryService.generate(input);
      sendSuccess(res, result);
    } catch (error: any) {
      console.error("[ItineraryController] generate error:", error);
      if (error?.message?.startsWith("CONFIG_MISSING")) {
        sendError(res, "INTERNAL_ERROR", "Máy chủ chưa được cấu hình khóa AI. Vui lòng thử lại sau.", 500);
        return;
      }
      sendError(res, "UPSTREAM_ERROR", error?.message || "Không thể khởi tạo lịch trình AI lúc này.", 502);
    }
  }
}
