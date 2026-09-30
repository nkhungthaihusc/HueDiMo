"use client";

import { useState } from "react";
import type { Itinerary, TransportMode } from "@/lib/itinerary/types";
import { TRANSPORT_OPTIONS } from "@/lib/itinerary/types";
import type { CategoryId, Place } from "@/lib/types";
import { CATEGORIES } from "@/lib/data/categories";
import { createItinerary } from "@/lib/api/itinerary";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/components/ui/Toast";

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const NOTE_SUGGESTIONS = [
  "📸 Thích chụp ảnh sống ảo",
  "👴 Có người lớn tuổi",
  "👶 Có trẻ nhỏ",
  "🥗 Thích ăn đồ chay",
  "🏛️ Đậm nét văn hóa di sản",
  "☕ Trải nghiệm cà phê đẹp",
  "🚴 Nhịp độ thong thả, thư giãn",
  "🌧️ Ưu tiên điểm trong nhà",
];

interface ItineraryFormPanelProps {
  places: Place[];
  onCancel: () => void;
  onGenerated: (itinerary: Itinerary) => void;
  onViewHistory?: () => void;
}

export default function ItineraryFormPanel({
  places,
  onCancel,
  onGenerated,
  onViewHistory,
}: ItineraryFormPanelProps) {
  const [startDate, setStartDate] = useState(() => toDateInput(new Date()));
  const [endDate, setEndDate] = useState(() => toDateInput(new Date(Date.now() + 86_400_000)));
  const [groupSize, setGroupSize] = useState(2);
  const [transportMode, setTransportMode] = useState<TransportMode>("motorbike");
  const [prefs, setPrefs] = useState<Set<CategoryId>>(new Set(["ancient", "food"]));
  const [budget, setBudget] = useState("1500000");
  const [currentLocation, setCurrentLocation] = useState("Khách sạn gần trung tâm TP. Huế");
  const [notes, setNotes] = useState("");
  const [startPlaceId, setStartPlaceId] = useState("");
  const [endPlaceId, setEndPlaceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const togglePref = (id: CategoryId) => {
    setPrefs((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addNoteSuggestion = (suggestion: string) => {
    setNotes((prev) => {
      const cleanSuggestion = suggestion.replace(/^[^\s]+\s/, ""); // bỏ emoji nếu muốn hoặc giữ nguyên
      if (prev.includes(suggestion)) return prev;
      if (!prev.trim()) return suggestion;
      return `${prev.trim()}, ${suggestion}`;
    });
  };

  const budgetNum = Number(budget);
  const valid =
    startDate <= endDate &&
    prefs.size > 0 &&
    groupSize >= 1 &&
    Number.isFinite(budgetNum) &&
    budgetNum > 0;

  const handleSubmit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError("");
    try {
      const itinerary = await createItinerary({
        startDate,
        endDate,
        transportMode,
        preferences: [...prefs],
        budget: budgetNum,
        currentLocation: currentLocation.trim() || "Thành phố Huế",
        startPlaceId: startPlaceId || null,
        endPlaceId: endPlaceId || null,
        groupSize,
        notes: notes.trim() || undefined,
        places,
      });

      // Bổ sung metadata nguồn gốc AI & thông tin bổ trợ
      const enhancedItinerary: Itinerary = {
        ...itinerary,
        groupSize,
        notes: notes.trim() || undefined,
        isAiGenerated: true,
        createdAt: new Date().toISOString(),
      };

      toast.success("✨ AI đã thiết kế lịch trình du lịch Huế thành công!");
      onGenerated(enhancedItinerary);
    } catch (e) {
      const errMsg =
        e instanceof ApiError ? e.message : "Không kết nối được với máy chủ AI. Thử lại sau.";
      setError(errMsg);
      toast.error(`Lỗi AI tư vấn: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pointer-events-auto flex h-full w-full max-w-[calc(100vw-1rem)] sm:w-[420px] sm:max-w-[420px] flex-col overflow-hidden rounded-3xl bg-white/95 border border-slate-200/80 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-right-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 sm:h-9 w-8 sm:w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition active:scale-95 cursor-pointer select-none shadow-xs"
            aria-label="Quay lại"
            title="Quay lại"
          >
            <span className="text-base leading-none pointer-events-none select-none">←</span>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              Thiết kế Lộ trình AI
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
              Gợi ý lịch trình thông minh theo nhu cầu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              className="flex items-center gap-1 shrink-0 whitespace-nowrap rounded-xl bg-slate-100/90 hover:bg-indigo-50 hover:text-indigo-600 px-2 sm:px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition active:scale-95 cursor-pointer select-none border border-slate-200/60"
              title="Xem lịch sử lộ trình đã lưu"
            >
              <span className="pointer-events-none select-none">🧳</span>
              <span className="pointer-events-none select-none hidden xs:inline sm:inline">Lịch sử</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
        {/* Chọn ngày đi & ngày về */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ngày bắt đầu
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ngày kết thúc
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />
          </div>
        </div>

        {/* Số lượng người tham gia */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Số người tham gia
            </label>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
              👥 {groupSize} người
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {[
              { count: 1, label: "1 người", desc: "Độc hành" },
              { count: 2, label: "2 người", desc: "Cặp đôi" },
              { count: 4, label: "4 người", desc: "Gia đình" },
              { count: 6, label: "6+ người", desc: "Nhóm đông" },
            ].map((preset) => {
              const selected = groupSize === preset.count;
              return (
                <button
                  key={preset.count}
                  type="button"
                  onClick={() => setGroupSize(preset.count)}
                  className={`flex flex-col items-center justify-center rounded-xl p-2 border transition-all cursor-pointer ${
                    selected
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20 font-bold"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium"
                  }`}
                >
                  <span className="text-xs">{preset.label}</span>
                  <span className="text-[9px] opacity-70">{preset.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Stepper điều chỉnh số người tự do */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5">
            <span className="text-[11px] text-slate-600 font-medium">Tùy chỉnh số lượng thành viên:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGroupSize((g) => Math.max(1, g - 1))}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 cursor-pointer"
              >
                −
              </button>
              <span className="min-w-[28px] text-center text-xs font-extrabold text-slate-900">
                {groupSize}
              </span>
              <button
                type="button"
                onClick={() => setGroupSize((g) => Math.min(50, g + 1))}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Phương tiện di chuyển */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Phương tiện di chuyển
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TRANSPORT_OPTIONS.map((opt) => {
              const selected = transportMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTransportMode(opt.id)}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-left border transition-all cursor-pointer ${
                    selected
                      ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 text-indigo-900"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs leading-tight">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">~{opt.speedKmh} km/h</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sở thích khám phá */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Sở thích của bạn ({prefs.size} đã chọn)
            </label>
            <span className="text-[11px] text-indigo-600 font-medium">Chọn ít nhất 1</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const active = prefs.has(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => togglePref(cat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-indigo-600 text-white shadow-xs shadow-indigo-200 ring-2 ring-indigo-600/30"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ngân sách */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Ngân sách dự kiến (VND)
          </label>
          <div className="relative">
            <input
              type="number"
              value={budget}
              step={100000}
              placeholder="VD: 2000000"
              onChange={(e) => setBudget(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />
            {budgetNum > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600 pointer-events-none">
                {budgetNum.toLocaleString("vi-VN")} đ
              </span>
            )}
          </div>
        </div>

        {/* Điểm lưu trú / Nơi ở */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Khu vực lưu trú / Điểm xuất phát
          </label>
          <input
            type="text"
            value={currentLocation}
            placeholder="VD: Gần Cầu Trường Tiền hoặc Khách sạn Imperial"
            onChange={(e) => setCurrentLocation(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
          />
        </div>

        {/* Ghi chú & Yêu cầu riêng của người dùng */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Ghi chú & Yêu cầu đặc biệt
            </label>
            <span className="text-[10px] text-slate-400">Tùy chọn</span>
          </div>
          
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="VD: Nhóm có người lớn tuổi, thích ăn món chay Huế, muốn ngắm hoàng hôn bên sông Hương và chụp ảnh sống ảo..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none"
          />

          {/* Gợi ý nhanh yêu cầu */}
          <div className="mt-1.5">
            <p className="text-[10px] font-semibold text-slate-500 mb-1">Gợi ý nhanh (nhấn để thêm):</p>
            <div className="flex flex-wrap gap-1">
              {NOTE_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => addNoteSuggestion(sug)}
                  className="rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200/60 px-2 py-0.5 text-[10px] text-slate-600 transition cursor-pointer"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-800 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Footer Submit */}
      <div className="border-t border-slate-100 p-4 bg-slate-50/80">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!valid || loading}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-3 px-4 text-xs font-bold text-white shadow-md hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:pointer-events-none active:scale-95 transition cursor-pointer"
        >
          {loading ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>AI đang phân tích & lập lịch trình ({groupSize} người)...</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>Tạo lịch trình thông minh ({groupSize} người)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}