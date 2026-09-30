"use client";

import { useEffect, useState } from "react";
import { AdminAPI } from "@/lib/api/admin";
import { formatVND } from "@/lib/format";
import { toast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function AdminItinerariesPage() {
  const [activeTab, setActiveTab] = useState<"itineraries" | "comments">("itineraries");

  // Itineraries State
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [totalItineraries, setTotalItineraries] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [search, setSearch] = useState("");
  const [filterPublic, setFilterPublic] = useState<string>("");
  const [isLoadingItineraries, setIsLoadingItineraries] = useState(true);

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [commentPage, setCommentPage] = useState(1);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Dialog State
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: "itinerary" | "comment";
    id: string;
    title: string;
  }>({ isOpen: false, type: "itinerary", id: "", title: "" });
  const [isDeleting, setIsDeleting] = useState(false);

  const loadItineraries = async () => {
    try {
      setIsLoadingItineraries(true);
      const res = await AdminAPI.getItineraries({
        q: search.trim() || undefined,
        isPublic: filterPublic === "" ? undefined : filterPublic === "true",
        page,
        limit,
      });
      setItineraries(res.items);
      setTotalItineraries(res.pagination.total);
    } catch (err: any) {
      toast.error(err.message || "Không thể nạp danh sách lộ trình.");
    } finally {
      setIsLoadingItineraries(false);
    }
  };

  const loadComments = async () => {
    try {
      setIsLoadingComments(true);
      const res = await AdminAPI.getItineraryComments({
        page: commentPage,
        limit: 15,
      });
      setComments(res.items);
      setTotalComments(res.pagination.total);
    } catch (err: any) {
      toast.error(err.message || "Không thể nạp danh sách đánh giá lộ trình.");
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    if (activeTab === "itineraries") {
      loadItineraries();
    } else {
      loadComments();
    }
  }, [activeTab, page, filterPublic, commentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadItineraries();
  };

  const handleToggleVisibility = async (it: any) => {
    const nextState = !it.is_public;
    try {
      await AdminAPI.toggleItineraryVisibility(it.id, nextState);
      setItineraries((prev) =>
        prev.map((item) => (item.id === it.id ? { ...item, is_public: nextState } : item))
      );
      toast.success(
        nextState
          ? "Đã cho phép lộ trình công khai lên cộng đồng."
          : "Đã ẩn lộ trình khỏi cộng đồng (chuyển về riêng tư)."
      );
    } catch (err: any) {
      toast.error(err.message || "Không thể cập nhật trạng thái hiển thị.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      setIsDeleting(true);
      if (deleteDialog.type === "itinerary") {
        await AdminAPI.deleteItinerary(deleteDialog.id);
        toast.success("Đã xóa lộ trình thành công.");
        loadItineraries();
      } else {
        await AdminAPI.deleteItineraryComment(deleteDialog.id);
        toast.success("Đã xóa nhận xét lộ trình thành công.");
        loadComments();
      }
      setDeleteDialog((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      toast.error(err.message || "Xóa thất bại.");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalItineraryPages = Math.ceil(totalItineraries / limit) || 1;
  const totalCommentPages = Math.ceil(totalComments / 15) || 1;

  return (
    <div className="flex flex-1 flex-col space-y-6 min-h-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Quản lý Lộ trình Du lịch</h1>
          <p className="text-sm text-slate-400">
            Kiểm duyệt lộ trình du lịch cộng đồng, quản lý chế độ công khai và đánh giá sao ({totalItineraries} lộ trình, {totalComments} đánh giá).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("itineraries")}
            className={`rounded-lg px-3.5 py-1.5 transition cursor-pointer ${
              activeTab === "itineraries"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🗺️ Danh sách Lộ trình ({totalItineraries})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className={`rounded-lg px-3.5 py-1.5 transition cursor-pointer ${
              activeTab === "comments"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ⭐ Đánh giá & Góp ý ({totalComments})
          </button>
        </div>
      </div>

      {activeTab === "itineraries" ? (
        <>
          {/* Controls: Tìm kiếm & Lọc */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl shrink-0">
            <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tiêu đề lộ trình, tên tác giả..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition cursor-pointer"
              >
                Tìm
              </button>
            </form>

            <div className="flex items-center gap-3">
              <select
                value={filterPublic}
                onChange={(e) => {
                  setFilterPublic(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="true">🌍 Công khai (Public)</option>
                <option value="false">🔒 Riêng tư (Private)</option>
              </select>

              {/* Phân trang */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Trang <b className="text-white">{page}</b>/{totalItineraryPages}</span>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 flex items-center justify-center font-bold cursor-pointer"
                >
                  ‹
                </button>
                <button
                  type="button"
                  disabled={page >= totalItineraryPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 flex items-center justify-center font-bold cursor-pointer"
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          {/* Grid Lộ trình */}
          <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
            {isLoadingItineraries ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                  <span className="text-xs">Đang tải danh sách lộ trình...</span>
                </div>
              </div>
            ) : itineraries.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                <div className="text-3xl mb-2">🗺️</div>
                <div className="text-sm font-semibold text-slate-400">Không tìm thấy lộ trình nào</div>
                <p className="text-xs text-slate-600 mt-1">Thử thay đổi từ khóa hoặc bộ lọc trạng thái</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {itineraries.map((it) => {
                  let daysCount = it.days_count || (Array.isArray(it.days) ? it.days.length : 1);
                  return (
                    <div
                      key={it.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm hover:border-slate-700 transition space-y-3"
                    >
                      <div>
                        {/* Header card: Tác giả & Tag trạng thái */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-xs font-bold text-white">
                              {it.author_name ? it.author_name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">
                                {it.author_name || "Chưa đặt tên"}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {it.author_email || ""}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {it.rating && (
                              <span className="flex items-center gap-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                ⭐ {Number(it.rating).toFixed(1)}
                              </span>
                            )}
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                it.is_public
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-slate-800 border-slate-700 text-slate-400"
                              }`}
                            >
                              {it.is_public ? "🌍 Công khai" : "🔒 Riêng tư"}
                            </span>
                          </div>
                        </div>

                        {/* Title & Summary */}
                        <h3 className="text-sm font-bold text-white line-clamp-1">
                          {it.title || "Lộ trình không tiêu đề"}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {it.summary || "Chưa có mô tả tóm tắt cho lịch trình này."}
                        </p>

                        {/* Chi tiết phụ */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-slate-300 font-medium">
                            ⏱️ {daysCount} ngày
                          </span>
                          <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-slate-300 font-medium">
                            💰 {formatVND(Number(it.total_estimated_cost || 0))}
                          </span>
                          <span>❤️ {it.likes_count || 0}</span>
                          <span>🔖 {it.bookmarks_count || 0}</span>
                          <span>💬 {it.comments_count || 0}</span>
                        </div>
                      </div>

                      {/* Actions footer */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(it)}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                            it.is_public
                              ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                              : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                          }`}
                        >
                          <span>{it.is_public ? "Ẩn khỏi cộng đồng" : "Cho phép công khai"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteDialog({
                              isOpen: true,
                              type: "itinerary",
                              id: it.id,
                              title: it.title || "lịch trình này",
                            })
                          }
                          className="flex items-center gap-1 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                        >
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Tab Comments & Ratings */
        <div className="flex flex-1 flex-col space-y-4 min-h-0">
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl shrink-0">
            <span className="text-xs text-slate-400">
              Tổng số nhận xét & đánh giá sao: <b className="text-white">{totalComments}</b>
            </span>

            {/* Phân trang comments */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Trang <b className="text-white">{commentPage}</b>/{totalCommentPages}</span>
              <button
                type="button"
                disabled={commentPage <= 1}
                onClick={() => setCommentPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 flex items-center justify-center font-bold cursor-pointer"
              >
                ‹
              </button>
              <button
                type="button"
                disabled={commentPage >= totalCommentPages}
                onClick={() => setCommentPage((p) => p + 1)}
                className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 flex items-center justify-center font-bold cursor-pointer"
              >
                ›
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
            {isLoadingComments ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                  <span className="text-xs">Đang tải danh sách đánh giá...</span>
                </div>
              </div>
            ) : comments.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                <div className="text-3xl mb-2">💬</div>
                <div className="text-sm font-semibold text-slate-400">Chưa có nhận xét hay đánh giá nào</div>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{c.user_name || "Du khách"}</span>
                        <span className="text-[11px] text-slate-400">({c.user_email || "user"})</span>
                        {c.rating && (
                          <span className="flex items-center text-xs text-amber-400 font-bold ml-1">
                            {"★".repeat(c.rating)}{"☆".repeat(5 - c.rating)} ({c.rating}/5 sao)
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {c.created_at ? new Date(c.created_at).toLocaleString("vi-VN") : ""}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                        {c.content}
                      </p>

                      <div className="text-[11px] text-purple-400 flex items-center gap-1">
                        <span>Lộ trình:</span>
                        <span className="font-semibold text-slate-200">
                          {c.itinerary_title || `ID: ${c.itinerary_id}`}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteDialog({
                          isOpen: true,
                          type: "comment",
                          id: c.id,
                          title: `đánh giá của "${c.user_name || "du khách"}"`,
                        })
                      }
                      className="self-end sm:self-center shrink-0 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                    >
                      Xóa nhận xét
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteDialog.isOpen}
        title={`Xác nhận xóa ${deleteDialog.type === "itinerary" ? "lộ trình" : "nhận xét"}`}
        message={`Bạn có chắc chắn muốn xóa ${deleteDialog.title}? Thao tác này không thể hoàn tác.`}
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
