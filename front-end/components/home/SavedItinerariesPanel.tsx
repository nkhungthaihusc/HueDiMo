"use client";

import { useState, useMemo, useEffect } from "react";
import type { SavedItinerary } from "@/lib/itinerary/logic";
import { deleteItinerary, getItineraries, renameItinerary, updateItineraryId, getItinerarySignature } from "@/lib/itinerary/logic";
import { formatDateVN, formatVND } from "@/lib/format";
import { ItineraryAPI } from "@/lib/api/itineraries";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/components/auth/AuthProvider";

interface SavedItinerariesPanelProps {
  onClose: () => void;
  onCreate: () => void;
  onCreateAi?: () => void;
  onOpen: (itinerary: SavedItinerary) => void;
  onExploreCommunity?: () => void;
}

export default function SavedItinerariesPanel({
  onClose,
  onCreate,
  onCreateAi,
  onOpen,
  onExploreCommunity,
}: SavedItinerariesPanelProps) {
  const { user } = useAuth();
  const [list, setList] = useState<SavedItinerary[]>(() => getItineraries());
  const [activeFilter, setActiveFilter] = useState<"all" | "ai" | "public">("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Khi user thay đổi hoặc đăng xuất, load lại danh sách theo user hiện tại
  useEffect(() => {
    setList(getItineraries());
  }, [user?.id]);

  // Đồng bộ thêm danh sách lịch trình từ Cloud nếu user đã đăng nhập
  useEffect(() => {
    if (!user) {
      setList(getItineraries());
      return;
    }
    let isMounted = true;
    ItineraryAPI.getMyItineraries()
      .then((serverList) => {
        if (!isMounted) return;
        setList((localList) => {
          const merged = [...localList];
          for (const s of serverList) {
            const serverSig = getItinerarySignature(s);
            // Tìm mục trùng ID hoặc trùng Signature nội dung
            const idx = merged.findIndex((m) => m.id === s.id || getItinerarySignature(m) === serverSig);
            if (idx >= 0) {
              merged[idx] = {
                ...merged[idx],
                id: s.id || merged[idx].id,
                title: s.title || merged[idx].title,
                isPublic: s.isPublic,
                likesCount: s.likesCount,
                commentsCount: s.commentsCount,
                viewsCount: s.viewsCount,
                userId: s.userId || user.id,
              };
            } else {
              merged.push({
                ...s,
                id: s.id || `cloud-${Date.now()}`,
                title: s.title || `Lộ trình ${s.days.length} ngày`,
                createdAt: s.createdAt || new Date().toISOString(),
                updatedAt: s.updatedAt || new Date().toISOString(),
                userId: s.userId || user.id,
              });
            }
          }

          // Lọc triệt để trùng lặp cả về ID lẫn Signature
          const seenIds = new Set<string>();
          const seenSigs = new Set<string>();
          const deduplicated = merged.filter((item) => {
            const sig = getItinerarySignature(item);
            if (seenIds.has(item.id) || seenSigs.has(sig)) return false;
            seenIds.add(item.id);
            seenSigs.add(sig);
            return true;
          });

          return deduplicated;
        });
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleRename = (id: string) => {
    if (!renameValue.trim()) return;
    setList(renameItinerary(id, renameValue.trim()));
    setRenamingId(null);
    setRenameValue("");
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    // Xóa khỏi local storage
    setList(deleteItinerary(id));
    setConfirmDeleteId(null);

    // Nếu là ID từ server (UUID > 20 ký tự), đồng bộ xóa trên server
    if (user && id.length > 20) {
      try {
        await ItineraryAPI.deleteItinerary(id);
        toast.success("Đã xóa lịch trình thành công.");
      } catch (err) {
        console.error("Lỗi khi xóa lịch trình trên server:", err);
      }
    }
  };

  const handleTogglePublish = async (it: SavedItinerary) => {
    if (!user) {
      toast.info("Vui lòng đăng nhập tài khoản để chia sẻ lịch trình lên cộng đồng.");
      return;
    }

    try {
      setPublishingId(it.id);
      const nextPublic = !it.isPublic;

      // 1. Lưu/đồng bộ lên server trước
      const serverRes = await ItineraryAPI.saveToServer(it, it.title, nextPublic);

      // 2. Cập nhật ID từ local thành ID của server và đồng bộ local storage
      const updatedSaved: SavedItinerary = {
        ...serverRes,
        id: serverRes.id || it.id,
        title: it.title || serverRes.title || `Lộ trình ${serverRes.days.length} ngày`,
        createdAt: it.createdAt || serverRes.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublic: nextPublic,
      };

      const updatedList = updateItineraryId(it.id, updatedSaved);
      setList(updatedList);

      if (nextPublic) {
        toast.success("Đã công khai lịch trình lên Cộng đồng HueDiMo!");
      } else {
        toast.info("Đã chuyển lịch trình về chế độ riêng tư.");
      }
    } catch (err: any) {
      toast.error(err.message || "Không thể cập nhật trạng thái công khai.");
    } finally {
      setPublishingId(null);
    }
  };

  const aiCount = useMemo(() => list.filter((it) => it.isAiGenerated).length, [list]);
  const publicCount = useMemo(() => list.filter((it) => it.isPublic).length, [list]);

  const displayedList = useMemo(() => {
    if (activeFilter === "ai") {
      return list.filter((it) => it.isAiGenerated);
    }
    if (activeFilter === "public") {
      return list.filter((it) => it.isPublic);
    }
    return list;
  }, [list, activeFilter]);

  return (
    <div className="pointer-events-auto flex h-full w-full max-w-[calc(100vw-1rem)] sm:w-[440px] sm:max-w-[440px] flex-col overflow-hidden rounded-3xl bg-white/95 border border-slate-200/80 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-right-4">
      {/* Header */}
      <div className="border-b border-slate-100 px-3.5 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 sm:h-9 w-8 sm:w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition active:scale-95 cursor-pointer select-none shadow-xs"
              aria-label="Quay lại"
              title="Quay lại"
            >
              <span className="text-base leading-none pointer-events-none select-none">←</span>
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">Lịch sử Lộ trình</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                {list.length} kế hoạch du lịch cá nhân
              </p>
            </div>
          </div>

          {onExploreCommunity && (
            <button
              type="button"
              onClick={onExploreCommunity}
              className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200/80 px-2.5 py-1.5 text-xs font-bold text-indigo-700 transition cursor-pointer shadow-xs"
              title="Khám phá lịch trình du lịch từ cộng đồng"
            >
              <span>🌍</span>
              <span className="hidden sm:inline">Cộng đồng</span>
            </button>
          )}
        </div>

        {/* Tab lọc: Tất cả / Lịch trình AI / Đã công khai */}
        {list.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-slate-100/80 p-1 border border-slate-200/50 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`flex-1 rounded-lg py-1 text-center font-bold transition cursor-pointer ${
                activeFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Tất cả ({list.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("ai")}
              className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1 text-center font-bold transition cursor-pointer ${
                activeFilter === "ai"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-indigo-600 hover:text-indigo-800"
              }`}
            >
              <span>✨ AI</span>
              <span>({aiCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("public")}
              className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1 text-center font-bold transition cursor-pointer ${
                activeFilter === "public"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-emerald-700 hover:text-emerald-900"
              }`}
            >
              <span>🌍 Public</span>
              <span>({publicCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* Danh sách lịch trình */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
        {displayedList.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600 mb-3">
              ✨
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {activeFilter === "ai"
                ? "Chưa có lịch trình AI nào"
                : activeFilter === "public"
                ? "Chưa có lịch trình nào được công khai"
                : "Chưa có lộ trình nào"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {activeFilter === "public"
                ? "Bạn có thể bấm nút 'Công khai' trên bất kỳ lịch trình nào để chia sẻ cho mọi người cùng tham khảo!"
                : "Hãy dùng AI để thiết kế lộ trình tự động hoặc tự tạo một chuyến đi theo sở thích của riêng bạn!"}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {onCreateAi && (
                <button
                  type="button"
                  onClick={onCreateAi}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition active:scale-95 cursor-pointer"
                >
                  <span>✨</span>
                  <span>Thiết kế Lộ trình AI ngay</span>
                </button>
              )}
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition active:scale-95 cursor-pointer"
              >
                <span>+</span>
                <span>Tạo lịch trình thủ công</span>
              </button>
            </div>
          </div>
        )}

        {displayedList.map((it) => {
          const totalPlaces = it.days.reduce((acc, d) => acc + d.places.length, 0);
          const isRenaming = renamingId === it.id;
          const isDeleting = confirmDeleteId === it.id;
          const isPublishing = publishingId === it.id;

          return (
            <div
              key={it.id}
              className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {/* Badges tag */}
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    {it.isPublic ? (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                        <span>🌍</span> Công khai
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        🔒 Riêng tư
                      </span>
                    )}

                    {it.isAiGenerated && (
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60">
                        ✨ AI tạo
                      </span>
                    )}

                    {it.groupSize && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        👥 {it.groupSize} người
                      </span>
                    )}

                    {it.transportMode && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                        {it.transportMode === "motorbike"
                          ? "🛵 Xe máy"
                          : it.transportMode === "car"
                          ? "🚗 Ô tô"
                          : it.transportMode === "bicycle"
                          ? "🚲 Xe đạp"
                          : "🚶 Đi bộ"}
                      </span>
                    )}
                  </div>

                  {isRenaming ? (
                    <div className="flex items-center gap-1.5 mb-1">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        placeholder="Tên lộ trình..."
                        className="flex-1 rounded-lg border border-indigo-400 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleRename(it.id)}
                        className="rounded-lg bg-indigo-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 cursor-pointer"
                      >
                        Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200 cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {it.title || `Lộ trình ${it.days.length} ngày`}
                    </h3>
                  )}

                  {/* Chi phí & ngày */}
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{it.days.length} ngày</span>
                    <span>·</span>
                    <span>{totalPlaces} địa điểm</span>
                    <span>·</span>
                    <span className="font-bold text-indigo-700">{formatVND(it.totalEstimatedCost)}</span>
                  </div>

                  {/* Tương tác stats nếu đã public */}
                  {it.isPublic && (
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 text-rose-600 font-semibold">
                        <span>❤️</span> {it.likesCount || 0}
                      </span>
                      <span className="flex items-center gap-1 text-indigo-600 font-semibold">
                        <span>💬</span> {it.commentsCount || 0}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <span>👁️</span> {it.viewsCount || 0}
                      </span>
                    </div>
                  )}

                  {/* Ghi chú du khách nếu có */}
                  {it.notes && (
                    <div className="mt-1.5 rounded-lg bg-slate-50 p-1.5 text-[10px] text-slate-600 border border-slate-100 line-clamp-2">
                      <span className="font-semibold text-slate-700">📝 Ghi chú: </span>
                      <span>{it.notes}</span>
                    </div>
                  )}

                  <div className="mt-1 text-[10px] text-slate-400">
                    Lưu ngày {it.createdAt ? new Date(it.createdAt).toLocaleDateString("vi-VN") : "Gần đây"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(it.id)}
                  className={`rounded-lg p-1.5 transition text-xs cursor-pointer ${
                    isDeleting
                      ? "bg-rose-600 text-white font-bold"
                      : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  }`}
                  title={isDeleting ? "Bấm lại để xác nhận xóa" : "Xóa lộ trình"}
                >
                  {isDeleting ? "Xóa?" : "🗑️"}
                </button>
              </div>

              {/* Actions */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(it.id);
                      setRenameValue(it.title || "");
                    }}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    ✏️ Đổi tên
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePublish(it)}
                    disabled={isPublishing}
                    className={`text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                      it.isPublic
                        ? "text-slate-500 hover:text-slate-700"
                        : "text-emerald-700 hover:text-emerald-800"
                    }`}
                    title={it.isPublic ? "Ẩn khỏi cộng đồng" : "Chia sẻ cho cộng đồng cùng tham khảo"}
                  >
                    <span>{it.isPublic ? "🔒 Thu hồi" : "🌍 Chia sẻ"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onOpen(it)}
                  className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-600 active:scale-95 transition cursor-pointer"
                >
                  Mở chi tiết →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Create New */}
      <div className="border-t border-slate-100 p-4 bg-slate-50/80 flex items-center gap-2">
        {onCreateAi && (
          <button
            type="button"
            onClick={onCreateAi}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 py-2.5 px-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
          >
            <span>✨</span>
            <span>Hỏi AI lịch trình</span>
          </button>
        )}
        <button
          type="button"
          onClick={onCreate}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
        >
          <span>+</span>
          <span>Tạo thủ công</span>
        </button>
      </div>
    </div>
  );
}