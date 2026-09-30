"use client";

import { useEffect, useState } from "react";
import { AdminAPI, type AdminAIConfig, type AdminAISettingsResponse } from "@/lib/api/admin";
import { toast } from "@/components/ui/Toast";

export default function AdminAISettingsPage() {
  const [data, setData] = useState<AdminAISettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    sample?: string;
    modelUsed?: string;
    error?: string;
  } | null>(null);

  // Form states
  const [provider, setProvider] = useState<string>("google");
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState<string>("");
  const [showGeminiKey, setShowGeminiKey] = useState<boolean>(false);
  const [model, setModel] = useState("gemini-1.5-flash");
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelInput, setCustomModelInput] = useState("");
  const [temperature, setTemperature] = useState(0.4);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [customInstruction, setCustomInstruction] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const res = await AdminAPI.getAISettings();
      setData(res);

      const cfg = res.config;
      setProvider(cfg.provider || "google");
      setGeminiApiKeyInput(cfg.geminiApiKey || "");

      const isPreset = res.supportedPresets.some((p) => p.id === cfg.model);
      if (isPreset) {
        setModel(cfg.model);
        setIsCustomModel(false);
        setCustomModelInput("");
      } else {
        setModel("custom");
        setIsCustomModel(true);
        setCustomModelInput(cfg.model);
      }

      setTemperature(cfg.temperature);
      setMaxTokens(cfg.maxTokens);
      setCustomInstruction(cfg.customInstruction || "");
      setHasChanges(false);
    } catch (err: any) {
      toast.error(err.message || "Không thể nạp cấu hình AI từ máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const normalizeModelName = (raw: string): string => {
    if (!raw) return "";
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (trimmed.includes("/")) {
      const parts = trimmed.split("/");
      const provider = parts[0].trim().toLowerCase();
      const modelPart = parts.slice(1).join("/").trim().toLowerCase()
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      return `${provider}/${modelPart}`;
    }
    return trimmed
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const getEffectiveModel = () => {
    if (isCustomModel) {
      return normalizeModelName(customModelInput);
    }
    return model;
  };

  const handleModelSelect = (val: string, modelProvider?: string) => {
    if (val === "custom") {
      setIsCustomModel(true);
      setModel("custom");
    } else {
      setIsCustomModel(false);
      setModel(val);
      if (modelProvider) {
        setProvider(modelProvider);
      }
    }
    setHasChanges(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const effectiveModel = getEffectiveModel();
    if (!effectiveModel) {
      toast.error("Vui lòng nhập hoặc chọn một Model AI hợp lệ.");
      return;
    }

    try {
      setIsSaving(true);
      const res = await AdminAPI.updateAISettings({
        model: effectiveModel,
        provider,
        geminiApiKey: geminiApiKeyInput,
        temperature,
        maxTokens,
        customInstruction,
      });

      toast.success(res.message || "Đã lưu cấu hình AI thành công!");
      setHasChanges(false);
      await loadSettings();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi lưu cấu hình AI.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const effectiveModel = getEffectiveModel();
    if (!effectiveModel) {
      toast.error("Vui lòng nhập hoặc chọn Model cần thử nghiệm.");
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await AdminAPI.testAISettings({
        model: effectiveModel,
        provider,
        geminiApiKey: geminiApiKeyInput,
        temperature,
      });

      setTestResult({
        success: true,
        latencyMs: res.latencyMs,
        sample: res.responseSample,
        modelUsed: res.modelUsed,
      });
      toast.success(`Model "${res.modelUsed}" phản hồi thành công (${res.latencyMs}ms)!`);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || "Không nhận được phản hồi từ model.",
      });
      toast.error(`Kiểm tra thất bại: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetDefaults = () => {
    if (!data?.defaultConfig) return;
    const def = data.defaultConfig;
    setProvider(def.provider || "google");
    setModel(def.model);
    setIsCustomModel(false);
    setCustomModelInput("");
    setTemperature(def.temperature);
    setMaxTokens(def.maxTokens);
    setCustomInstruction(def.customInstruction || "");
    setHasChanges(true);
    toast.info("Đã điền lại thông số mặc định. Nhấn 'Lưu thay đổi' để áp dụng.");
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="text-xs">Đang nạp cấu hình AI từ máy chủ...</p>
        </div>
      </div>
    );
  }

  const effectiveModel = getEffectiveModel();
  const presets = data?.supportedPresets || [];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-xl text-purple-400 border border-purple-500/30">
              🤖
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Cấu hình Model AI Tư Vấn
              </h1>
              <p className="text-xs text-slate-400">
                Tùy biến model trí tuệ nhân tạo, thiết lập Google Gemini API key và chỉ thị hệ thống chuyên biệt cho du lịch Huế
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            ↺ Mặc định
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50 cursor-pointer"
          >
            {isTesting ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                <span>Đang thử nghiệm...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Thử nghiệm Model</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-lg transition cursor-pointer ${
              hasChanges
                ? "bg-purple-600 hover:bg-purple-500 shadow-purple-600/30 animate-pulse"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            } disabled:opacity-50`}
          >
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {/* Provider & API Keys Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Google Gemini Card */}
        <div className={`rounded-2xl border p-4 backdrop-blur-xl transition ${
          provider === "google"
            ? "border-purple-500/60 bg-purple-950/20 shadow-md shadow-purple-900/10"
            : "border-slate-800/80 bg-slate-900/60"
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <span>💎</span> Google Gemini API
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                data?.apiKeyStatus?.gemini?.configured
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              }`}
            >
              {data?.apiKeyStatus?.gemini?.configured ? "Đã sẵn sàng" : "Chưa có Key"}
            </span>
          </div>
          <div className="mt-2 font-mono text-xs font-semibold text-slate-200 truncate">
            {data?.apiKeyStatus?.gemini?.maskedKey || "Chưa cấu hình"}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Khuyên dùng: Miễn phí, tốc độ cao và phản hồi tiếng Việt mượt mà.
          </p>
        </div>

        {/* Current Active Engine */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-xl">
          <div className="text-xs text-slate-400 font-medium">Model Đang Áp Dụng</div>
          <div className="mt-2 text-sm font-black text-purple-400 font-mono truncate">
            {data?.config.model}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Kênh: <strong className="text-slate-300 uppercase">{data?.config.provider || "google"}</strong> • Cập nhật: {data?.config.updatedAt ? new Date(data.config.updatedAt).toLocaleTimeString("vi-VN") : "Hệ thống"}
          </p>
        </div>

        {/* Inference Params */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-xl">
          <div className="text-xs text-slate-400 font-medium">Tham số vận hành</div>
          <div className="mt-2 text-sm font-bold text-slate-200">
            Temp: <span className="text-amber-400 font-mono">{temperature}</span> | Tokens: <span className="text-cyan-400 font-mono">{maxTokens}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Tối ưu cho lịch trình từ 1 đến 7 ngày tại Thừa Thiên Huế
          </p>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 md:p-8 backdrop-blur-xl space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <span>⚙️</span> Thiết lập Nguồn Cung Cấp & API Key
        </h2>

        {/* Provider Switcher */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Kênh dịch vụ (Provider)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              onClick={() => {
                setProvider("google");
                if (!model.includes("gemini")) {
                  setModel("gemini-1.5-flash");
                  setIsCustomModel(false);
                }
                setHasChanges(true);
              }}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition cursor-pointer select-none ${
                provider === "google"
                  ? "border-purple-500 bg-purple-500/15 shadow-md shadow-purple-900/20"
                  : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-2">
                  <span>✨</span> Google Gemini API (Khuyên dùng)
                </span>
                {provider === "google" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[11px] font-black text-white">
                    ✓
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Gọi trực tiếp Google AI Studio. Tốc độ cực nhanh, ổn định cao và có gói miễn phí chính thức.
              </p>
            </div>

            <div
              onClick={() => {
                setProvider("opencode-zen");
                setHasChanges(true);
              }}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition cursor-pointer select-none ${
                provider === "opencode-zen"
                  ? "border-purple-500 bg-purple-500/15 shadow-md shadow-purple-900/20"
                  : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-2">
                  <span>⚡</span> OpenCode Zen Gateway
                </span>
                {provider === "opencode-zen" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[11px] font-black text-white">
                    ✓
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Cổng ủy quyền đa model của OpenCode (yêu cầu key có credits hoặc token nội bộ).
              </p>
            </div>
          </div>
        </div>

        {/* Gemini API Key Input */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>🔑</span> Google Gemini API Key
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
            >
              Lấy API Key miễn phí tại Google AI Studio ↗
            </a>
          </div>
          <div className="relative">
            <input
              type={showGeminiKey ? "text" : "password"}
              value={geminiApiKeyInput}
              onChange={(e) => {
                setGeminiApiKeyInput(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Dán mã API Key dạng AIzaSy... vào đây (hoặc cấu hình qua GEMINI_API_KEY trong file .env)"
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 font-mono text-xs text-white placeholder:text-slate-600 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition pr-20"
            />
            <button
              type="button"
              onClick={() => setShowGeminiKey(!showGeminiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              {showGeminiKey ? "Ẩn" : "Hiện"}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Khóa API này được lưu trữ an toàn trong cơ sở dữ liệu và chỉ backend dùng để kết nối với Google.
          </p>
        </div>

        {/* Model Selection */}
        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Chọn Model AI (LLM Engine)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {presets.map((preset) => {
              const isSelected = !isCustomModel && model === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => handleModelSelect(preset.id, preset.provider)}
                  className={`flex flex-col justify-between rounded-2xl border p-3.5 transition cursor-pointer select-none ${
                    isSelected
                      ? "border-purple-500 bg-purple-500/15 shadow-md shadow-purple-900/20"
                      : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xs font-bold text-purple-300">
                      {preset.id}
                    </div>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[11px] font-black text-white">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-300 font-medium leading-snug">
                    {preset.name}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500 uppercase tracking-wider">
                    Provider: {preset.provider}
                  </div>
                </div>
              );
            })}

            {/* Custom Model Option */}
            <div
              onClick={() => handleModelSelect("custom")}
              className={`flex flex-col justify-between rounded-2xl border p-3.5 transition cursor-pointer select-none md:col-span-2 ${
                isCustomModel
                  ? "border-purple-500 bg-purple-500/15 shadow-md shadow-purple-900/20"
                  : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs font-bold text-slate-200 flex items-center gap-2">
                  <span>✍️</span> Nhập tên Model Tùy Chỉnh (Custom Identifier)
                </div>
                {isCustomModel && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[11px] font-black text-white">
                    ✓
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Nhập bất kỳ mã model nào (Ví dụ: `gemini-2.0-flash`, `gemini-1.5-flash-8b`, `deepseek-chat`...)
              </p>

              {isCustomModel && (
                <div className="mt-3 space-y-1.5">
                  <input
                    type="text"
                    value={customModelInput}
                    onChange={(e) => {
                      setCustomModelInput(e.target.value);
                      setHasChanges(true);
                    }}
                    onBlur={() => {
                      const normalized = normalizeModelName(customModelInput);
                      if (normalized && normalized !== customModelInput) {
                        setCustomModelInput(normalized);
                      }
                    }}
                    placeholder="VD: Gemini 2.0 Flash hoặc nemotron-3-ultra-free"
                    className="w-full rounded-xl border border-purple-500/50 bg-slate-950 px-3.5 py-2 font-mono text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {customModelInput.trim() && normalizeModelName(customModelInput) !== customModelInput && (
                    <div className="flex items-center gap-1.5 text-[11px] text-purple-300 font-mono">
                      <span>↳ Tự động chuẩn hóa thành:</span>
                      <span className="font-bold text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60">
                        {normalizeModelName(customModelInput)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Parameters Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/80">
          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-300 uppercase tracking-wider">
                Nhiệt độ (Temperature): <span className="text-amber-400 font-mono text-sm">{temperature}</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {temperature <= 0.2
                  ? "Chính xác, kỷ luật cao"
                  : temperature <= 0.6
                  ? "Cân bằng lý tưởng"
                  : "Sáng tạo, đa dạng"}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => {
                setTemperature(parseFloat(e.target.value));
                setHasChanges(true);
              }}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0.0 (Tập trung catalog)</span>
              <span>0.5</span>
              <span>1.0 (Phóng khoáng)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-300 uppercase tracking-wider">
                Giới hạn Tokens: <span className="text-cyan-400 font-mono text-sm">{maxTokens}</span>
              </label>
              <span className="text-[11px] text-slate-400">
                ~ {Math.round(maxTokens * 0.75)} từ
              </span>
            </div>
            <input
              type="range"
              min="1024"
              max="8192"
              step="512"
              value={maxTokens}
              onChange={(e) => {
                setMaxTokens(parseInt(e.target.value, 10));
                setHasChanges(true);
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>1024 (Ngắn)</span>
              <span>4096 (Chuẩn)</span>
              <span>8192 (Chi tiết)</span>
            </div>
          </div>
        </div>

        {/* Custom System Instruction */}
        <div className="space-y-2 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Chỉ thị bổ sung từ Quản Trị Viên (Custom Instruction)
            </label>
            <span className="text-[11px] text-slate-500">Tùy chọn</span>
          </div>
          <p className="text-xs text-slate-400">
            Nội dung này sẽ được tự động lồng ghép vào System Prompt của AI mỗi khi người dùng tạo lịch trình.
          </p>
          <textarea
            rows={4}
            value={customInstruction}
            onChange={(e) => {
              setCustomInstruction(e.target.value);
              setHasChanges(true);
            }}
            placeholder="VD: Ưu tiên khuyến khích du khách trải nghiệm ca Huế trên sông Hương vào buổi tối, giới thiệu ẩm thực bánh bèo/nậm/lọc vào buổi xế chiều..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 text-xs font-normal text-slate-100 placeholder:text-slate-600 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition resize-none"
          />
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            Model đang chuẩn bị áp dụng:{" "}
            <strong className="text-purple-400 font-mono">{effectiveModel || "Chưa chọn"}</strong>
            <span className="ml-2 text-[11px] text-slate-500">({provider})</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadSettings}
              disabled={!hasChanges}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white transition disabled:opacity-30 cursor-pointer"
            >
              Hủy thay đổi
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? "Đang lưu cấu hình..." : "Lưu Cấu Hình AI"}
            </button>
          </div>
        </div>
      </div>

      {/* Test Result Section */}
      {testResult && (
        <div
          className={`rounded-2xl border p-5 backdrop-blur-xl transition ${
            testResult.success
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
              : "border-red-500/30 bg-red-500/5 text-red-300"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
            <div className="flex items-center gap-2 font-bold text-xs">
              <span>{testResult.success ? "✅" : "❌"}</span>
              <span>
                {testResult.success
                  ? `Thử nghiệm thành công model: ${testResult.modelUsed}`
                  : "Thử nghiệm thất bại"}
              </span>
            </div>
            {testResult.latencyMs !== undefined && (
              <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold">
                {testResult.latencyMs}ms
              </span>
            )}
          </div>

          {testResult.success && testResult.sample && (
            <div className="space-y-1 text-xs">
              <span className="text-slate-400 font-medium">Nội dung AI phản hồi:</span>
              <pre className="rounded-xl bg-slate-950/80 p-3 font-mono text-xs text-slate-200 overflow-x-auto border border-white/5">
                {testResult.sample}
              </pre>
            </div>
          )}

          {!testResult.success && (
            <div className="text-xs font-medium text-red-400">
              Chi tiết lỗi: {testResult.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
