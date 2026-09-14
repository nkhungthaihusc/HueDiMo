"use client";

import { useState, useMemo } from "react";
import type { Itinerary } from "@/lib/itinerary/types";
import {
  getTransportOption,
  calculateDistanceKm,
  calculateTravelTimeMinutes,
  formatTravelTime,
} from "@/lib/itinerary/types";
import { itineraryPlaceIds, saveItinerary } from "@/lib/itinerary/logic";
import { formatVND, formatDateVN } from "@/lib/format";
import { getCategory } from "@/lib/data/categories";
import type { Place } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import AuthPromptModal from "@/components/auth/AuthPromptModal";
import { toast } from "@/components/ui/Toast";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";

interface ItineraryResultPanelProps {
  itinerary: Itinerary;
  places: Place[];
  onBack: () => void;
  onShowOnMap: () => void;
  onSelectPlace: (placeId: string) => void;
  onEdit?: () => void;
  onOpenHistory?: () => void;
}

export default function ItineraryResultPanel({
  itinerary,
  places,
  onBack,
  onShowOnMap,
  onSelectPlace,
  onEdit,
  onOpenHistory,
}: ItineraryResultPanelProps) {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [saved, setSaved] = useState(true); // AI tạo đã được tự động lưu
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const {
    containerRef: dayTabsScrollRef,
    canScrollLeft: canDayTabsScrollLeft,
    canScrollRight: canDayTabsScrollRight,
    scrollPrev: scrollDayTabsPrev,
    scrollNext: scrollDayTabsNext,
    hasDraggedRef: hasDayTabsDraggedRef,
    dragProps: dayTabsDragProps,
  } = useHorizontalScroll<HTMLDivElement>({ scrollAmount: 140, wheelMultiplier: 1.1 });

  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const count = itineraryPlaceIds(itinerary).length;
  const transportOpt = getTransportOption(itinerary.transportMode);

  // Tính tổng quãng đường và tổng thời gian di chuyển của cả lịch trình
  const travelStats = useMemo(() => {
    let totalKm = 0;
    let totalMins = 0;
    for (const day of itinerary.days) {
      for (let i = 0; i < day.places.length - 1; i++) {
        const p1 = placeById.get(day.places[i].placeId);
        const p2 = placeById.get(day.places[i + 1].placeId);
        if (p1 && p2) {
          const dist = calculateDistanceKm(p1.lat, p1.lng, p2.lat, p2.lng);
          const mins = calculateTravelTimeMinutes(dist, itinerary.transportMode);
          totalKm += dist;
          totalMins += mins;
        }
      }
    }
    return {
      totalKm: Math.round(totalKm * 10) / 10,
      totalMinutes: totalMins,
    };
  }, [itinerary, placeById]);

  const activeDay = itinerary.days[selectedDayIndex] || itinerary.days[0];

  const handleSave = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    saveItinerary(itinerary);
    setSaved(true);
    toast.success("Đã lưu lịch trình vào tài khoản thành công!");
  };

  return (
    <>
      <div className="pointer-events-auto flex h-full w-full max-w-[calc(100vw-1rem)] sm:w-[420px] sm:max-w-[420px] flex-col overflow-hidden rounded-3xl bg-white/95 border border-slate-200/80 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-right-4">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-slate-50/80 to-white">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 active:scale-95 cursor-pointer"
              aria-label="Quay lại"
            >
              ←
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-nowrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                  Kế hoạch Khám phá Huế
                </h2>
                {itinerary.isAiGenerated && (
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60">
                    ✨ AI
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                Lịch trình tự động tối ưu hóa lộ trình
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            {onOpenHistory && (
              <button
                type="button"
                onClick={onOpenHistory}
                className="flex items-center gap-1 shrink-0 whitespace-nowrap rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-2 sm:px-2.5 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer border border-slate-200/60"
                title="Xem tất cả lịch trình đã lưu"
              >
                <span>🧳</span>
                <span className="hidden xs:inline sm:inline">Lịch sử</span>
              </button>
            )}

            {saved ? (
              <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                ✓ Đã lưu
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="shrink-0 whitespace-nowrap rounded-xl bg-indigo-50 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 transition active:scale-95 cursor-pointer"
              >
                Lưu lộ trình
              </button>
            )}
          </div>
        </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
        {/* Banner thông báo lưu lịch sử */}
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 px-3 py-2 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <span className="font-medium text-[11px]">
              Lịch trình đã tự động lưu vào <strong className="font-bold">Lịch sử du lịch</strong>
            </span>
          </div>
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              Mở xem →
            </button>
          )}
        </div>

        {/* Card tổng quan & dự toán ngân sách */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-4 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
                <span>{transportOpt.emoji}</span>
                <span>{transportOpt.label}</span>
              </span>

              {itinerary.groupSize && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/30 px-2.5 py-1 text-xs font-semibold backdrop-blur-md border border-indigo-400/30 text-indigo-100">
                  👥 {itinerary.groupSize} người
                </span>
              )}
            </div>

            <span className="text-xs font-medium text-slate-300">
              {itinerary.days.length} ngày · {count} điểm dừng
            </span>
          </div>

          <div className="mt-3">
            <div className="text-xs font-medium text-indigo-200">Dự toán tổng chi phí</div>
            <div className="text-2xl font-black tracking-tight text-white mt-0.5">
              {formatVND(itinerary.totalEstimatedCost)}
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-300 line-clamp-3 leading-relaxed">
            {itinerary.summary}
          </p>

          {itinerary.notes && (
            <div className="mt-3 rounded-xl bg-white/10 p-2.5 text-[11px] text-slate-200 border border-white/10">
              <span className="font-bold text-amber-300">📝 Ghi chú riêng: </span>
              <span>{itinerary.notes}</span>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400">Quãng đường: </span>
              <span className="font-semibold text-slate-200">{travelStats.totalKm} km</span>
            </div>
            <div>
              <span className="text-slate-400">Thời gian chạy xe: </span>
              <span className="font-semibold text-slate-200">{formatTravelTime(travelStats.totalMinutes)}</span>
            </div>
          </div>
        </div>

        {/* Thanh chuyển ngày (Day Tabs) */}
        {itinerary.days.length > 1 && (
          <div className="relative group/daytabs">
            {canDayTabsScrollLeft && (
              <div className="absolute left-0 inset-y-0 flex items-center pr-2 pl-0 bg-gradient-to-r from-white via-white/95 to-transparent z-10 pointer-events-none">
                <button
                  type="button"
                  onClick={scrollDayTabsPrev}
                  className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 hover:scale-110 active:scale-95 transition cursor-pointer text-xs font-black"
                  aria-label="Lướt sang trái"
                  title="Lướt sang trái"
                >
                  ‹
                </button>
              </div>
            )}

            <div
              ref={dayTabsScrollRef}
              {...dayTabsDragProps}
              className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none cursor-grab active:cursor-grabbing touch-pan-x overscroll-x-contain"
            >
              {itinerary.days.map((day, idx) => {
                const isActive = idx === selectedDayIndex;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => {
                      if (hasDayTabsDraggedRef.current) return;
                      setSelectedDayIndex(idx);
                    }}
                    className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200 ring-2 ring-indigo-600/30"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <div>Ngày {idx + 1}</div>
                    <div className="text-[10px] font-normal opacity-80">{formatDateVN(day.date).split(",")[0]}</div>
                  </button>
                );
              })}
            </div>

            {canDayTabsScrollRight && (
              <div className="absolute right-0 inset-y-0 flex items-center pl-2 pr-0 bg-gradient-to-l from-white via-white/95 to-transparent z-10 pointer-events-none">
                <button
                  type="button"
                  onClick={scrollDayTabsNext}
                  className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 hover:scale-110 active:scale-95 transition cursor-pointer text-xs font-black"
                  aria-label="Lướt sang phải"
                  title="Lướt sang phải"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        )}

        {/* Danh sách chặng di chuyển theo ngày (Interactive Route Timeline) */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Lộ trình Ngày {selectedDayIndex + 1}
              </h3>
              <div className="text-sm font-bold text-slate-900">{activeDay.title}</div>
            </div>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              {activeDay.places.length} điểm tham quan
            </span>
          </div>

          <div className="relative space-y-4 pl-2">
            {activeDay.places.map((entry, idx) => {
              const place = placeById.get(entry.placeId);
              const name = place?.name ?? entry.customName ?? "Địa điểm";
              const note = entry.reason || entry.note;
              const cat = place ? getCategory(place.category) : null;

              let travelBetween = null;
              if (idx > 0) {
                const prevPlace = placeById.get(activeDay.places[idx - 1].placeId);
                if (prevPlace && place) {
                  const dist = calculateDistanceKm(prevPlace.lat, prevPlace.lng, place.lat, place.lng);
                  const mins = calculateTravelTimeMinutes(dist, itinerary.transportMode);
                  travelBetween = (
                    <div className="flex items-center gap-2 py-1.5 -my-2 text-[11px] text-slate-500">
                      <div className="h-6 w-0.5 bg-indigo-200 ml-3.5" />
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600 border border-slate-200">
                        <span>{transportOpt.emoji}</span>
                        <span>{formatTravelTime(mins)}</span>
                        <span className="text-slate-400">({dist} km)</span>
                      </div>
                    </div>
                  );
                }
              }

              return (
                <div key={`${activeDay.date}-${entry.placeId}`} className="group">
                  {travelBetween}
                  <div
                    onClick={() => place && onSelectPlace(place.id)}
                    className="relative flex items-start gap-3 rounded-xl bg-white p-3 border border-slate-200/70 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
                  >
                    {/* Badge số thứ tự */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs shadow-sm">
                      {idx + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition">
                          {name}
                        </h4>
                        <span className="text-[11px] font-bold text-indigo-700 shrink-0">
                          {formatVND(entry.estimatedCost)}
                        </span>
                      </div>

                      {cat && (
                        <span className="inline-block text-[10px] text-slate-500 font-medium mt-0.5">
                          {cat.emoji} {cat.label}
                        </span>
                      )}

                      {note && (
                        <p className="mt-1 text-xs text-slate-600 leading-snug line-clamp-2">
                          {note}
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px] text-indigo-600 font-medium">
                        <span>👉 Nhấn để xem vị trí</span>
                        <span className="text-slate-400 group-hover:translate-x-0.5 transition">→</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer controls */}
      <div className="border-t border-slate-100 p-4 space-y-2 bg-slate-50/80">
        <button
          type="button"
          onClick={onShowOnMap}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
        >
          <span>🗺️</span>
          <span>Bao quát toàn bộ lộ trình trên bản đồ</span>
        </button>

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-2 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
          >
            <span>✏️</span>
            <span>Chỉnh sửa các điểm dừng</span>
          </button>
        )}
      </div>
      </div>

      <AuthPromptModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title="Đăng nhập để lưu lộ trình"
        description="Bạn cần đăng nhập tài khoản HueDiMo để lưu trữ kế hoạch du lịch và đồng bộ danh sách yêu thích cá nhân."
        icon="💾"
      />
    </>
  );
}