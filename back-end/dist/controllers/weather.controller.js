"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherController = void 0;
const weather_service_1 = require("../services/weather.service");
const response_1 = require("../utils/response");
class WeatherController {
    static async getRainfall(_req, res, next) {
        try {
            const data = await weather_service_1.WeatherService.getRainfall();
            (0, response_1.sendSuccess)(res, data);
        }
        catch (error) {
            console.error("[WeatherController] getRainfall error:", error);
            (0, response_1.sendError)(res, "UPSTREAM_ERROR", "Không thể lấy dữ liệu lượng mưa tại thời điểm này.", 502);
        }
    }
}
exports.WeatherController = WeatherController;
