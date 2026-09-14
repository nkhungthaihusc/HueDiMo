"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import type {
  VrainApiResponse,
  VrainStation,
  ExtendedWeatherData,
  JoinedVWaterStation,
  VWaterApiResponse,
} from "@/lib/types/weather";
import { fetchRainfallData } from "@/lib/api/weather";
import { fetchWaterLevelsData } from "@/lib/api/water-levels";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";

interface WeatherDetailModalProps {

  isOpen: boolean;
  onClose: () => void;
  openMeteoData?: ExtendedWeatherData | null;
  currentTime?: Date | null;
  onSelectStationLocation?: (coord: { lat: number; lng: number; name: string }) => void;
}

type TabType = "vrain" | "vwater" | "forecast";
type RainFilter = "all" | "veryHeavy" | "heavy" | "medium" | "light" | "none";
type WaterFilter = "all" | "river" | "flood" | "flooding";

function weatherInfo(code: number, isDay: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: isDay ? "☀️" : "🌙", label: "Trời quang đãng" };
  if (code <= 2) return { emoji: "🌤️", label: "Ít mây, trời đẹp" };
  if (code === 3) return { emoji: "☁️", label: "Nhiều mây" };
  if (code <= 48) return { emoji: "🌫️", label: "Sương mù Cố Đô" };
  if (code <= 57) return { emoji: "🌦️", label: "Mưa phùn nhẹ" };
  if (code <= 67) return { emoji: "🌧️", label: "Mưa rào" };
  if (code <= 77) return { emoji: "🌨️", label: "Tuyết" };
  if (code <= 82) return { emoji: "🌧️", label: "Mưa rào nặng hạt" };
  if (code <= 86) return { emoji: "🌨️", label: "Tuyết rơi" };
  return { emoji: "⛈️", label: "Dông sét" };
}

function formatRain(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return "0";
  const num = Math.round(val * 10) / 10;
  return Number.isInteger(num) ? num.toString() : num.toFixed(1);
}

