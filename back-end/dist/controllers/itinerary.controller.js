"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItineraryController = void 0;
const itinerary_service_1 = require("../services/itinerary.service");
const response_1 = require("../utils/response");
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TRANSPORTS = ["motorbike", "car", "bicycle", "walking"];
function validateRequest(body) {
    if (typeof body !== "object" || body === null)
        return "Dữ liệu gửi lên không hợp lệ.";
    const b = body;
    if (typeof b.startDate !== "string" || !DATE_RE.test(b.startDate))
        return "Ngày bắt đầu không hợp lệ (định dạng YYYY-MM-DD).";
    if (typeof b.endDate !== "string" || !DATE_RE.test(b.endDate))
        return "Ngày kết thúc không hợp lệ (định dạng YYYY-MM-DD).";
    if (b.startDate > b.endDate)
        return "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";
    if (typeof b.budget !== "number" || !Number.isFinite(b.budget) || b.budget <= 0) {
        return "Ngân sách phải là số dương.";
    }
    const prefs = Array.isArray(b.preferences) ? b.preferences : [];
    if (prefs.length === 0)
        return "Chọn ít nhất một sở thích.";
    if (typeof b.currentLocation !== "string")
        return "Nơi ở hiện tại không hợp lệ.";
    if (b.transportMode !== undefined && !VALID_TRANSPORTS.includes(b.transportMode)) {
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
    if (!Array.isArray(b.places) || b.places.length === 0)
        return "Danh sách địa điểm trống.";
    const badPlace = b.places.some((p) => {
        if (typeof p !== "object" || p === null)
            return true;
        const pl = p;
        if (typeof pl.id !== "string" || pl.id.length === 0)
            return true;
        if (typeof pl.name !== "string" || pl.name.trim().length === 0)
            return true;
        if (typeof pl.lat !== "number" || !Number.isFinite(pl.lat))
            return true;
        if (typeof pl.lng !== "number" || !Number.isFinite(pl.lng))
            return true;
        if (typeof pl.category !== "string" || pl.category.length === 0)
            return true;
        return false;
    });
    if (badPlace)
        return "Một trong các địa điểm gửi lên không hợp lệ.";
    return null;
}
class ItineraryController {
    static async generate(req, res, next) {
        try {
            const validationError = validateRequest(req.body);
            if (validationError) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", validationError, 422);
                return;
            }
            const input = req.body;
            const result = await itinerary_service_1.ItineraryService.generate(input);
            (0, response_1.sendSuccess)(res, result);
        }
        catch (error) {
            console.error("[ItineraryController] generate error:", error);
            if (error?.message?.startsWith("CONFIG_MISSING")) {
                (0, response_1.sendError)(res, "INTERNAL_ERROR", "Máy chủ chưa được cấu hình khóa AI. Vui lòng thử lại sau.", 500);
                return;
            }
            (0, response_1.sendError)(res, "UPSTREAM_ERROR", error?.message || "Không thể khởi tạo lịch trình AI lúc này.", 502);
        }
    }
}
exports.ItineraryController = ItineraryController;
