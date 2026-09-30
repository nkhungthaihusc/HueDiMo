"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { Place, CategoryId } from "@/lib/types";
import { CATEGORIES, getCategory } from "@/lib/data/categories";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";

interface PlaceListPanelProps {
  places: Place[];
  selectedId: string | null;
  onSelect: (place: Place) => void;
  userContributedPlaces?: Place[];
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

function PlaceThumbnail({
  src,
  alt,
  categoryColor,
  categoryEmoji,
}: {
  src?: string;
  alt: string;
  categoryColor: string;
  categoryEmoji: string;
}) {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    return (
      <div
        className="flex h-full w-full items-center justify-center text-xl select-none"
        style={{
          background: `linear-gradient(135deg, ${categoryColor} 0%, #0f172a 100%)`,
        }}
      >
        <span className="drop-shadow-md">{categoryEmoji}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onError={() => setImageError(true)}
      className="h-full w-full object-cover select-none transition-transform duration-500 group-hover:scale-110"
      loading="lazy"
    />
  );
}

export default function PlaceListPanel({
  places,
  selectedId,
  onSelect,
  userContributedPlaces = [],
  currentPage: externalPage,
  onPageChange: externalSetPage,
}: PlaceListPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | "all" | "my_places">("all");
  const [internalPage, setInternalPage] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const PAGE_SIZE = 10;

  const currentPage = externalPage ?? internalPage;
  const setCurrentPage = (updater: number | ((p: number) => number)) => {
    const nextPage = typeof updater === "function" ? updater(currentPage) : updater;
    if (externalSetPage) {
      externalSetPage(nextPage);
    } else {
      setInternalPage(nextPage);
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    containerRef: catScrollRef,
    canScrollLeft: canCatScrollLeft,
    canScrollRight: canCatScrollRight,
    scrollPrev: scrollCatPrev,
    scrollNext: scrollCatNext,
    hasDraggedRef: hasCatDraggedRef,
    dragProps: catDragProps,
  } = useHorizontalScroll<HTMLDivElement>({ scrollAmount: 160, wheelMultiplier: 1.1 });

  const userContributedSet = useMemo(
    () => new Set(userContributedPlaces.map((p) => p.id)),
    [userContributedPlaces]
  );

  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      // Lọc theo danh mục cá nhân đã thêm
      if (selectedCategory === "my_places") {
        const isMine = userContributedSet.has(p.id) || p.status === "pending";
        if (!isMine) return false;
      } else if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }
      // Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesAddress = p.address?.toLowerCase().includes(q);
        const matchesCategory = p.category.toLowerCase().includes(q);
        if (!matchesName && !matchesAddress && !matchesCategory) return false;
      }
      return true;
    });
  }, [places, searchQuery, selectedCategory, userContributedSet]);

  // Chỉ reset page về 1 khi người dùng thực sự thay đổi từ khóa tìm kiếm hoặc danh mục lọc
  const prevFilterRef = useRef({ searchQuery, selectedCategory });
  useEffect(() => {
    if (
      prevFilterRef.current.searchQuery !== searchQuery ||
      prevFilterRef.current.selectedCategory !== selectedCategory
    ) {
      prevFilterRef.current = { searchQuery, selectedCategory };
      setCurrentPage(1);
    }
  }, [searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredPlaces.length / PAGE_SIZE) || 1;

  // Lấy các địa điểm của trang hiện tại để không phải cuộn dài
  const pagedPlaces = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPlaces.slice(start, start + PAGE_SIZE);
  }, [filteredPlaces, currentPage]);

  return (
    <div className="pointer-events-auto flex h-full w-full max-w-[calc(100vw-1rem)] sm:w-[380px] sm:max-w-[380px] flex-col animate-in fade-in slide-in-from-left-4 duration-300 ease-out select-none">
      {/* Header bar */}
      <div className="glass-strong mb-2.5 rounded-3xl border border-white/70 p-3 sm:p-3.5 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <div className="flex h-8 sm:h-9 w-8 sm:w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-amber-500 text-white shadow-md shadow-brand-500/25 text-base">
              🏛️
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-nowrap">
                <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">Khám phá Cố đô</h3>
                <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-brand-700 border border-brand-200/60 shadow-xs">
                  {filteredPlaces.length}/{places.length}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">Di tích, tâm linh, ẩm thực & trải nghiệm</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100/90 text-slate-600 hover:bg-slate-200/90 transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs shadow-xs select-none ml-1"
            aria-label={collapsed ? "Mở rộng danh sách" : "Thu gọn danh sách"}
            title={collapsed ? "Mở rộng" : "Thu gọn"}
          >
            <span className="pointer-events-none select-none">{collapsed ? "▶" : "▼"}</span>
          </button>
        </div>

        {/* Tìm kiếm & Tab Lọc thể loại */}
        {!collapsed && (
          <div className="mt-3 space-y-2.5">
            {/* Ô tìm kiếm nhanh */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none select-none">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm Đại Nội, lăng tẩm, chùa, quán ăn..."
                className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2 pl-8 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer select-none"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Category Filter Pills */}
            <div className="relative group/cats">
              {/* Nút lướt sang trái */}
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

              {/* Danh sách Pills hỗ trợ cuộn chuột, kéo vuốt & chạm */}
              <div
                ref={catScrollRef}
                {...catDragProps}
                className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none cursor-grab active:cursor-grabbing touch-pan-x overscroll-x-contain"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (hasCatDraggedRef.current) return;
                    setSelectedCategory("all");
                  }}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer select-none ${
                    selectedCategory === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span className="pointer-events-none select-none">Tất cả</span>
                </button>
                {isMounted && userContributedPlaces.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (hasCatDraggedRef.current) return;
                      setSelectedCategory(selectedCategory === "my_places" ? "all" : "my_places");
                    }}
                    className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer select-none ${
                      selectedCategory === "my_places"
                        ? "bg-amber-500 text-white shadow-xs ring-1 ring-amber-400/40"
                        : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    <span className="pointer-events-none select-none">📍</span>
                    <span className="pointer-events-none select-none">Đã thêm ({userContributedPlaces.length})</span>
                  </button>
                )}
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        if (hasCatDraggedRef.current) return;
                        setSelectedCategory(active ? "all" : cat.id);
                      }}
                      className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer select-none ${
                        active
                          ? "bg-brand-600 text-white shadow-xs ring-1 ring-brand-500/30"
                          : "bg-slate-100/80 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span className="pointer-events-none select-none">{cat.emoji}</span>
                      <span className="pointer-events-none select-none">{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Nút lướt sang phải */}
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
        )}
      </div>

      {/* Danh sách địa điểm & Phân trang */}
      {!collapsed && (
        <div className="glass-strong flex-1 flex flex-col min-h-0 rounded-3xl border border-white/70 shadow-2xl backdrop-blur-xl transition-all duration-300 overflow-hidden">
          {filteredPlaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center my-auto">
              <span className="text-3xl mb-2">🔍</span>
              <p className="text-xs font-bold text-slate-800">Không tìm thấy địa điểm phù hợp</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Thử đổi từ khóa hoặc chọn mục khác</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="mt-3 rounded-xl bg-brand-50 border border-brand-200 px-3.5 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 cursor-pointer transition active:scale-95"
              >
                Xem tất cả {places.length} địa điểm
              </button>
            </div>
          ) : (
            <>
              {/* Vùng danh sách có thể cuộn độc lập */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <ul className="flex flex-col gap-2.5">
                  {pagedPlaces.map((place) => {
                    const cat = getCategory(place.category);
                    const active = selectedId === place.id;
                    const thumbnail = place.images?.[0] || place.imageUrl || place.image_url;

                    return (
                      <li key={place.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(place)}
                          className={`group relative flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all duration-200 cursor-pointer border select-none ${
                            active
                              ? "bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-700 text-white shadow-xl shadow-brand-600/30 border-transparent scale-[1.01]"
                              : "bg-white/85 hover:bg-white border-slate-200/80 hover:border-brand-300 hover:shadow-lg hover:-translate-y-0.5 text-slate-800"
                          }`}
                        >
                          {/* Thumbnail có fallback an toàn */}
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100 shadow-inner pointer-events-none select-none">
                            <PlaceThumbnail
                              src={thumbnail}
                              alt={place.name}
                              categoryColor={cat.color}
                              categoryEmoji={cat.emoji}
                            />

                            {/* Category Badge nhỏ góc dưới ảnh */}
                            <span
                              className="absolute bottom-1 right-1 flex h-4.5 w-4.5 items-center justify-center rounded-lg text-[10px] text-white shadow-sm"
                              style={{ backgroundColor: cat.color }}
                              title={cat.label}
                            >
                              {cat.emoji}
                            </span>
                          </div>

                          {/* Thông tin chính */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`block truncate text-xs font-extrabold tracking-tight ${
                                  active ? "text-white" : "text-slate-900 group-hover:text-brand-700"
                                }`}
                              >
                                {place.name}
                              </span>
                              {place.status === "pending" && (
                                <span className="rounded-md px-1.5 py-0.5 text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                  ⏳ Chờ duyệt
                                </span>
                              )}
                              {place.status === "approved" && userContributedSet.has(place.id) && (
                                <span className="rounded-md px-1.5 py-0.5 text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                  ✅ Đã duyệt
                                </span>
                              )}
                              {place.status === "rejected" && (
                                <span className="rounded-md px-1.5 py-0.5 text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                                  ❌ Từ chối
                                </span>
                              )}
                            </div>

                            {/* Thể loại & Bản địa */}
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                              <span className={active ? "text-white/85" : "text-slate-500 font-medium"}>
                                {cat.label}
                              </span>
                              {place.isLocal && (
                                <span
                                  className={`rounded-md px-1.5 py-0.2 text-[9px] font-bold ${
                                    active
                                      ? "bg-emerald-400/30 text-emerald-100 border border-emerald-300/30"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}
                                >
                                  🌿 Bản địa
                                </span>
                              )}
                            </div>

                            {/* Rating & Giá vé */}
                            <div className="mt-1.5 flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <span
                                  className={`inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${
                                    active
                                      ? "bg-white/20 text-amber-200 backdrop-blur-sm"
                                      : "bg-amber-50 text-amber-700 border border-amber-200/60"
                                  }`}
                                >
                                  ★ {place.rating > 0 ? place.rating.toFixed(1) : "5.0"}
                                </span>
                              </div>

                              {typeof place.price === "number" && (
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-2xs ${
                                    place.price === 0
                                      ? active
                                        ? "bg-emerald-400/25 text-emerald-100 border border-emerald-300/30"
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                                      : active
                                      ? "bg-white/20 text-white border border-white/20"
                                      : "bg-indigo-50 text-indigo-700 border border-indigo-200/70"
                                  }`}
                                >
                                  {place.price === 0
                                    ? "Miễn phí"
                                    : `${(place.price / 1000).toLocaleString("vi-VN")}k`}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Mũi tên chỉ báo */}
                          <span
                            className={`text-sm transition-transform duration-200 ${
                              active
                                ? "text-white translate-x-1"
                                : "text-slate-300 group-hover:text-brand-500 group-hover:translate-x-1"
                            }`}
                          >
                            ›
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Thanh phân trang cố định ở đáy, không bị cuộn */}
              {totalPages > 1 && (
                <div className="shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-3 py-2.5 flex items-center justify-between text-xs select-none rounded-b-3xl">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-bold disabled:opacity-35 transition cursor-pointer active:scale-95 shadow-2xs"
                  >
                    ‹ Trước
                  </button>

                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                    <span>Trang</span>
                    <span className="rounded-lg bg-brand-50 px-2 py-0.5 font-black text-brand-700 border border-brand-200/60 shadow-2xs">
                      {currentPage} / {totalPages}
                    </span>
                    <span className="text-slate-400">({filteredPlaces.length})</span>
                  </div>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-bold disabled:opacity-35 transition cursor-pointer active:scale-95 shadow-2xs"
                  >
                    Tiếp ›
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