function formatHour(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

function formatStationName(name: string): string {
  if (!name) return "";
  return name
    .replace(/([^\s])\(/g, "$1 (")
    .replace(/\)\s*([^\s])/g, ") $1")
    .trim();
}

export default function WeatherDetailModal({
  isOpen,
  onClose,
  openMeteoData,
  currentTime,
  onSelectStationLocation,
}: WeatherDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("vrain");
  const [vrainData, setVrainData] = useState<VrainApiResponse | null>(null);
  const [vwaterData, setVwaterData] = useState<VWaterApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<RainFilter>("all");
  const [waterSearch, setWaterSearch] = useState<string>("");
  const [waterFilter, setWaterFilter] = useState<WaterFilter>("all");
  const [copiedStationId, setCopiedStationId] = useState<string | null>(null);
  const [internalMeteoData, setInternalMeteoData] = useState<ExtendedWeatherData | null>(null);

  const {
    containerRef: hourlyScrollRef,
    canScrollLeft: canHourlyScrollLeft,
    canScrollRight: canHourlyScrollRight,
    scrollPrev: scrollHourlyPrev,
    scrollNext: scrollHourlyNext,
    dragProps: hourlyDragProps,
  } = useHorizontalScroll<HTMLDivElement>();

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [isClosing, onClose]);

  const fetchOpenMeteo = useCallback(async () => {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=16.4637&longitude=107.5907` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,uv_index` +
        `&hourly=temperature_2m,weather_code,precipitation_probability&forecast_hours=24&timezone=Asia%2FHo_Chi_Minh`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as ExtendedWeatherData;
        setInternalMeteoData(data);
      }
    } catch (err) {
      console.error("Failed to load Open-Meteo in modal:", err);
    }
  }, []);

  const fetchVrainRainfall = useCallback(async () => {
    try {
      const json = await fetchRainfallData();
      setVrainData(json);
    } catch (err) {
      console.error("Failed to load Vrain data:", err);
    }
  }, []);

  const fetchVWaterStations = useCallback(async () => {
    try {
      const json = await fetchWaterLevelsData();
      setVwaterData(json);
    } catch (err) {
      console.error("Failed to load water levels data:", err);
    }
  }, []);


  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.allSettled([fetchVrainRainfall(), fetchVWaterStations(), fetchOpenMeteo()]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchVrainRainfall, fetchVWaterStations, fetchOpenMeteo]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        void Promise.allSettled([fetchVrainRainfall(), fetchVWaterStations(), fetchOpenMeteo()]).finally(() => {
          setIsLoading(false);
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fetchVrainRainfall, fetchVWaterStations, fetchOpenMeteo]);

  // Đóng modal khi nhấn Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isClosing) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isClosing, handleClose]);

  // Lọc và tìm kiếm danh sách trạm quan trắc Vrain
  const filteredStations = useMemo(() => {
    if (!vrainData?.stations) return [];
    let list = vrainData.stations;

    // Lọc theo cấp độ mưa
    if (filterLevel !== "all") {
      list = list.filter((s) => {
        const depth = s.sumDepth ?? 0;
        if (filterLevel === "veryHeavy") return depth >= 100 || s.level === "Mưa rất to";
        if (filterLevel === "heavy") return (depth >= 50 && depth < 100) || s.level === "Mưa to";
        if (filterLevel === "medium") return (depth >= 25 && depth < 50) || s.level === "Mưa vừa";
        if (filterLevel === "light") return (depth > 0 && depth < 25) || s.level === "Mưa nhỏ";
        if (filterLevel === "none") return depth === 0 || s.level === "Không mưa";
        return true;
      });
    }

    // Tìm kiếm theo tên hoặc địa chỉ/khu vực
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.station.name.toLowerCase().includes(q) ||
          s.station.address.toLowerCase().includes(q) ||
          (s.station.area?.name && s.station.area.name.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [vrainData, filterLevel, searchQuery]);

  // Lọc và tìm kiếm danh sách trạm quan trắc Mực nước & Ngập lụt (VFASS)
  const filteredWaterStations = useMemo(() => {
    if (!vwaterData?.stations) return [];
    let list = vwaterData.stations;

    if (waterFilter === "river") {
      list = list.filter((s) => s.waterStationType === "water_level");
    } else if (waterFilter === "flood") {
      list = list.filter((s) => s.waterStationType === "flood_3m" || s.waterStationType === "flood_1m5");
    } else if (waterFilter === "flooding") {
      list = list.filter((s) => s.isFlooding);
    }

    if (waterSearch.trim()) {
      const q = waterSearch.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          (s.location && s.location.toLowerCase().includes(q)) ||
          (s.area && s.area.toLowerCase().includes(q)) ||
          (s.cityName && s.cityName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [vwaterData, waterFilter, waterSearch]);

  const handleCopyCoord = (coord: { lat: number; lng: number; uuid: string }) => {
    const coordText = `${coord.lat}, ${coord.lng}`;
    navigator.clipboard.writeText(coordText);
    setCopiedStationId(coord.uuid);
    setTimeout(() => setCopiedStationId(null), 2000);
  };

  if (!isOpen && !isClosing) return null;

  const meteo = internalMeteoData || openMeteoData;
  const cur = meteo?.current;
  const summary = vrainData?.summary;
  const maxDepth = Math.max(...(vrainData?.stations.map((s) => s.sumDepth ?? 0) || [100]), 100);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center pt-24 sm:pt-28 pb-6 px-4 sm:px-6 md:px-8 bg-ink-900/50 backdrop-blur-md transition-all duration-200 ease-out ${
        isClosing ? "opacity-0 pointer-events-none" : "opacity-100 animate-in fade-in"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="weather-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`glass-strong relative flex flex-col w-full max-w-4xl lg:max-w-5xl max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-8.5rem)] rounded-3xl border border-white/80 shadow-2xl overflow-hidden transition-all duration-300 ease-out ${
          isClosing
            ? "opacity-0 scale-95 translate-y-3 pointer-events-none"
            : "opacity-100 scale-100 translate-y-0 animate-in zoom-in-95"
        }`}
      >
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/60 bg-white/60 px-5 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-500/20">
              <span className="text-xl">
                {activeTab === "vrain" ? "🌧️" : activeTab === "vwater" ? "🌊" : "☀️"}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="weather-modal-title" className="text-base font-bold text-ink-900 sm:text-lg">
                  {activeTab === "vwater"
                    ? "Mực nước sông & Cảnh báo ngập lụt Huế"
                    : activeTab === "forecast"
                    ? "Dự báo thời tiết & Khám phá Cố Đô"
                    : "Thời tiết & Mạng lưới mưa Thừa Thiên Huế"}
                </h2>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs text-ink-500">
                {currentTime
                  ? currentTime.toLocaleDateString("vi-VN", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }) +
                  " · " +
                  currentTime.toLocaleTimeString("vi-VN")
                  : "Dữ liệu quan trắc thời gian thực"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshAll}
              disabled={isLoading}
              title="Làm mới dữ liệu"
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/80 text-ink-700 hover:bg-white hover:text-brand-700 transition active:scale-95 disabled:opacity-50 border border-ink-100/80 shadow-2xs cursor-pointer text-xs font-semibold"
              aria-label="Làm mới"
            >
              <svg
                className={`h-4 w-4 ${isLoading ? "animate-spin text-brand-600" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/80 text-ink-700 hover:bg-white hover:text-brand-700 transition active:scale-95 border border-ink-100/80 shadow-2xs cursor-pointer text-xs font-semibold"
              aria-label="Quay lại"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Quay lại</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Sleek Segmented Pill style) */}
        <div className="mx-4 sm:mx-6 my-2.5 flex rounded-2xl bg-brand-100/60 p-1 backdrop-blur-sm border border-brand-200/40">
          <button
            type="button"
            onClick={() => setActiveTab("vrain")}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === "vrain"
                ? "bg-white text-brand-700 font-bold shadow-sm ring-1 ring-black/5"
                : "text-ink-600 hover:text-ink-900 hover:bg-white/40"
            }`}
          >
            <span>🌧️ Mưa Vrain</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold ${
                activeTab === "vrain" ? "bg-brand-600 text-white" : "bg-black/5 text-ink-600"
              }`}
            >
              {vrainData?.stations.length ?? 52}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vwater")}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === "vwater"
                ? "bg-white text-brand-700 font-bold shadow-sm ring-1 ring-black/5"
                : "text-ink-600 hover:text-ink-900 hover:bg-white/40"
            }`}
          >
            <span>🌊 Mực nước & Ngập</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold ${
                activeTab === "vwater" ? "bg-sky-600 text-white" : "bg-black/5 text-ink-600"
              }`}
            >
              {vwaterData?.stations.length ?? 17}
            </span>
            {(vwaterData?.summary?.floodingPoints ?? 0) > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("forecast")}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === "forecast"
                ? "bg-white text-brand-700 font-bold shadow-sm ring-1 ring-black/5"
                : "text-ink-600 hover:text-ink-900 hover:bg-white/40"
            }`}
          >
            <span>☀️ Dự báo Du lịch</span>
            {cur && (
              <span className="hidden sm:inline-block rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-amber-800">
                {Math.round(cur.temperature_2m)}°C
              </span>
            )}
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 sm:p-7 space-y-3">
          {activeTab === "vrain" && (
            <div key="tab-vrain" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
              {/* Thống kê nhanh Vrain */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
                  {/* Card 1: Trạm mưa lớn nhất */}
                  <div className="rounded-2xl bg-gradient-to-br from-red-500/10 to-amber-500/10 border border-red-200/60 p-3.5 sm:p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-medium text-ink-600 flex items-center gap-1">
                      <span>🔴</span> Mưa lớn nhất
                    </span>
                    <div className="my-1.5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl sm:text-2xl font-black text-red-600">
                          {formatRain(summary.maxRainStation?.sumDepth)}
                        </span>
                        <span className="text-xs font-semibold text-red-500">mm</span>
                      </div>
                      <div className="text-xs font-bold text-ink-900 truncate mt-0.5" title={summary.maxRainStation?.name}>
                        {summary.maxRainStation?.name || "Không có"}
                      </div>
                      <div className="text-[10px] text-ink-500 truncate">{summary.maxRainStation?.address}</div>
                    </div>
                    <span className="inline-block rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 w-fit">
                      {summary.maxRainStation?.level || "Mưa rất to"}
                    </span>
                  </div>

                  {/* Card 2: Trạm đang mưa */}
                  <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/60 p-3.5 sm:p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-medium text-ink-600 flex items-center gap-1">
                      <span>🌧️</span> Trạm có mưa
                    </span>
                    <div className="my-1.5">
                      <div className="text-xl sm:text-2xl font-black text-blue-600">
                        {summary.rainingStations}
                        <span className="text-sm font-normal text-ink-500"> / {summary.totalStations}</span>
                      </div>
                      <div className="text-xs font-medium text-ink-700 mt-0.5">
                        {summary.totalStations > 0
                          ? Math.round((summary.rainingStations / summary.totalStations) * 100)
                          : 0}
                        % số trạm ghi nhận mưa
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-blue-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${(summary.rainingStations / (summary.totalStations || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Card 3: Lượng mưa trung bình */}
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/60 p-3.5 sm:p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-medium text-ink-600 flex items-center gap-1">
                      <span>📊</span> Mưa trung bình
                    </span>
                    <div className="my-1.5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl sm:text-2xl font-black text-emerald-700">
                          {formatRain(summary.avgRainDepth)}
                        </span>
                        <span className="text-xs font-semibold text-emerald-600">mm</span>
                      </div>
                      <div className="text-xs font-medium text-ink-600 mt-0.5">Toàn tỉnh Thừa Thiên Huế</div>
                    </div>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded-md w-fit font-medium">
                      52 trạm tự động
                    </span>
                  </div>

                  {/* Card 4: Đánh giá nguy cơ ngập */}
                  <div
                    className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col justify-between ${summary.floodRiskLevel === "severe"
                      ? "bg-rose-50 border-rose-300 text-rose-900"
                      : summary.floodRiskLevel === "high"
                        ? "bg-amber-50 border-amber-300 text-amber-900"
                        : summary.floodRiskLevel === "medium"
                          ? "bg-yellow-50 border-yellow-300 text-yellow-900"
                          : "bg-emerald-50 border-emerald-300 text-emerald-900"
                      }`}
                  >
                    <span className="text-[11px] font-medium flex items-center gap-1">
                      <span>⚠️</span> Nguy cơ ngập úng
                    </span>
                    <div className="my-1">
                      <div className="text-sm font-bold leading-tight line-clamp-2">
                        {summary.floodRiskLevel === "severe"
                          ? "Báo động lũ lụt"
                          : summary.floodRiskLevel === "high"
                            ? "Cảnh báo ngập úng"
                            : summary.floodRiskLevel === "medium"
                              ? "Lưu ý đường trơn"
                              : "An toàn - Tạnh ráo"}
                      </div>
                      <div className="text-[10px] opacity-80 mt-1 line-clamp-2">{summary.floodRiskLabel}</div>
                    </div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
                      Cập nhật tự động
                    </span>
                  </div>
                </div>
              )}

              {/* Tìm kiếm và Bộ lọc cấp độ mưa */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-ink-400">
                      🔍
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm trạm đo mưa (Bạch Mã, Phú Lộc, Phong Điền, Hương Thủy, A Lưới...)"
                      className="w-full rounded-xl border border-white/80 bg-white/70 pl-9 pr-8 py-2 text-xs sm:text-sm text-ink-900 placeholder:text-ink-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-400 hover:text-ink-700"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <span className="text-xs text-ink-500 text-right sm:text-left self-center font-medium">
                    Hiển thị <strong className="text-brand-700">{filteredStations.length}</strong> /{" "}
                    {vrainData?.stations.length ?? 52} trạm
                  </span>
                </div>

                {/* Filter chips */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterLevel("all")}
                    className={`rounded-xl px-2.5 py-1 font-medium transition ${filterLevel === "all"
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-white/70 text-ink-700 hover:bg-white"
                      }`}
                  >
                    Tất cả ({vrainData?.stations.length ?? 52})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel("veryHeavy")}
                    className={`rounded-xl px-2.5 py-1 font-medium transition flex items-center gap-1 ${filterLevel === "veryHeavy"
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-red-50 text-red-700 hover:bg-red-100"
                      }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-red-500 inline-block"></span>
                    Mưa rất to ({summary?.levelCounts.veryHeavy ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel("heavy")}
                    className={`rounded-xl px-2.5 py-1 font-medium transition flex items-center gap-1 ${filterLevel === "heavy"
                      ? "bg-orange-600 text-white shadow-sm"
                      : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                      }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-orange-500 inline-block"></span>
                    Mưa to ({summary?.levelCounts.heavy ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel("medium")}
                    className={`rounded-xl px-2.5 py-1 font-medium transition flex items-center gap-1 ${filterLevel === "medium"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
                    Mưa vừa ({summary?.levelCounts.medium ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel("light")}
                    className={`rounded-xl px-2.5 py-1 font-medium transition flex items-center gap-1 ${filterLevel === "light"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                      }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-sky-500 inline-block"></span>
                    Mưa nhỏ ({summary?.levelCounts.light ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel("none")}
                    className={`rounded-xl px-2.5 py-1 font-medium transition flex items-center gap-1 ${filterLevel === "none"
                      ? "bg-gray-700 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-gray-400 inline-block"></span>
                    Không mưa ({summary?.levelCounts.none ?? 0})
                  </button>
                </div>
              </div>

              {/* Danh sách các trạm quan trắc Vrain */}
              <div className="space-y-3 max-h-[390px] overflow-y-auto no-scrollbar pr-1">
                {filteredStations.length === 0 ? (
                  <div className="text-center py-10 rounded-2xl bg-white/40 border border-dashed border-ink-200">
                    <span className="text-3xl">🔍</span>
                    <p className="mt-2 text-sm font-medium text-ink-700">Không tìm thấy trạm đo mưa phù hợp</p>
                    <p className="text-xs text-ink-500">Thử thay đổi từ khoá tìm kiếm hoặc chọn bộ lọc cấp độ khác</p>
                  </div>
                ) : (
                  filteredStations.map((item) => {
                    const depth = item.sumDepth ?? 0;
                    const percent = Math.min(100, Math.round((depth / maxDepth) * 100));

                    return (
                      <div
                        key={item.station.uuid}
                        className="group relative rounded-2xl border border-white/75 bg-white/70 p-3.5 sm:p-4 hover:bg-white/95 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-4 sm:gap-6">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <h3 className="text-sm font-bold text-ink-900 group-hover:text-brand-700 transition-colors">
                                {item.station.name}
                              </h3>
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                                style={{
                                  backgroundColor: `${item.color}20`,
                                  color: item.color === "#535353" ? "#333333" : item.color,
                                }}
                              >
                                {item.level}
                              </span>
                              {item.station.area?.name && (
                                <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                                  {item.station.area.name}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-ink-500 mt-1 line-clamp-1">{item.station.address}</p>
                          </div>

                          {/* Số đo mm */}
                          <div className="text-right shrink-0">
                            <div className="flex items-baseline justify-end gap-1">
                              <span className="text-lg sm:text-xl font-black" style={{ color: item.color }}>
                                {formatRain(depth)}
                              </span>
                              <span className="text-xs font-semibold text-ink-500">mm</span>
                            </div>
                          </div>
                        </div>

                        {/* Thanh lượng mưa trực quan */}
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-ink-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(percent, depth > 0 ? 3 : 0)}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-ink-500 w-8 text-right">{percent}%</span>
                        </div>

                        {/* Thao tác toạ độ & Bản đồ */}
                        <div className="mt-2 flex items-center justify-between text-[11px] text-ink-500 pt-1.5 border-t border-ink-100/60">
                          <span className="font-mono text-[10px] text-ink-400">
                            📍 {item.station.lat.toFixed(4)}, {item.station.lng.toFixed(4)}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyCoord({
                                  lat: item.station.lat,
                                  lng: item.station.lng,
                                  uuid: item.station.uuid,
                                })
                              }
                              className="text-brand-700 hover:text-brand-900 font-medium transition cursor-pointer"
                            >
                              {copiedStationId === item.station.uuid ? "✓ Đã sao chép" : "Sao chép toạ độ"}
                            </button>

                            {onSelectStationLocation && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectStationLocation({
                                    lat: item.station.lat,
                                    lng: item.station.lng,
                                    name: item.station.name,
                                  });
                                  handleClose();
                                }}
                                className="rounded-lg bg-brand-50 px-2 py-0.5 text-brand-700 font-semibold hover:bg-brand-100 transition cursor-pointer"
                              >
                                Xem trên bản đồ ↗
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Quan trắc Mực nước & Cảnh báo ngập lụt (VFASS Smart City) */}
          {activeTab === "vwater" && (
            <div key="tab-vwater" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
              {/* Thống kê nhanh 4 thẻ */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Card 1: Sông Hương (Trạm Dã Viên) */}
                <div className="rounded-2xl bg-gradient-to-br from-sky-500/10 via-white/80 to-blue-500/10 border border-sky-200/70 p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:shadow-sm transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-sky-800 flex items-center gap-1.5">
                      <span>🌊</span> Sông Hương
                    </span>
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-bold text-sky-700">
                      Bình thường
                    </span>
                  </div>
                  <div className="my-2.5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black text-sky-700 tracking-tight">
                        {vwaterData?.summary?.perfumeriverDepth !== null && vwaterData?.summary?.perfumeriverDepth !== undefined
                          ? vwaterData.summary.perfumeriverDepth.toFixed(2)
                          : "0.55"}
                      </span>
                      <span className="text-xs font-bold text-sky-600">m</span>
                    </div>
                    <div className="text-xs font-bold text-ink-900 mt-1 leading-snug">
                      Trạm Cầu Dã Viên
                    </div>
                    <div className="text-[11px] text-ink-500">P. Phường Đúc, TP Huế</div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-medium text-sky-800 bg-sky-50/80 rounded-lg px-2 py-1">
                    <span>Biến thiên:</span>
                    <span className="font-bold">
                      {vwaterData?.summary?.perfumeriverDelta !== null && vwaterData?.summary?.perfumeriverDelta !== undefined
                        ? (vwaterData.summary.perfumeriverDelta > 0 ? "+" : "") +
                          vwaterData.summary.perfumeriverDelta.toFixed(2) +
                          "m"
                        : "0.00m"}
                    </span>
                  </div>
                </div>

                {/* Card 2: Mực nước cao nhất */}
                <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 via-white/80 to-purple-500/10 border border-indigo-200/70 p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:shadow-sm transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-800 flex items-center gap-1.5">
                      <span>📈</span> Cao nhất tỉnh
                    </span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-700">
                      Đo thực tế
                    </span>
                  </div>
                  <div className="my-2.5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black text-indigo-700 tracking-tight">
                        {vwaterData?.summary?.maxStation?.currDepth !== null && vwaterData?.summary?.maxStation?.currDepth !== undefined
                          ? vwaterData.summary.maxStation.currDepth.toFixed(2)
                          : "0.93"}
                      </span>
                      <span className="text-xs font-bold text-indigo-600">m</span>
                    </div>
                    <div className="text-xs font-bold text-ink-900 mt-1 leading-snug">
                      {formatStationName(vwaterData?.summary?.maxStation?.name || "Trạm Tứ Phú (Sông Bồ)")}
                    </div>
                    <div className="text-[11px] text-ink-500">
                      {vwaterData?.summary?.maxStation?.area || "Huyện Hương Trà"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-medium text-indigo-800 bg-indigo-50/80 rounded-lg px-2 py-1">
                    <span>Biến thiên:</span>
                    <span className="font-bold">
                      {vwaterData?.summary?.maxStation?.deltaDepth !== null && vwaterData?.summary?.maxStation?.deltaDepth !== undefined
                        ? (vwaterData.summary.maxStation.deltaDepth > 0 ? "+" : "") +
                          vwaterData.summary.maxStation.deltaDepth.toFixed(2) +
                          "m"
                        : "0.00m"}
                    </span>
                  </div>
                </div>

                {/* Card 3: Điểm ngập đô thị */}
                <div
                  className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:shadow-sm transition ${
                    (vwaterData?.summary?.floodingPoints ?? 0) > 0
                      ? "bg-gradient-to-br from-red-500/10 via-white/80 to-amber-500/10 border-red-200/70"
                      : "bg-gradient-to-br from-emerald-500/10 via-white/80 to-teal-500/10 border-emerald-200/70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold flex items-center gap-1.5 ${
                        (vwaterData?.summary?.floodingPoints ?? 0) > 0 ? "text-red-800" : "text-emerald-800"
                      }`}
                    >
                      <span>🏙️</span> Ngập đô thị
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        (vwaterData?.summary?.floodingPoints ?? 0) > 0
                          ? "bg-red-100 text-red-700 animate-pulse border border-red-200"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {(vwaterData?.summary?.floodingPoints ?? 0) > 0 ? "Cảnh báo" : "An toàn"}
                    </span>
                  </div>
                  <div className="my-2.5">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`text-2xl sm:text-3xl font-black tracking-tight ${
                          (vwaterData?.summary?.floodingPoints ?? 0) > 0 ? "text-red-600" : "text-emerald-700"
                        }`}
                      >
                        {vwaterData?.summary?.floodingPoints ?? 0}
                      </span>
                      <span className="text-xs font-semibold text-ink-500">
                        / {vwaterData?.summary?.floodCount ?? 10} cột đo
                      </span>
                    </div>
                    <div className="text-xs font-bold text-ink-900 mt-1 leading-snug">
                      {(vwaterData?.summary?.floodingPoints ?? 0) > 0 ? "Có điểm ngập nước" : "Đường sá khô ráo"}
                    </div>
                    <div className="text-[11px] text-ink-500">
                      {(vwaterData?.summary?.floodingPoints ?? 0) > 0 ? "Quảng Điền & vùng thấp trũng" : "Lưu thông an toàn"}
                    </div>
                  </div>
                  <div
                    className={`flex items-center justify-between text-[10px] font-medium rounded-lg px-2 py-1 ${
                      (vwaterData?.summary?.floodingPoints ?? 0) > 0
                        ? "text-red-800 bg-red-50/80"
                        : "text-emerald-800 bg-emerald-50/80"
                    }`}
                  >
                    <span>Tình trạng:</span>
                    <span className="font-bold">
                      {(vwaterData?.summary?.floodingPoints ?? 0) > 0 ? "⚠️ Có ngập nhẹ" : "✓ Thông suốt"}
                    </span>
                  </div>
                </div>

                {/* Card 4: Tổng số trạm VFASS */}
                <div className="rounded-2xl bg-gradient-to-br from-brand-500/10 via-white/80 to-teal-500/10 border border-brand-200/70 p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:shadow-sm transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-900 flex items-center gap-1.5">
                      <span>🛰️</span> VFASS Smart City
                    </span>
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[9px] font-bold text-brand-700">
                      Trực tiếp
                    </span>
                  </div>
                  <div className="my-2.5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black text-brand-700 tracking-tight">
                        {vwaterData?.count ?? 17}
                      </span>
                      <span className="text-xs font-bold text-brand-600">trạm</span>
                    </div>
                    <div className="text-xs font-bold text-ink-900 mt-1 leading-snug">Mạng lưới IoT Đô thị</div>
                    <div className="text-[11px] text-ink-500">Toàn tỉnh Thừa Thiên Huế</div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-medium text-brand-800 bg-brand-50/80 rounded-lg px-2 py-1">
                    <span>Phân loại:</span>
                    <span className="font-bold">
                      {vwaterData?.summary?.riverCount ?? 7} sông · {vwaterData?.summary?.floodCount ?? 10} ngập
                    </span>
                  </div>
                </div>
              </div>

              {/* Thanh Tìm kiếm & Bộ lọc trạm mực nước */}
              <div className="rounded-2xl bg-white/75 p-3.5 sm:p-4 border border-white/90 shadow-sm space-y-3 backdrop-blur-sm">
                <div className="relative">
                  <input
                    type="text"
                    value={waterSearch}
                    onChange={(e) => setWaterSearch(e.target.value)}
                    placeholder="Tìm trạm sông Hương, sông Bồ, An Cựu, Hương Sơ, Thuận An..."
                    className="w-full rounded-2xl border border-ink-200/70 bg-white/95 pl-10 pr-8 py-2.5 text-xs sm:text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15 transition shadow-2xs"
                  />
                  <svg
                    className="absolute left-3.5 top-3 h-4 w-4 text-ink-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {waterSearch && (
                    <button
                      type="button"
                      onClick={() => setWaterSearch("")}
                      className="absolute right-3 top-3 text-ink-400 hover:text-ink-700 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="text-[11px] font-semibold text-ink-500 mr-0.5">Bộ lọc:</span>

                  <button
                    type="button"
                    onClick={() => setWaterFilter("all")}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      waterFilter === "all"
                        ? "bg-brand-600 text-white shadow-sm"
                        : "bg-white/80 text-ink-600 hover:bg-white border border-ink-100"
                    }`}
                  >
                    Tất cả ({vwaterData?.stations.length ?? 17})
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaterFilter("river")}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      waterFilter === "river"
                        ? "bg-sky-600 text-white shadow-sm"
                        : "bg-white/80 text-sky-800 hover:bg-white border border-sky-200/80"
                    }`}
                  >
                    🌊 Mực nước sông ({vwaterData?.summary?.riverCount ?? 7})
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaterFilter("flood")}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      waterFilter === "flood"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white/80 text-indigo-800 hover:bg-white border border-indigo-200/80"
                    }`}
                  >
                    🏙️ Điểm đo ngập đô thị ({vwaterData?.summary?.floodCount ?? 10})
                  </button>

                  {(vwaterData?.summary?.floodingPoints ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setWaterFilter("flooding")}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        waterFilter === "flooding"
                          ? "bg-red-600 text-white shadow-sm"
                          : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                      }`}
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      <span>Đang ngập ({vwaterData?.summary?.floodingPoints})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Danh sách trạm quan trắc mực nước & cảnh báo ngập */}
              <div className="flex items-center justify-between text-xs text-ink-600 px-1">
                <span className="font-bold text-ink-800">
                  Danh sách trạm quan trắc mực nước ({filteredWaterStations.length})
                </span>
                <span className="text-[11px] text-ink-500 font-medium">Nguồn: hue.vfass.vn (IoT thông minh)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredWaterStations.length === 0 ? (
                  <div className="col-span-full rounded-2xl bg-white/60 p-8 text-center text-ink-500 border border-dashed border-ink-200">
                    <p className="text-2xl mb-1">🔍</p>
                    <p className="text-sm font-semibold">Không tìm thấy trạm quan trắc phù hợp</p>
                    <p className="text-xs text-ink-400 mt-1">Thử thay đổi từ khóa hoặc bộ lọc ở trên</p>
                  </div>
                ) : (
                  filteredWaterStations.map((item) => {
                    const isRiver = item.waterStationType === "water_level";
                    const isError = item.currDepth === null;
                    const isFlooding = item.isFlooding;
                    const formattedName = formatStationName(item.name);

                    // Tính toán tỷ lệ thanh đo
                    let progressPercent = 0;
                    let barColor = "#0284c7"; // sky-600 default

                    if (isRiver) {
                      const depthVal = item.currDepth ?? 0;
                      progressPercent = Math.min(100, Math.max(8, Math.round((Math.max(0, depthVal) / 3.0) * 100)));
                      if (depthVal >= 2.0) barColor = "#dc2626";
                      else if (depthVal >= 1.0) barColor = "#f59e0b";
                      else barColor = "#0284c7";
                    } else {
                      if (isFlooding && typeof item.currDepth === "number") {
                        const maxScale = item.waterStationType === "flood_1m5" ? 1.5 : 3.0;
                        progressPercent = Math.min(100, Math.max(15, Math.round((item.currDepth / maxScale) * 100)));
                        barColor = "#ef4444";
                      } else {
                        progressPercent = 0;
                        barColor = "#10b981";
                      }
                    }

                    return (
                      <div
                        key={item.uuid}
                        className="group relative rounded-2xl border border-ink-100 bg-white/90 p-4 sm:p-5 hover:bg-white hover:shadow-xl hover:border-brand-200 transition-all duration-200 flex flex-col justify-between space-y-3.5 backdrop-blur-sm"
                      >
                        <div className="space-y-3">
                          {/* Top: Header trạm & Mực nước chính */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1.5">
                              {/* Badges */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                    isRiver
                                      ? "bg-sky-100 text-sky-800 border border-sky-200/60"
                                      : item.waterStationType === "flood_1m5"
                                      ? "bg-purple-100 text-purple-800 border border-purple-200/60"
                                      : "bg-indigo-100 text-indigo-800 border border-indigo-200/60"
                                  }`}
                                >
                                  {item.typeLabel}
                                </span>

                                {isError ? (
                                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 border border-gray-200">
                                    ⚙️ Cảm biến bảo trì
                                  </span>
                                ) : isFlooding ? (
                                  <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 animate-pulse border border-red-200">
                                    🚨 Đang ngập {item.currDepth}m
                                  </span>
                                ) : isRiver ? (
                                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                                    ✓ Bình thường
                                  </span>
                                ) : (
                                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                                    ✓ Mặt đường khô ráo
                                  </span>
                                )}

                                {item.operator && (
                                  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 uppercase tracking-wider border border-amber-200/60">
                                    🏢 {item.operator}
                                  </span>
                                )}

                                {item.alt !== null && item.alt !== undefined && item.alt > 0 && (
                                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-700">
                                    ⛰️ {item.alt}m
                                  </span>
                                )}
                              </div>

                              {/* Tên trạm & Địa chỉ */}
                              <h3 className="text-base font-bold text-ink-900 group-hover:text-brand-700 transition-colors leading-snug">
                                {formattedName}
                              </h3>
                              <p className="text-xs text-ink-500 line-clamp-1">
                                📍 {item.address}{item.area ? ` · ${item.area}` : ""}{item.cityName ? ` · ${item.cityName}` : ""}
                              </p>
                            </div>

                            {/* Cột phải: Mực nước hiện tại to, rõ ràng */}
                            <div className="text-right shrink-0 bg-gradient-to-b from-ink-50/90 to-ink-100/40 px-3.5 py-2 rounded-2xl border border-ink-200/60 min-w-[96px] shadow-2xs">
                              <span className="text-[10px] font-semibold text-ink-400 block uppercase tracking-wider">Hiện tại</span>
                              {item.currDepth !== null ? (
                                <div className="flex items-baseline justify-end gap-0.5 mt-0.5">
                                  <span
                                    className={`text-2xl sm:text-3xl font-black tracking-tight ${
                                      isFlooding
                                        ? "text-red-600"
                                        : isRiver
                                        ? "text-sky-700"
                                        : "text-emerald-700"
                                    }`}
                                  >
                                    {item.currDepth.toFixed(2)}
                                  </span>
                                  <span className="text-xs font-bold text-ink-500">m</span>
                                </div>
                              ) : (
                                <span className="text-xs font-semibold text-ink-400 italic">-- m</span>
                              )}

                              {item.deltaDepth !== null && !isError && (
                                <div className="text-[10px] font-bold mt-0.5 flex items-center justify-end">
                                  {item.deltaDepth > 0 ? (
                                    <span className="text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded font-semibold">
                                      ▲ +{item.deltaDepth.toFixed(2)}m
                                    </span>
                                  ) : item.deltaDepth < 0 ? (
                                    <span className="text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded font-semibold">
                                      ▼ {item.deltaDepth.toFixed(2)}m
                                    </span>
                                  ) : (
                                    <span className="text-ink-500 bg-ink-100 px-1.5 py-0.5 rounded font-medium">
                                      — 0.00m
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Bảng chi tiết thông số đo đạc & Chu kỳ */}
                          <div className="rounded-xl bg-gradient-to-r from-ink-50/90 to-sky-50/40 border border-ink-200/50 p-2.5 space-y-2">
                            <div className="grid grid-cols-3 gap-2 text-center divide-x divide-ink-200/60">
                              <div className="px-1">
                                <span className="text-[10px] font-medium text-ink-500 block">Kỳ đo trước</span>
                                <span className="text-xs sm:text-sm font-bold text-ink-800">
                                  {item.prevDepth !== null ? `${item.prevDepth.toFixed(2)} m` : "--"}
                                </span>
                              </div>
                              <div className="px-1">
                                <span className="text-[10px] font-medium text-ink-500 block">Độ sâu đo</span>
                                <span className="text-xs sm:text-sm font-bold text-ink-800">
                                  {item.depth !== null ? `${item.depth.toFixed(2)} m` : "--"}
                                </span>
                              </div>
                              <div className="px-1">
                                <span className="text-[10px] font-medium text-ink-500 block">Chênh lệch</span>
                                <span
                                  className={`text-xs sm:text-sm font-bold ${
                                    (item.deltaDepth ?? 0) > 0
                                      ? "text-amber-600"
                                      : (item.deltaDepth ?? 0) < 0
                                      ? "text-emerald-600"
                                      : "text-ink-700"
                                  }`}
                                >
                                  {item.deltaDepth !== null
                                    ? `${(item.deltaDepth ?? 0) > 0 ? "+" : ""}${item.deltaDepth.toFixed(2)} m`
                                    : "--"}
                                </span>
                              </div>
                            </div>

                            {/* Chu kỳ đo đạc from -> to */}
                            <div className="pt-2 border-t border-ink-200/50 flex items-center justify-between text-[11px] text-ink-600">
                              <span className="font-medium text-ink-600 flex items-center gap-1">
                                <span>⏱️</span> Chu kỳ đo:
                              </span>
                              <span className="font-medium text-ink-800">
                                {item.from && item.to ? (
                                  <>
                                    <span className="font-semibold text-ink-700">{item.from}</span>
                                    <span className="text-ink-400 mx-1.5 font-normal">➔</span>
                                    <span className="font-bold text-ink-900">{item.to}</span>
                                  </>
                                ) : (
                                  item.to || item.from || "Cập nhật gần nhất"
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Thanh trực quan mực nước / Tình trạng ngập */}
                          {isRiver ? (
                            <div className="space-y-1">
                              <div className="h-2 flex-1 rounded-full bg-ink-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${isError ? 0 : progressPercent}%`,
                                    backgroundColor: barColor,
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-ink-400">
                                <span>Mốc BĐ1: 1.0m · BĐ2: 2.0m · BĐ3: 3.0m</span>
                                <span className="font-medium">{item.currDepth !== null ? `Mức nước: ${item.currDepth.toFixed(2)}m` : "--"}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-[11px] rounded-lg bg-ink-50/50 px-2.5 py-1.5 border border-ink-100/60">
                              <span className="text-ink-600 flex items-center gap-1.5">
                                {isFlooding ? "🚨" : "🛡️"}
                                <span className="font-medium">
                                  {isFlooding ? `Cảnh báo: ngập ${item.currDepth}m trên mặt đường` : "Mặt đường khô ráo, phương tiện lưu thông an toàn"}
                                </span>
                              </span>
                              <span className={`text-[10px] font-bold ${isFlooding ? "text-red-600" : "text-emerald-700"}`}>
                                {isFlooding ? "CÓ NGẬP" : "AN TOÀN"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Thao tác toạ độ & Bản đồ (TUYỆT ĐỐI KHÔNG HIỂN THỊ UUID) */}
                        <div className="flex items-center justify-between text-[11px] text-ink-500 pt-2.5 border-t border-ink-100">
                          <span className="font-mono text-[10px] text-ink-500 flex items-center gap-1">
                            <span>📍</span> {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyCoord({
                                  lat: item.lat,
                                  lng: item.lng,
                                  uuid: item.uuid,
                                })
                              }
                              className="px-2 py-1 rounded-lg hover:bg-brand-50 text-brand-700 hover:text-brand-800 font-medium transition cursor-pointer flex items-center gap-1"
                            >
                              {copiedStationId === item.uuid ? (
                                <span className="text-emerald-600 font-bold">✓ Đã sao chép</span>
                              ) : (
                                <span>Sao chép toạ độ</span>
                              )}
                            </button>

                            {onSelectStationLocation ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectStationLocation({
                                    lat: item.lat,
                                    lng: item.lng,
                                    name: item.name,
                                  });
                                  handleClose();
                                }}
                                className="rounded-lg bg-brand-600 px-2.5 py-1 text-white font-semibold hover:bg-brand-700 transition active:scale-95 cursor-pointer shadow-2xs"
                              >
                                Xem trên bản đồ ↗
                              </button>
                            ) : (
                              <a
                                href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg bg-brand-50 px-2.5 py-1 text-brand-700 hover:bg-brand-100 font-semibold transition active:scale-95 cursor-pointer text-[11px]"
                              >
                                Bản đồ ↗
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Ghi chú nguồn dữ liệu smart city */}
              <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-3.5 text-xs text-sky-900">
                <div className="flex items-start gap-2">
                  <span className="text-base">ℹ️</span>
                  <div>
                    <p className="font-bold">Hệ thống Giám sát Ngập lụt & Mực nước VFASS Thừa Thiên Huế</p>
                    <p className="mt-0.5 text-sky-800 text-[11px] leading-relaxed">
                      Dữ liệu được cập nhật tự động từ mạng lưới cảm biến đo mực nước siêu âm và radar thông minh của tỉnh. Giúp theo dõi kịp thời tình hình thủy triều, lũ sông Hương, sông Bồ và các điểm trũng thấp đô thị.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Thời tiết Open-Meteo & Du lịch */}
          {activeTab === "forecast" && (
            <div key="tab-forecast" className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
              {/* Thẻ thời tiết hiện tại */}
              {cur ? (
                <div className="rounded-3xl bg-gradient-to-br from-brand-500/15 via-white/80 to-purple-500/10 border border-brand-200/80 p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="text-5xl">{weatherInfo(cur.weather_code, cur.is_day).emoji}</span>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-ink-900">{Math.round(cur.temperature_2m)}°</span>
                          <span className="text-sm font-semibold text-ink-600">Huế, Việt Nam</span>
                        </div>
                        <p className="text-sm font-bold text-brand-700">
                          {weatherInfo(cur.weather_code, cur.is_day).label}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full sm:w-auto text-xs">
                      <div className="rounded-xl bg-white/70 p-2 text-center border border-white/80">
                        <span className="text-ink-500 block text-[10px]">Cảm giác như</span>
                        <span className="font-bold text-ink-900 text-sm">
                          {Math.round(cur.apparent_temperature)}°C
                        </span>
                      </div>
                      <div className="rounded-xl bg-white/70 p-2 text-center border border-white/80">
                        <span className="text-ink-500 block text-[10px]">Độ ẩm</span>
                        <span className="font-bold text-ink-900 text-sm">{cur.relative_humidity_2m}%</span>
                      </div>
                      <div className="rounded-xl bg-white/70 p-2 text-center border border-white/80">
                        <span className="text-ink-500 block text-[10px]">Sức gió</span>
                        <span className="font-bold text-ink-900 text-sm">
                          {cur.wind_speed_10m ? `${Math.round(cur.wind_speed_10m)} km/h` : "Nhẹ"}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white/70 p-2 text-center border border-white/80">
                        <span className="text-ink-500 block text-[10px]">Chỉ số UV</span>
                        <span className="font-bold text-ink-900 text-sm">{cur.uv_index ?? "Trung bình"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 text-center text-ink-500 rounded-2xl bg-white/40">
                  Đang cập nhật thời tiết từ Open-Meteo...
                </div>
              )}

              {/* Dự báo theo từng giờ (Hourly) - Đầy đủ 24 giờ tiếp theo */}
              {meteo?.hourly && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700 flex items-center gap-1.5">
                      <span>⏱️</span> Dự báo chi tiết 24 giờ tiếp theo
                    </h3>
                    <span className="text-[11px] text-ink-400 font-medium">Cuộn hoặc vuốt ngang để xem ➔</span>
                  </div>

                  <div className="relative group/hourly">
                    {/* Nút lướt trái */}
                    {canHourlyScrollLeft && (
                      <div className="absolute left-0 inset-y-0 flex items-center pr-3 pl-0 bg-gradient-to-r from-white via-white/95 to-transparent z-10 pointer-events-none">
                        <button
                          type="button"
                          onClick={scrollHourlyPrev}
                          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 shadow-md border border-slate-200/90 hover:bg-slate-50 hover:scale-110 active:scale-95 transition cursor-pointer text-sm font-black"
                          aria-label="Lướt sang trái"
                          title="Lướt sang trái"
                        >
                          ‹
                        </button>
                      </div>
                    )}

                    <div
                      ref={hourlyScrollRef}
                      {...hourlyDragProps}
                      className="flex gap-2.5 overflow-x-auto pb-3 pt-1 scroll-smooth no-scrollbar select-none cursor-grab active:cursor-grabbing touch-pan-x overscroll-x-contain"
                    >
                      {meteo.hourly.time.map((timeStr, idx) => (
                        <div
                          key={timeStr}
                          className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/80 bg-white/70 px-3.5 py-3 min-w-[78px] text-center hover:bg-white hover:shadow-md transition shrink-0 backdrop-blur-sm shadow-2xs select-none"
                        >
                          <span className="text-[11px] font-semibold text-ink-600">{formatHour(timeStr)}</span>
                          <span className="text-2xl my-0.5">
                            {weatherInfo(meteo.hourly!.weather_code[idx], 1).emoji}
                          </span>
                          <span className="text-sm font-black text-ink-900">
                            {Math.round(meteo.hourly!.temperature_2m[idx])}°
                          </span>
                          {meteo.hourly?.precipitation_probability && (
                            <span className="text-[10px] text-blue-600 font-bold bg-blue-50/80 px-1.5 py-0.5 rounded-md">
                              {meteo.hourly.precipitation_probability[idx]}% mưa
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Nút lướt phải */}
                    {canHourlyScrollRight && (
                      <div className="absolute right-0 inset-y-0 flex items-center pl-3 pr-0 bg-gradient-to-l from-white via-white/95 to-transparent z-10 pointer-events-none">
                        <button
                          type="button"
                          onClick={scrollHourlyNext}
                          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 shadow-md border border-slate-200/90 hover:bg-slate-50 hover:scale-110 active:scale-95 transition cursor-pointer text-sm font-black"
                          aria-label="Lướt sang phải"
                          title="Lướt sang phải"
                        >
                          ›
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Gợi ý du lịch theo thời tiết Xứ Huế */}
              <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4">
                <h4 className="text-xs font-bold text-brand-900 flex items-center gap-1.5">
                  <span>💡</span> Gợi ý di chuyển & Khám phá Cố Đô hôm nay
                </h4>
                <ul className="mt-2 space-y-1.5 text-xs text-ink-700 list-disc list-inside">
                  <li>
                    {summary?.floodRiskLevel === "severe" || summary?.floodRiskLevel === "high"
                      ? "⚠️ Đang có mưa to diện rộng tại nhiều khu vực (đặc biệt Phú Lộc, Nam Đông). Nên hạn chế di chuyển đường đèo Bạch Mã, Hải Vân và lưu ý vùng trũng sông Hương."
                      : "Trời thuận lợi tham quan các di tích ngoài trời như Đại Nội, Chùa Thiên Mụ, Lăng Tự Đức, Lăng Khải Định."}
                  </li>
                  <li>Thời tiết Cố Đô thường có mưa rào bất chợt vào buổi chiều muộn, du khách nên mang theo ô dù nhẹ hoặc áo mưa mỏng.</li>
                  <li>Nếu đi ca Huế trên sông Hương vào buổi tối, nên mang áo khoác mỏng vì gió sông đêm se lạnh.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/60 bg-white/70 px-5 py-3 text-[11px] text-ink-500 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span>
              {activeTab === "vwater" ? (
                <>
                  Nguồn: <strong>VFASS Huế (Trung tâm IOC Đô thị Thông minh)</strong> · Watec IoT
                </>
              ) : activeTab === "vrain" ? (
                <>
                  Nguồn: <strong>data.vrain.vn</strong> (Trạm đo mưa Tự động Thừa Thiên Huế)
                </>
              ) : (
                <>
                  Nguồn: <strong>Open-Meteo</strong> & Cục Khí tượng Thuỷ văn
                </>
              )}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                activeTab === "vwater"
                  ? vwaterData?.success
                    ? "bg-sky-100 text-sky-800"
                    : "bg-amber-100 text-amber-800"
                  : vrainData?.source === "live"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {activeTab === "vwater"
                ? vwaterData?.success
                  ? "VFASS Trực Tuyến"
                  : "Đang Đồng Bộ"
                : vrainData?.source === "live"
                ? "Dữ liệu Trực tiếp"
                : "Dữ liệu Dự phòng"}
            </span>
          </div>

          <span className="text-ink-400">
            {activeTab === "vwater" && vwaterData?.timestamp
              ? `Cập nhật: ${new Date(vwaterData.timestamp).toLocaleTimeString("vi-VN")}`
              : vrainData?.updatedAt
              ? `Cập nhật: ${new Date(vrainData.updatedAt).toLocaleTimeString("vi-VN")}`
              : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
