"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaterLevelController = void 0;
const water_level_service_1 = require("../services/water-level.service");
const response_1 = require("../utils/response");
class WaterLevelController {
    static async getWaterLevels(_req, res, next) {
        try {
            const data = await water_level_service_1.WaterLevelService.getWaterLevels();
            (0, response_1.sendSuccess)(res, data);
        }
        catch (error) {
            console.error("[WaterLevelController] getWaterLevels error:", error);
            (0, response_1.sendError)(res, "UPSTREAM_ERROR", "Không thể lấy dữ liệu mực nước và quan trắc ngập lụt tại thời điểm này.", 502);
        }
    }
}
exports.WaterLevelController = WaterLevelController;
