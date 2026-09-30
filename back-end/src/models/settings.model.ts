import { pool } from "../config/db";

export interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  customInstruction: string;
  provider?: "google" | "opencode-zen" | string;
  geminiApiKey?: string;
  updatedAt?: string;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  model: "gemini-1.5-flash",
  temperature: 0.4,
  maxTokens: 4096,
  customInstruction: "",
  provider: "google",
  geminiApiKey: "",
};

/**
 * Chuẩn hóa tên model:
 * Tự động chuyển đổi các dạng như "Nemotron 3 Ultra Free" -> "nemotron-3-ultra-free",
 * loại bỏ khoảng trắng thừa, thay khoảng trắng và dấu gạch dưới thành dấu gạch ngang '-',
 * chuyển chữ thường, giữ nguyên dấu '/' nếu có provider prefix (ví dụ "anthropic/claude-sonnet-4-5").
 */
export function normalizeModelName(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

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

export const SettingsModel = {
  /**
   * Lấy cấu hình theo key
   */
  async getSetting<T = any>(key: string, defaultValue: T): Promise<T> {
    try {
      const res = await pool.query("SELECT value FROM public.system_settings WHERE key = $1", [key]);
      if (res.rows.length === 0 || !res.rows[0].value) {
        return defaultValue;
      }
      return res.rows[0].value as T;
    } catch (err) {
      console.warn(`[SettingsModel] Could not read setting "${key}", falling back to default:`, err);
      return defaultValue;
    }
  },

  /**
   * Lưu hoặc cập nhật cấu hình theo key
   */
  async setSetting<T = any>(key: string, value: T, description?: string): Promise<T> {
    const res = await pool.query(
      `INSERT INTO public.system_settings (key, value, description, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           description = COALESCE(EXCLUDED.description, public.system_settings.description),
           updated_at = NOW()
       RETURNING value`,
      [key, JSON.stringify(value), description || null]
    );
    return res.rows[0]?.value as T;
  },

  /**
   * Lấy cấu hình AI riêng biệt cho chức năng tư vấn / lịch trình
   */
  async getAIConfig(): Promise<AIConfig> {
    const config = await this.getSetting<AIConfig>("ai_itinerary_config", DEFAULT_AI_CONFIG);
    return {
      model: config.model || DEFAULT_AI_CONFIG.model,
      temperature: typeof config.temperature === "number" ? config.temperature : DEFAULT_AI_CONFIG.temperature,
      maxTokens: typeof config.maxTokens === "number" ? config.maxTokens : DEFAULT_AI_CONFIG.maxTokens,
      customInstruction: config.customInstruction || "",
      provider: config.provider || DEFAULT_AI_CONFIG.provider,
      geminiApiKey: config.geminiApiKey || process.env.GEMINI_API_KEY || "",
      updatedAt: config.updatedAt,
    };
  },

  /**
   * Cập nhật cấu hình AI
   */
  async saveAIConfig(config: Partial<AIConfig>): Promise<AIConfig> {
    const current = await this.getAIConfig();
    const rawModel = config.model !== undefined ? config.model : current.model;
    const cleanModel = normalizeModelName(rawModel) || current.model;

    const updated: AIConfig = {
      model: cleanModel,
      temperature:
        typeof config.temperature === "number"
          ? Math.max(0, Math.min(1.0, config.temperature))
          : current.temperature,
      maxTokens:
        typeof config.maxTokens === "number"
          ? Math.max(512, Math.min(16384, config.maxTokens))
          : current.maxTokens,
      customInstruction:
        config.customInstruction !== undefined
          ? config.customInstruction.trim()
          : current.customInstruction,
      provider: config.provider?.trim() || current.provider,
      geminiApiKey:
        config.geminiApiKey !== undefined
          ? config.geminiApiKey.trim()
          : current.geminiApiKey,
      updatedAt: new Date().toISOString(),
    };

    return this.setSetting<AIConfig>(
      "ai_itinerary_config",
      updated,
      "Cấu hình model và tham số sinh lịch trình thông minh của AI tư vấn du lịch"
    );
  },
};
