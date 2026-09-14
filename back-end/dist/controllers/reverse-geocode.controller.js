"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReverseGeocodeController = void 0;
const reverse_geocode_service_1 = require("../services/reverse-geocode.service");
const response_1 = require("../utils/response");
class ReverseGeocodeController {
    static async reverse(req, res, next) {
        try {
            const latStr = req.query.lat;
            const lngStr = req.query.lng;
            if (!latStr || !lngStr) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Thiếu toạ độ lat hoặc lng.", 400);
                return;
            }
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);
            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Toạ độ không hợp lệ (lat: -90 đến 90, lng: -180 đến 180).", 400);
                return;
            }
            const result = await reverse_geocode_service_1.ReverseGeocodeService.reverse(lat, lng);
            (0, response_1.sendSuccess)(res, result);
        }
        catch (error) {
            console.error("[ReverseGeocodeController] error:", error);
            (0, response_1.sendError)(res, "INTERNAL_ERROR", "Không thể giải mã địa chỉ từ toạ độ.", 500);
        }
    }
}
exports.ReverseGeocodeController = ReverseGeocodeController;
