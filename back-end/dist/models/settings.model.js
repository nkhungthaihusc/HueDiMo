"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsModel = exports.DEFAULT_AI_CONFIG = void 0;
exports.normalizeModelName = normalizeModelName;
const db_1 = require("../config/db");
exports.DEFAULT_AI_CONFIG = {
    model: "big-pickle",
    temperature: 0.4,
    maxTokens: 4096,
    customInstruction: "",
    provider: "opencode-zen",
};
/**
 * Chuẩn hóa tên model:
 * Tự động chuyển đổi các dạng như "Nemotron 3 Ultra Free" -> "nemotron-3-ultra-free",
 * loại bỏ khoảng trắng thừa, thay khoảng trắng và dấu gạch dưới thành dấu gạch ngang '-',
 * chuyển chữ thường, giữ nguyên dấu '/' nếu có provider prefix (ví dụ "anthropic/claude-sonnet-4-5").
 */
function normalizeModelName(raw) {
    if (!raw || typeof raw !== "string")
        return "";
    const trimmed = raw.trim();
    if (!trimmed)
        return "";
    // Nếu có prefix provider dạng "provider/model_name"
    if (trimmed.includes("/")) {
        const parts = trimmed.split("/");
        const provider = parts[0].trim().toLowerCase();
        const modelPart = parts.slice(1).join("/").trim().toLowerCase()
            .replace(/[\s_]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        return `${provider}/${modelPart}`;
    }
    // Dạng thường không có '/'
    return trimmed
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}
exports.SettingsModel = {
    /**
     * Lấy cấu hình theo key
     */
    async getSetting(key, defaultValue) {
        try {
            const res = await db_1.pool.query("SELECT value FROM public.system_settings WHERE key = $1", [key]);
            if (res.rows.length === 0 || !res.rows[0].value) {
                return defaultValue;
            }
            return res.rows[0].value;
        }
        catch (err) {
            console.warn(`[SettingsModel] Could not read setting "${key}", falling back to default:`, err);
            return defaultValue;
        }
    },
    /**
     * Lưu hoặc cập nhật cấu hình theo key
     */
    async setSetting(key, value, description) {
        const res = await db_1.pool.query(`INSERT INTO public.system_settings (key, value, description, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           description = COALESCE(EXCLUDED.description, public.system_settings.description),
           updated_at = NOW()
       RETURNING value`, [key, JSON.stringify(value), description || null]);
        return res.rows[0]?.value;
    },
    /**
     * Lấy cấu hình AI riêng biệt cho chức năng tư vấn / lịch trình
     */
    async getAIConfig() {
        const config = await this.getSetting("ai_itinerary_config", exports.DEFAULT_AI_CONFIG);
        return {
            model: config.model || exports.DEFAULT_AI_CONFIG.model,
            temperature: typeof config.temperature === "number" ? config.temperature : exports.DEFAULT_AI_CONFIG.temperature,
            maxTokens: typeof config.maxTokens === "number" ? config.maxTokens : exports.DEFAULT_AI_CONFIG.maxTokens,
            customInstruction: config.customInstruction || "",
            provider: config.provider || exports.DEFAULT_AI_CONFIG.provider,
            updatedAt: config.updatedAt,
        };
    },
    /**
     * Cập nhật cấu hình AI
     */
    async saveAIConfig(config) {
        const current = await this.getAIConfig();
        const rawModel = config.model !== undefined ? config.model : current.model;
        const cleanModel = normalizeModelName(rawModel) || current.model;
        const updated = {
            model: cleanModel,
            temperature: typeof config.temperature === "number"
                ? Math.max(0, Math.min(1.0, config.temperature))
                : current.temperature,
            maxTokens: typeof config.maxTokens === "number"
                ? Math.max(512, Math.min(16384, config.maxTokens))
                : current.maxTokens,
            customInstruction: config.customInstruction !== undefined
                ? config.customInstruction.trim()
                : current.customInstruction,
            provider: config.provider?.trim() || current.provider,
            updatedAt: new Date().toISOString(),
        };
        return this.setSetting("ai_itinerary_config", updated, "Cấu hình model và tham số sinh lịch trình thông minh của AI tư vấn du lịch");
    },
};
