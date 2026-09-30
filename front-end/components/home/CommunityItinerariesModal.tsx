"use client";

import { useState, useEffect, useMemo } from "react";
import type { Itinerary } from "@/lib/itinerary/types";
import type { Place } from "@/lib/types";
import { formatVND } from "@/lib/format";
import { ItineraryAPI } from "@/lib/api/itineraries";
import { saveItinerary } from "@/lib/itinerary/logic";
import { useAuth } from "@/components/auth/AuthProvider";
import AuthPromptModal from "@/components/auth/AuthPromptModal";
import { toast } from "@/components/ui/Toast";

interface CommunityItinerariesModalProps {
  isOpen: boolean;
  places?: Place[];
  onClose: () => void;
  onUseItinerary: (itinerary: Itinerary) => void;
  onSelectPlace?: (placeId: string) => void;
}

export default function CommunityItinerariesModal({
  isOpen,
  places = [],
  onClose,
  onUseItinerary,
  onSelectPlace,
}: CommunityItinerariesModalProps) {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [list, setList] = useState<Itinerary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [daysFilter, setDaysFilter] = useState<number | undefined>(undefined);
  const [transportFilter, setTransportFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "most_liked" | "most_viewed" | "highest_rated">("newest");
  const [forkingId, setForkingId] = useState<string | null>(null);

  const placeMap = useMemo(() => {
    const map = new Map<string, Place>();
    for (const p of places) {
      map.set(p.id, p);
    }
    return map;
  }, [places]);

  const resolvePlaceName = (placeId: string, customName?: string): string => {
    if (customName && customName.trim()) return customName;
    const found = placeMap.get(placeId);
    if (found) return found.name;
    // Format slug id như 'lang-gia-long-thien-tho' -> 'Lăng Gia Long...'
    return placeId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const fetchCommunity = async () => {
    try {
      setIsLoading(true);
      const res = await ItineraryAPI.getCommunity({
        search: search.trim() || undefined,
        daysCount: daysFilter,
        transportMode: transportFilter || undefined,
        sort: sortBy,
        limit: 30,
      });
      setList(res.items);
    } catch (err: any) {
      toast.error(err.message || "Không thể tải danh sách lộ trình cộng đồng.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCommunity();
    }
  }, [isOpen, daysFilter, transportFilter, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCommunity();
  };

  const handleToggleLike = async (it: Itinerary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!it.id) return;

    try {
      const res = await ItineraryAPI.toggleReaction(it.id);
      setList((prev) =>
        prev.map((item) =>
          item.id === it.id
            ? { ...item, isLiked: res.isLiked, likesCount: res.likesCount }
            : item
        )
      );
    } catch (err: any) {
      toast.error(err.message || "Không thể thả tim.");
    }
  };

  const handleToggleBookmark = async (it: Itinerary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!it.id) return;

    try {
      const res = await ItineraryAPI.toggleBookmark(it.id);
      setList((prev) =>
        prev.map((item) =>
          item.id === it.id
            ? { ...item, isBookmarked: res.isBookmarked, bookmarksCount: res.bookmarksCount }
            : item
        )
      );
      toast.success(res.isBookmarked ? "Đã lưu vào bộ sưu tập!" : "Đã bỏ lưu.");
    } catch (err: any) {
      toast.error(err.message || "Không thể lưu.");
    }
  };

  const handleFork = async (it: Itinerary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!it.id) return;

    try {
      setForkingId(it.id);
      const res = await ItineraryAPI.forkItinerary(it.id);
      // Lưu ngay vào danh sách lịch trình cá nhân của người dùng hiện tại
      saveItinerary({
        ...res.itinerary,
        userId: user.id,
      });
      toast.success(res.message || "Đã nạp lộ trình vào kế hoạch cá nhân của bạn!");
      onUseItinerary(res.itinerary);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Không thể nạp lộ trình.");
    } finally {
      setForkingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
        <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/80">
          {/* Header */}
          <div className="border-b border-slate-100 p-4 sm:p-6 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-purple-50/20">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-xl text-white shadow-md shadow-indigo-600/20">
                  🌍
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-black tracking-tight text-slate-900">
                    Lộ Trình Du Lịch Cộng Đồng
                  </h2>
                  <p className="text-xs text-slate-500">
                    Khám phá kinh nghiệm và lịch trình thực tế được chia sẻ bởi các du khách tại Huế
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Filter and Search controls */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {/* Search input */}
              <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[220px]">
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm kiếm cung đường, địa điểm, từ khóa..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    🔍
                  </span>
                </div>
              </form>

              {/* Day filter */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1 text-[11px] font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => setDaysFilter(undefined)}
                  className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                    daysFilter === undefined ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setDaysFilter(1)}
                  className={`rounded-lg px-2 py-1 transition cursor-pointer ${
                    daysFilter === 1 ? "bg-white text-indigo-700 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  1 ngày
                </button>
                <button
                  type="button"
                  onClick={() => setDaysFilter(2)}
                  className={`rounded-lg px-2 py-1 transition cursor-pointer ${
                    daysFilter === 2 ? "bg-white text-indigo-700 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  2 ngày
                </button>
                <button
                  type="button"
                  onClick={() => setDaysFilter(3)}
                  className={`rounded-lg px-2 py-1 transition cursor-pointer ${
                    daysFilter === 3 ? "bg-white text-indigo-700 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  3 ngày
                </button>
                <button
                  type="button"
                  onClick={() => setDaysFilter(4)}
                  className={`rounded-lg px-2 py-1 transition cursor-pointer ${
                    daysFilter === 4 ? "bg-white text-indigo-700 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  4+ ngày
                </button>
              </div>

              {/* Sort by */}
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="newest">✨ Mới nhất</option>
                <option value="highest_rated">⭐ Đánh giá cao nhất</option>
                <option value="most_liked">❤️ Được yêu thích nhất</option>
                <option value="most_viewed">👁️ Xem nhiều nhất</option>
              </select>
            </div>
          </div>

          {/* Grid Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 [scrollbar-width:thin]">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  <span className="text-xs">Đang tải lịch trình cộng đồng...</span>
                </div>
              </div>
            ) : list.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600 mb-3">
                  🗺️
                </div>
                <h3 className="text-sm font-bold text-slate-800">Chưa tìm thấy lịch trình phù hợp</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Hãy thử xóa bộ lọc tìm kiếm hoặc là người đầu tiên chia sẻ lịch trình du lịch Huế của bạn cho mọi người!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {list.map((it) => {
                  const totalPlaces = it.days.reduce((acc, d) => acc + d.places.length, 0);
                  const isForking = forkingId === it.id;

                  return (
                    <div
                      key={it.id}
                      onClick={() => {
                        onUseItinerary(it);
                        onClose();
                      }}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-indigo-400 hover:shadow-md transition cursor-pointer"
                    >
                      <div>
                        {/* Author info & tag */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-xs font-bold text-white shadow-xs">
                              {it.authorName ? it.authorName.charAt(0).toUpperCase() : "H"}
                            </div>
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {it.authorName || "Du khách Huế"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {it.rating !== undefined && it.rating !== null && (
                              <span className="flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/50">
                                <span>⭐</span>
                                <span>{Number(it.rating).toFixed(1)}</span>
                              </span>
                            )}
                            {it.transportMode && (
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-medium">
                                {it.transportMode === "motorbike"
                                  ? "🛵 Xe máy"
                                  : it.transportMode === "car"
                                  ? "🚗 Ô tô"
                                  : it.transportMode === "bicycle"
                                  ? "🚲 Xe đạp"
                                  : "🚶 Đi bộ"}
                              </span>
                            )}
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                              {it.days.length} ngày
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition line-clamp-1">
                          {it.title || `Lộ trình ${it.days.length} ngày`}
                        </h3>

                        {/* Summary */}
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {it.summary}
                        </p>

                        {/* Key Places snippet */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {it.days
                            .flatMap((d) => d.places)
                            .slice(0, 3)
                            .map((p, idx) => (
                              <span
                                key={idx}
                                className="rounded-md bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 truncate max-w-[170px]"
                                title={resolvePlaceName(p.placeId, p.customName)}
                              >
                                📍 {resolvePlaceName(p.placeId, p.customName)}
                              </span>
                            ))}
                          {totalPlaces > 3 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{totalPlaces - 3} điểm khác
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer: cost, social stats & actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Chi phí dự kiến</div>
                          <div className="text-xs font-black text-indigo-700">
                            {formatVND(it.totalEstimatedCost)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Like */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleLike(it, e)}
                            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition cursor-pointer ${
                              it.isLiked
                                ? "bg-rose-50 text-rose-600 border border-rose-200"
                                : "text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            <span>{it.isLiked ? "❤️" : "🤍"}</span>
                            <span>{it.likesCount || 0}</span>
                          </button>

                          {/* Bookmark */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleBookmark(it, e)}
                            className={`rounded-lg p-1 text-xs transition cursor-pointer ${
                              it.isBookmarked
                                ? "bg-amber-50 text-amber-600 border border-amber-200"
                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            }`}
                            title="Lưu lại"
                          >
                            <span>{it.isBookmarked ? "🔖" : "🏷️"}</span>
                          </button>

                          {/* Fork / Use Route Button */}
                          <button
                            type="button"
                            onClick={(e) => handleFork(it, e)}
                            disabled={isForking}
                            className="flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer ml-1"
                            title="Nạp toàn bộ điểm dừng này lên bản đồ của bạn"
                          >
                            <span>🚀</span>
                            <span>Sử dụng</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AuthPromptModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title="Đăng nhập để tương tác cộng đồng"
        description="Vui lòng đăng nhập tài khoản HueDiMo để thả tim, lưu trữ và sao chép lộ trình du lịch cộng đồng vào tài khoản của bạn."
        icon="🌍"
      />
    </>
  );
}
