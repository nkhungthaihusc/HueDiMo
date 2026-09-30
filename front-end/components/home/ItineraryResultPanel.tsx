"use client";

import { useState, useMemo, useEffect } from "react";
import type { Itinerary } from "@/lib/itinerary/types";
import {
  getTransportOption,
  calculateDistanceKm,
  calculateRouteDistanceKm,
  calculateTravelTimeMinutes,
  formatTravelTime,
} from "@/lib/itinerary/types";
import { itineraryPlaceIds, saveItinerary, updateItineraryId } from "@/lib/itinerary/logic";
import { formatVND, formatDateVN } from "@/lib/format";
import { getCategory } from "@/lib/data/categories";
import type { Place } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import AuthPromptModal from "@/components/auth/AuthPromptModal";
import { toast } from "@/components/ui/Toast";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { ItineraryAPI, type ItineraryComment } from "@/lib/api/itineraries";

interface ItineraryResultPanelProps {
  itinerary: Itinerary;
  places: Place[];
  onBack: () => void;
  onShowOnMap: () => void;
  onSelectPlace: (placeId: string) => void;
  onEdit?: () => void;
  onOpenHistory?: () => void;
  onExploreCommunity?: () => void;
}

export default function ItineraryResultPanel({
  itinerary,
  places,
  onBack,
  onShowOnMap,
  onSelectPlace,
  onEdit,
  onOpenHistory,
  onExploreCommunity,
}: ItineraryResultPanelProps) {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authActionInfo, setAuthActionInfo] = useState<{ title: string; desc: string; icon: string }>({
    title: "Đăng nhập để tương tác",
    desc: "Bạn cần đăng nhập tài khoản HueDiMo để thực hiện thao tác này.",
    icon: "✨",
  });

  const [currentItinerary, setCurrentItinerary] = useState<Itinerary>(itinerary);
  const [isPublic, setIsPublic] = useState(Boolean(itinerary.isPublic));
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);

  // Social interactions
  const [likesCount, setLikesCount] = useState(itinerary.likesCount || 0);
  const [isLiked, setIsLiked] = useState(Boolean(itinerary.isLiked));
  const [isLiking, setIsLiking] = useState(false);

  const [bookmarksCount, setBookmarksCount] = useState(itinerary.bookmarksCount || 0);
  const [isBookmarked, setIsBookmarked] = useState(Boolean(itinerary.isBookmarked));
  const [isBookmarking, setIsBookmarking] = useState(false);

  // Comments & Reviews
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ItineraryComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const {
    containerRef: dayTabsScrollRef,
    canScrollLeft: canDayTabsScrollLeft,
    canScrollRight: canDayTabsScrollRight,
    scrollPrev: scrollDayTabsPrev,
    scrollNext: scrollDayTabsNext,
    dragProps: dayTabsDragProps,
  } = useHorizontalScroll<HTMLDivElement>({ scrollAmount: 140, wheelMultiplier: 1.1 });

  const placeById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const count = itineraryPlaceIds(currentItinerary).length;
  const transportOpt = getTransportOption(currentItinerary.transportMode);

  // Tải chi tiết bình luận và stats nếu có ID server
  useEffect(() => {
    setCurrentItinerary(itinerary);
    setIsPublic(Boolean(itinerary.isPublic));
    setLikesCount(itinerary.likesCount || 0);
    setIsLiked(Boolean(itinerary.isLiked));
    setBookmarksCount(itinerary.bookmarksCount || 0);
    setIsBookmarked(Boolean(itinerary.isBookmarked));

    if (itinerary.id && itinerary.id.length > 20) {
      ItineraryAPI.getComments(itinerary.id)
        .then((data) => setComments(data))
        .catch(() => {});
    }
  }, [itinerary]);

  const travelStats = useMemo(() => {
    let totalKm = 0;
    let totalMins = 0;
    for (const day of currentItinerary.days) {
      for (let i = 0; i < day.places.length - 1; i++) {
        const p1 = placeById.get(day.places[i].placeId);
        const p2 = placeById.get(day.places[i + 1].placeId);
        if (p1 && p2) {
          const dist = calculateRouteDistanceKm(p1.lat, p1.lng, p2.lat, p2.lng);
          const mins = calculateTravelTimeMinutes(dist, currentItinerary.transportMode);
          totalKm += dist;
          totalMins += mins;
        }
      }
    }
    return {
      totalKm: Math.round(totalKm * 10) / 10,
      totalMinutes: totalMins,
    };
  }, [currentItinerary, placeById]);

  const activeDay = currentItinerary.days[selectedDayIndex] || currentItinerary.days[0];

  const ensureSavedToServer = async (publicFlag: boolean) => {
    return await ItineraryAPI.saveToServer(
      currentItinerary,
      currentItinerary.title || `Lộ trình ${currentItinerary.days.length} ngày`,
      publicFlag
    );
  };

  const handleTogglePublic = async () => {
    if (!user) {
      setAuthActionInfo({
        title: "Đăng nhập để chia sẻ lịch trình",
        desc: "Bạn cần đăng nhập tài khoản HueDiMo để chia sẻ lịch trình lên cộng đồng du khách.",
        icon: "🌍",
      });
      setAuthModalOpen(true);
      return;
    }

    try {
      setIsTogglingPublic(true);
      const nextPublic = !isPublic;
      const oldId = currentItinerary.id || "";
      const serverRes = await ensureSavedToServer(nextPublic);
      setCurrentItinerary(serverRes);
      setIsPublic(nextPublic);

      // Cập nhật lại local storage, thay oldId bằng server ID
      if (oldId && oldId !== serverRes.id) {
        updateItineraryId(oldId, serverRes as any);
      } else {
        saveItinerary(serverRes);
      }

      if (nextPublic) {
        toast.success("Đã công khai lịch trình lên Cộng đồng HueDiMo!");
      } else {
        toast.info("Đã chuyển lịch trình về chế độ riêng tư.");
      }
    } catch (err: any) {
      toast.error(err.message || "Không thể cập nhật trạng thái công khai.");
    } finally {
      setIsTogglingPublic(false);
    }
  };

  const handleToggleLike = async () => {
    if (!user) {
      setAuthActionInfo({
        title: "Đăng nhập để thả tim",
        desc: "Vui lòng đăng nhập tài khoản để thả cảm xúc và lưu danh sách yêu thích.",
        icon: "❤️",
      });
      setAuthModalOpen(true);
      return;
    }

    try {
      setIsLiking(true);
      let targetId = currentItinerary.id;
      if (!targetId || targetId.length <= 20) {
        const saved = await ensureSavedToServer(isPublic);
        targetId = saved.id;
        setCurrentItinerary(saved);
      }

      if (targetId) {
        const res = await ItineraryAPI.toggleReaction(targetId);
        setIsLiked(res.isLiked);
        setLikesCount(res.likesCount);
      }
    } catch (err: any) {
      toast.error(err.message || "Không thể thả tim.");
    } finally {
      setIsLiking(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!user) {
      setAuthActionInfo({
        title: "Đăng nhập để đánh dấu lịch trình",
        desc: "Đăng nhập tài khoản giúp bạn đánh dấu các lịch trình yêu thích để xem lại bất kỳ lúc nào.",
        icon: "🔖",
      });
      setAuthModalOpen(true);
      return;
    }

    try {
      setIsBookmarking(true);
      let targetId = currentItinerary.id;
      if (!targetId || targetId.length <= 20) {
        const saved = await ensureSavedToServer(isPublic);
        targetId = saved.id;
        setCurrentItinerary(saved);
      }

      if (targetId) {
        const res = await ItineraryAPI.toggleBookmark(targetId);
        setIsBookmarked(res.isBookmarked);
        setBookmarksCount(res.bookmarksCount);
        toast.success(res.isBookmarked ? "Đã lưu vào danh sách đánh dấu!" : "Đã bỏ đánh dấu.");
      }
    } catch (err: any) {
      toast.error(err.message || "Không thể đánh dấu.");
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    if (!user) {
      setAuthActionInfo({
        title: "Đăng nhập để bình luận",
        desc: "Đăng nhập tài khoản để góp ý kiến và chia sẻ trải nghiệm với du khách khác.",
        icon: "💬",
      });
      setAuthModalOpen(true);
      return;
    }

    try {
      setIsSubmittingComment(true);
      let targetId = currentItinerary.id;
      if (!targetId || targetId.length <= 20) {
        const saved = await ensureSavedToServer(isPublic);
        targetId = saved.id;
        setCurrentItinerary(saved);
      }

      if (targetId) {
        const newC = await ItineraryAPI.addComment(targetId, commentInput.trim(), ratingInput);
        setComments((prev) => [...prev, newC]);
        setCommentInput("");
        // Cập nhật rating hiển thị của currentItinerary
        const ratedComments = [...comments, newC].filter((c) => c.rating && c.rating > 0);
        if (ratedComments.length > 0) {
          const avg = ratedComments.reduce((acc, c) => acc + (c.rating || 5), 0) / ratedComments.length;
          setCurrentItinerary((prev) => ({ ...prev, rating: Math.round(avg * 10) / 10 }));
        }
        toast.success("Đã gửi đánh giá thành công!");
      }
    } catch (err: any) {
      toast.error(err.message || "Không thể gửi đánh giá.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <>
      <div className="pointer-events-auto flex h-full w-full max-w-[calc(100vw-1rem)] sm:w-[440px] sm:max-w-[440px] flex-col overflow-hidden rounded-3xl bg-white/95 border border-slate-200/80 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-right-4">
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
                  {currentItinerary.title || "Kế hoạch Khám phá Huế"}
                </h2>
                {currentItinerary.isAiGenerated && (
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60">
                    ✨ AI
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                {currentItinerary.authorName ? `Tạo bởi ${currentItinerary.authorName}` : "Lịch trình tự động tối ưu hóa"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            {/* Nút Toggle Public */}
            <button
              type="button"
              onClick={handleTogglePublic}
              disabled={isTogglingPublic}
              className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition border cursor-pointer select-none disabled:opacity-50 ${
                isPublic
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300/80 hover:bg-emerald-100 shadow-xs"
                  : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
              }`}
              title={isPublic ? "Lịch trình đang công khai trên cộng đồng" : "Chia sẻ lịch trình lên cộng đồng"}
            >
              <span>{isPublic ? "🌍 Public" : "🔒 Private"}</span>
            </button>

            {onOpenHistory && (
              <button
                type="button"
                onClick={onOpenHistory}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title="Lịch sử chuyến đi"
              >
                🧳
              </button>
            )}
          </div>
        </div>

        {/* Nội dung chi tiết */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
          {/* Card tổng quan & dự toán ngân sách */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-4 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
                  <span>{transportOpt.emoji}</span>
                  <span>{transportOpt.label}</span>
                </span>

                {currentItinerary.groupSize && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/30 px-2.5 py-1 text-xs font-semibold backdrop-blur-md border border-indigo-400/30 text-indigo-100">
                    👥 {currentItinerary.groupSize} người
                  </span>
                )}

                {currentItinerary.rating !== undefined && currentItinerary.rating !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-bold backdrop-blur-md border border-amber-400/30 text-amber-200">
                    <span>⭐</span>
                    <span>{Number(currentItinerary.rating).toFixed(1)}</span>
                  </span>
                )}
              </div>

              <span className="text-xs font-medium text-slate-300">
                {currentItinerary.days.length} ngày · {count} điểm dừng
              </span>
            </div>

            <div className="mt-3">
              <div className="text-xs font-medium text-indigo-200">Dự toán tổng chi phí</div>
              <div className="text-2xl font-black tracking-tight text-white mt-0.5">
                {formatVND(currentItinerary.totalEstimatedCost)}
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-300 line-clamp-3 leading-relaxed">
              {currentItinerary.summary}
            </p>

            {currentItinerary.notes && (
              <div className="mt-3 rounded-xl bg-white/10 p-2.5 text-[11px] text-slate-200 border border-white/10">
                <span className="font-bold text-amber-300">📝 Ghi chú riêng: </span>
                <span>{currentItinerary.notes}</span>
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

          {/* Social Interaction Toolbar */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-200/80 p-2.5 shadow-xs">
            <div className="flex items-center gap-1.5">
              {/* Like / Heart */}
              <button
                type="button"
                onClick={handleToggleLike}
                disabled={isLiking}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer ${
                  isLiked
                    ? "bg-rose-50 text-rose-600 border border-rose-200 shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60"
                }`}
              >
                <span>{isLiked ? "❤️" : "🤍"}</span>
                <span>{likesCount}</span>
              </button>

              {/* Bookmark */}
              <button
                type="button"
                onClick={handleToggleBookmark}
                disabled={isBookmarking}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer ${
                  isBookmarked
                    ? "bg-amber-50 text-amber-700 border border-amber-200 shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60"
                }`}
                title="Lưu lại lịch trình này"
              >
                <span>{isBookmarked ? "🔖" : "🏷️"}</span>
                <span>{bookmarksCount}</span>
              </button>

              {/* Comments & Reviews Button */}
              <button
                type="button"
                onClick={() => setShowComments(!showComments)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer ${
                  showComments
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60"
                }`}
              >
                <span>⭐</span>
                <span>{comments.length} đánh giá</span>
              </button>
            </div>

            {/* Share / Copy Link */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Đã sao chép liên kết lịch trình!");
                }
              }}
              className="flex items-center gap-1 rounded-xl bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200/60 transition cursor-pointer"
              title="Sao chép liên kết chia sẻ"
            >
              <span>🔗</span>
            </button>
          </div>

          {/* Comment & Discussion Drawer */}
          {showComments && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>⭐</span> Đánh giá & Góp ý ({comments.length})
                </span>
                <span className="text-[10px] text-slate-500">Cộng đồng du khách</span>
              </div>

              {/* Comment list */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1 [scrollbar-width:thin]">
                {comments.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    Chưa có đánh giá nào. Hãy là người đầu tiên cho sao và chia sẻ cảm nhận về lộ trình này!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-xs text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{c.user_name || "Du khách"}</span>
                          {c.rating && c.rating > 0 && (
                            <span className="flex items-center text-[10px] text-amber-500 font-bold">
                              {"★".repeat(c.rating)}{"☆".repeat(5 - c.rating)}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString("vi-VN") : "Gần đây"}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed text-[11px]">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Form gửi đánh giá và nhận xét */}
              <form onSubmit={handleAddComment} className="space-y-2 pt-1 border-t border-indigo-100/60">
                {/* Chọn số sao rating */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">Đánh giá của bạn:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingInput(star)}
                        className={`text-base leading-none transition-transform hover:scale-125 cursor-pointer ${
                          star <= ratingInput ? "text-amber-400" : "text-slate-200"
                        }`}
                        title={`${star} sao`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="text-xs font-bold text-amber-600 ml-1">
                      {ratingInput} / 5
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Nhận xét cảm nhận, góp ý điểm dừng..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !commentInput.trim()}
                    className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isSubmittingComment ? "..." : "Gửi đánh giá"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Thanh chuyển ngày (Day Tabs) */}
          {currentItinerary.days.length > 1 && (
            <div className="relative group/daytabs">
              {canDayTabsScrollLeft && (
                <div className="absolute left-0 inset-y-0 flex items-center pr-2 pl-0 bg-gradient-to-r from-white via-white/95 to-transparent z-10 pointer-events-none">
                  <button
                    type="button"
                    onClick={scrollDayTabsPrev}
                    className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition cursor-pointer text-xs font-black"
                  >
                    ‹
                  </button>
                </div>
              )}

              <div
                ref={dayTabsScrollRef}
                {...dayTabsDragProps}
                className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none cursor-grab active:cursor-grabbing touch-pan-x"
              >
                {currentItinerary.days.map((day, idx) => {
                  const isActive = idx === selectedDayIndex;
                  return (
                    <button
                      key={day.date + idx}
                      type="button"
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`shrink-0 flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer select-none ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>Ngày {idx + 1}</span>
                      <span className="text-[10px] opacity-80">({day.places.length})</span>
                    </button>
                  );
                })}
              </div>

              {canDayTabsScrollRight && (
                <div className="absolute right-0 inset-y-0 flex items-center pl-2 pr-0 bg-gradient-to-l from-white via-white/95 to-transparent z-10 pointer-events-none">
                  <button
                    type="button"
                    onClick={scrollDayTabsNext}
                    className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition cursor-pointer text-xs font-black"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Danh sách địa điểm trong ngày được chọn */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>{activeDay?.title || `Ngày ${selectedDayIndex + 1}`}</span>
              <span>{activeDay?.places.length || 0} điểm dừng</span>
            </div>

            <div className="space-y-2.5">
              {activeDay?.places.map((entry, pIdx) => {
                const p = placeById.get(entry.placeId);
                const name = entry.customName || p?.name || "Địa điểm khám phá";
                const cat = p ? getCategory(p.category) : null;
                const note = entry.note || entry.reason || p?.description;

                return (
                  <div
                    key={entry.placeId + pIdx}
                    onClick={() => onSelectPlace(entry.placeId)}
                    className="group flex gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-indigo-400 hover:shadow-md transition cursor-pointer"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-black text-xs border border-indigo-200/60 mt-0.5">
                      {pIdx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
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
        title={authActionInfo.title}
        description={authActionInfo.desc}
        icon={authActionInfo.icon}
      />
    </>
  );
}