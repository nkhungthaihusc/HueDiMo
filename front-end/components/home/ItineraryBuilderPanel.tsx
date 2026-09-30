"use client";

import { useMemo, useRef, useState } from "react";
import type { Itinerary, ItineraryDay, TransportMode } from "@/lib/itinerary/types";
import {
  itineraryTotal,
  getTransportOption,
  calculateDistanceKm,
  calculateRouteDistanceKm,
  calculateTravelTimeMinutes,
  formatTravelTime,
  TRANSPORT_OPTIONS,
} from "@/lib/itinerary/types";
import { defaultTitle, saveItinerary } from "@/lib/itinerary/logic";
import type { SavedItinerary } from "@/lib/itinerary/logic";
import { getCategory, CATEGORIES } from "@/lib/data/categories";
import type { CategoryId, Place } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import AuthPromptModal from "@/components/auth/AuthPromptModal";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";

interface ItineraryBuilderPanelProps {
  places: Place[];
  initial: Itinerary | null;
  onCancel: () => void;
  onSaved: (itinerary: Itinerary) => void;
}

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cur <= last) {
    out.push(toDateInput(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function emptyDays(start: string, end: string): ItineraryDay[] {
  return datesBetween(start, end).map((date, i) => ({ date, title: `Ngày ${i + 1}`, places: [] }));
}

function syncDays(start: string, end: string, prev: ItineraryDay[]): ItineraryDay[] {
  const byDate = new Map(prev.map((d) => [d.date, d]));
  return datesBetween(start, end).map((date, i) => {
    const old = byDate.get(date);
    return old ? { ...old, title: old.title || `Ngày ${i + 1}` } : { date, title: `Ngày ${i + 1}`, places: [] };
  });
}

export default function ItineraryBuilderPanel({
  places,
  initial,
  onCancel,
  onSaved,
}: ItineraryBuilderPanelProps) {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(() =>
    initial && initial.days.length > 0 ? initial.days[0].date : toDateInput(new Date()),
  );
  const [endDate, setEndDate] = useState(() =>
    initial && initial.days.length > 0
      ? initial.days[initial.days.length - 1].date
      : toDateInput(new Date(Date.now() + 86_400_000)),
  );
  const [transportMode, setTransportMode] = useState<TransportMode>(
    () => initial?.transportMode ?? "motorbike",
  );
  const [days, setDays] = useState<ItineraryDay[]>(() =>
    initial && initial.days.length > 0
      ? initial.days.map((d) => ({ title: d.title || "", date: d.date, places: d.places }))
      : emptyDays(startDate, endDate),
  );
  const itineraryId = (initial as Partial<SavedItinerary> | null)?.id ?? undefined;
  const [title, setTitle] = useState((initial as Partial<SavedItinerary> | null)?.title ?? "");
  const [budget, setBudget] = useState(
    typeof initial?.budget === "number" && initial.budget > 0 ? String(initial.budget) : "",
  );
  const [activeDay, setActiveDay] = useState(0);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<CategoryId | null>(null);

  const {
    containerRef: catScrollRef,
    canScrollLeft: canCatScrollLeft,
    canScrollRight: canCatScrollRight,
    scrollPrev: scrollCatPrev,
    scrollNext: scrollCatNext,
    hasDraggedRef: hasCatDraggedRef,
    dragProps: catDragProps,
  } = useHorizontalScroll<HTMLDivElement>({ scrollAmount: 160, wheelMultiplier: 1.1 });

  const {
    containerRef: daysScrollRef,
    canScrollLeft: canDaysScrollLeft,
    canScrollRight: canDaysScrollRight,
    scrollPrev: scrollDaysPrev,
    scrollNext: scrollDaysNext,
    hasDraggedRef: hasDaysDraggedRef,
    dragProps: daysDragProps,
  } = useHorizontalScroll<HTMLDivElement>({ scrollAmount: 120, wheelMultiplier: 1.1 });
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCost, setCustomCost] = useState("");
  const customSeq = useRef(0);

  const usedIds = useMemo(() => {
    const set = new Set<string>();
    days.forEach((d) => d.places.forEach((p) => set.add(p.placeId)));
    return set;
  }, [days]);

  const total = useMemo(() => itineraryTotal({ summary: "", totalEstimatedCost: 0, days }), [days]);
  const hasPlaces = days.some((d) => d.places.length > 0);

  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return places.filter((p) => {
      if (usedIds.has(p.id)) return false;
      if (catFilter && p.category !== catFilter) return false;
      return !q || p.name.toLowerCase().includes(q);
    });
  }, [places, usedIds, search, catFilter]);

  const changeDate = (which: "start" | "end", value: string) => {
    let nextStart = startDate;
    let nextEnd = endDate;
    if (which === "start") {
      nextStart = value;
      if (nextEnd < value) nextEnd = value;
      setStartDate(nextStart);
      setEndDate(nextEnd);
    } else {
      nextEnd = value;
      if (value < nextStart) nextStart = value;
      setStartDate(nextStart);
      setEndDate(nextEnd);
    }
    setDays((prev) => syncDays(nextStart, nextEnd, prev));
    setActiveDay(0);
  };

  const day = days[Math.min(activeDay, days.length - 1)];

  const patchDay = (fn: (d: ItineraryDay) => ItineraryDay) => {
    setDays((prev) => prev.map((d, i) => (i === activeDay ? fn(d) : d)));
  };

  const addCatalogPlace = (place: Place) => {
    patchDay((d) => ({
      ...d,
      places: [
        ...d.places,
        { placeId: place.id, reason: "", estimatedCost: place.price ?? 0, note: "" },
      ],
    }));
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    customSeq.current += 1;
    const cost = Number(customCost);
    patchDay((d) => ({
      ...d,
      places: [
        ...d.places,
        {
          placeId: `custom-${Date.now()}-${customSeq.current}`,
          reason: "",
          estimatedCost: Number.isFinite(cost) && cost > 0 ? Math.round(cost) : 0,
          customName: customName.trim(),
          note: "",
        },
      ],
    }));
    setCustomName("");
    setCustomCost("");
    setCustomOpen(false);
  };

  const setCost = (idx: number, value: string) => {
    const n = Number(value);
    patchDay((d) => ({
      ...d,
      places: d.places.map((p, i) =>
        i === idx ? { ...p, estimatedCost: Number.isFinite(n) && n >= 0 ? Math.round(n) : 0 } : p,
      ),
    }));
  };

  const setNote = (idx: number, value: string) => {
    patchDay((d) => ({
      ...d,
      places: d.places.map((p, i) => (i === idx ? { ...p, note: value } : p)),
    }));
  };

  const move = (idx: number, dir: -1 | 1) => {
    patchDay((d) => {
      const next = [...d.places];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return d;
      [next[idx], next[j]] = [next[j], next[idx]];
      return { ...d, places: next };
    });
  };

  const removeEntry = (idx: number) => {
    patchDay((d) => ({ ...d, places: d.places.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!hasPlaces) return;
    const budgetNum = Number(budget);
    const itinerary: Itinerary = {
      id: itineraryId,
      summary: title.trim() || defaultTitle({ summary: "", totalEstimatedCost: 0, days }),
      totalEstimatedCost: total,
      budget:
        Number.isFinite(budgetNum) && budgetNum > 0 ? Math.round(budgetNum) : undefined,
      transportMode,
      days,
    };
    const saved = saveItinerary(itinerary, title.trim() || undefined);
    onSaved(saved);
  };

  const btn =
    "flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-700 transition hover:bg-slate-200 cursor-pointer select-none";
  const inputCls =
    "w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition shadow-xs";

  return (
    <div className="pointer-events-auto flex h-full w-full max-w-[calc(100vw-1rem)] sm:w-[420px] sm:max-w-[420px] flex-col overflow-hidden rounded-3xl bg-white/95 border border-slate-200/80 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-right-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={adding ? () => setAdding(false) : onCancel}
            className="flex h-8 sm:h-9 w-8 sm:w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition active:scale-95 cursor-pointer select-none shadow-xs"
            aria-label="Quay lại"
            title="Quay lại"
          >
            <span className="text-base leading-none pointer-events-none select-none">←</span>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              {adding ? "Chọn địa điểm" : initial ? "Chỉnh sửa lộ trình" : "Lộ trình mới"}
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
              {adding ? "Thêm điểm tham quan vào ngày" : "Tùy chỉnh lịch trình cá nhân"}
            </p>
          </div>
        </div>
      </div>

      {adding ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="p-4 space-y-2 border-b border-slate-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm địa điểm thêm vào..."
              className={inputCls}
            />
            <div className="relative group/cats">
              {canCatScrollLeft && (
                <div className="absolute left-0 inset-y-0 flex items-center pr-3 pl-0 bg-gradient-to-r from-white via-white/95 to-transparent z-10 pointer-events-none">
                  <button
                    type="button"
                    onClick={scrollCatPrev}
                    className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-700 shadow-md border border-slate-200/90 hover:bg-slate-50 hover:scale-110 active:scale-95 transition cursor-pointer text-xs font-black"
                    aria-label="Lướt sang trái"
                    title="Lướt sang trái"
                  >
                    ‹
                  </button>
                </div>
              )}

              <div
                ref={catScrollRef}
                {...catDragProps}
                className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none cursor-grab active:cursor-grabbing touch-pan-x overscroll-x-contain"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (hasCatDraggedRef.current) return;
                    setCatFilter(null);
                  }}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer select-none ${
                    catFilter === null
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span className="pointer-events-none select-none">Tất cả</span>
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      if (hasCatDraggedRef.current) return;
                      setCatFilter((cur) => (cur === c.id ? null : c.id));
                    }}
                    className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer select-none ${
                      catFilter === c.id
                        ? "bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-500/30"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span className="pointer-events-none select-none">{c.emoji}</span>
                    <span className="pointer-events-none select-none">{c.label}</span>
                  </button>
                ))}
              </div>

              {canCatScrollRight && (
                <div className="absolute right-0 inset-y-0 flex items-center pl-3 pr-0 bg-gradient-to-l from-white via-white/95 to-transparent z-10 pointer-events-none">
                  <button
                    type="button"
                    onClick={scrollCatNext}
                    className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-700 shadow-md border border-slate-200/90 hover:bg-slate-50 hover:scale-110 active:scale-95 transition cursor-pointer text-xs font-black"
                    aria-label="Lướt sang phải"
                    title="Lướt sang phải"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
            {available.length === 0 && (
              <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500 border border-slate-100">
                Không còn địa điểm phù hợp (đã thêm vào lộ trình).
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {available.map((p) => {
                const cat = getCategory(p.category);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => addCatalogPlace(p)}
                      className="group flex w-full items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-2.5 text-left transition-all duration-150 hover:border-indigo-300 hover:shadow-md cursor-pointer select-none"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base shadow-xs"
                        style={{ backgroundColor: cat.color, color: "#fff" }}
                      >
                        {cat.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                          {p.name}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {p.price ? `${p.price.toLocaleString("vi-VN")} đ` : "Miễn phí"} · {cat.label}
                        </span>
                      </span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700 transition group-hover:bg-indigo-600 group-hover:text-white">
                        +
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={() => setCustomOpen((v) => !v)}
              className="mt-3 w-full rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 active:scale-98 cursor-pointer select-none"
            >
              {customOpen ? "− Đóng form nhập riêng" : "＋ Thêm địa điểm riêng ngoài danh mục"}
            </button>
            {customOpen && (
              <div className="mt-2 flex flex-col gap-2 rounded-2xl bg-indigo-50/50 p-3.5 border border-indigo-100">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Tên địa điểm riêng *"
                  className={inputCls}
                />
                <input
                  type="number"
                  min={0}
                  value={customCost}
                  onChange={(e) => setCustomCost(e.target.value)}
                  placeholder="Dự kiến chi phí (VND)"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={addCustom}
                  disabled={!customName.trim()}
                  className="w-full rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-40 cursor-pointer select-none shadow-xs"
                >
                  Thêm vào ngày {activeDay + 1}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="px-5 pt-3 space-y-2.5">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tên lộ trình (tùy chọn)"
              className={inputCls}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-slate-600">Ngày đi</span>
                <input type="date" value={startDate} onChange={(e) => changeDate("start", e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-slate-600">Ngày về</span>
                <input type="date" value={endDate} min={startDate} onChange={(e) => changeDate("end", e.target.value)} className={inputCls} />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-600">Ngân sách dự kiến (VND)</span>
              <input
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="VD: 2.000.000 - tùy chọn"
                className={inputCls}
              />
            </label>

            <div>
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Phương tiện di chuyển</span>
              <div className="grid grid-cols-4 gap-1.5">
                {TRANSPORT_OPTIONS.map((opt) => {
                  const active = transportMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTransportMode(opt.id)}
                      title={opt.description}
                      className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition-all duration-150 cursor-pointer select-none ${
                        active
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200 font-bold scale-[1.02]"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200/80 font-medium"
                      }`}
                    >
                      <span className="text-base pointer-events-none select-none">{opt.emoji}</span>
                      <span className="text-[11px] leading-tight truncate w-full pointer-events-none select-none mt-0.5">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="relative group/days mt-3 px-5">
            {canDaysScrollLeft && (
              <div className="absolute left-5 inset-y-0 flex items-center pr-2 pl-0 bg-gradient-to-r from-white via-white/95 to-transparent z-10 pointer-events-none">
                <button
                  type="button"
                  onClick={scrollDaysPrev}
                  className="pointer-events-auto flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 hover:scale-110 active:scale-95 transition cursor-pointer text-[10px] font-black"
                  aria-label="Lướt sang trái"
                  title="Lướt sang trái"
                >
                  ‹
                </button>
              </div>
            )}

            <div
              ref={daysScrollRef}
              {...daysDragProps}
              className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none cursor-grab active:cursor-grabbing touch-pan-x overscroll-x-contain"
            >
              {days.map((d, i) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => {
                    if (hasDaysDraggedRef.current) return;
                    setActiveDay(i);
                  }}
                  className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer select-none ${
                    i === activeDay
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  <span className="pointer-events-none select-none">Ngày {i + 1}</span>
                </button>
              ))}
            </div>

            {canDaysScrollRight && (
              <div className="absolute right-5 inset-y-0 flex items-center pl-2 pr-0 bg-gradient-to-l from-white via-white/95 to-transparent z-10 pointer-events-none">
                <button
                  type="button"
                  onClick={scrollDaysNext}
                  className="pointer-events-auto flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 hover:scale-110 active:scale-95 transition cursor-pointer text-[10px] font-black"
                  aria-label="Lướt sang phải"
                  title="Lướt sang phải"
                >
                  ›
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 pt-2 space-y-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
            <p className="text-xs font-bold text-slate-700">
              Ngày {activeDay + 1} ·{" "}
              {day?.date ? new Date(`${day.date}T00:00:00`).toLocaleDateString("vi-VN") : ""}
            </p>
            {day?.places.length === 0 && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200/60 p-4 text-center text-xs text-slate-500">
                Chưa có địa điểm nào. Nhấn &quot;＋ Thêm địa điểm&quot; để bắt đầu.
              </div>
            )}
            <div className="flex flex-col gap-2">
              {day?.places.map((entry, idx) => {
                const place = byId.get(entry.placeId);
                const cat = place ? getCategory(place.category) : null;
                const opt = getTransportOption(transportMode);

                let travelBadge = null;
                if (idx > 0) {
                  const prevPlace = byId.get(day.places[idx - 1].placeId);
                  if (prevPlace && place) {
                    const dist = calculateRouteDistanceKm(prevPlace.lat, prevPlace.lng, place.lat, place.lng);
                    const mins = calculateTravelTimeMinutes(dist, transportMode);
                    travelBadge = (
                      <div className="my-1 flex items-center gap-1.5 pl-4 text-[10px] text-slate-500">
                        <div className="h-3.5 w-px border-l-2 border-dashed border-indigo-300" />
                        <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 border border-indigo-100">
                          <span>{opt.emoji}</span>
                          <span>{formatTravelTime(mins)}</span>
                          <span className="text-slate-400 font-normal">({dist} km)</span>
                        </span>
                      </div>
                    );
                  }
                }

                return (
                  <div key={`${entry.placeId}-${idx}`}>
                    {travelBadge}
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white p-2.5 shadow-2xs">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base shadow-xs"
                        style={{ backgroundColor: cat?.color ?? "#94a3b8", color: "#fff" }}
                      >
                        {cat?.emoji ?? "🗺️"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-slate-900">
                          {place?.name ?? entry.customName ?? "Địa điểm"}
                        </span>
                        <input
                          type="text"
                          value={entry.note ?? ""}
                          onChange={(e) => setNote(idx, e.target.value)}
                          placeholder="Ghi chú (tùy chọn)"
                          className="mt-0.5 w-full rounded-lg bg-transparent text-[11px] text-slate-600 outline-none placeholder:text-slate-400"
                        />
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={entry.estimatedCost}
                        onChange={(e) => setCost(idx, e.target.value)}
                        className="w-20 shrink-0 rounded-xl border border-slate-200 bg-slate-50/50 px-2 py-1 text-right text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                      <span className="flex shrink-0 flex-col gap-0.5">
                        <button type="button" className="text-[10px] text-slate-400 hover:text-slate-800 p-0.5 cursor-pointer select-none" onClick={() => move(idx, -1)} aria-label="Lên">▲</button>
                        <button type="button" className="text-[10px] text-slate-400 hover:text-slate-800 p-0.5 cursor-pointer select-none" onClick={() => move(idx, 1)} aria-label="Xuống">▼</button>
                      </span>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-50 text-xs font-bold text-rose-600 hover:bg-rose-100 transition cursor-pointer select-none"
                        onClick={() => removeEntry(idx)}
                        aria-label="Xóa"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCatFilter(null);
                setAdding(true);
              }}
              className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 hover:border-indigo-300 active:scale-98 cursor-pointer select-none"
            >
              <span className="pointer-events-none select-none">＋ Thêm địa điểm vào ngày {activeDay + 1}</span>
            </button>
          </div>

          {/* Footer tổng kết chi phí & Lưu (Không bao giờ bị đè chữ) */}
          <div className="border-t border-slate-200/80 bg-white p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-slate-500 font-medium">Dự toán tổng chi phí:</span>
              <span className="text-base font-black text-indigo-700">
                {total.toLocaleString("vi-VN")} ₫
              </span>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasPlaces}
              className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-indigo-800 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none cursor-pointer select-none"
            >
              Lưu lộ trình
            </button>
          </div>
        </div>
      )}

      {/* Modal nhắc nhở đăng nhập */}
      <AuthPromptModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title="Đăng nhập để lưu lộ trình"
        description="Bạn cần đăng nhập tài khoản HueDiMo để lưu lại lộ trình tự tạo vào bộ sưu tập cá nhân."
        icon="💾"
      />
    </div>
  );
}