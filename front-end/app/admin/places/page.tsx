"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { AdminAPI } from "@/lib/api/admin";
import { uploadMedia } from "@/lib/api/media";
import { approvePlace, rejectPlace } from "@/lib/addplace/logic";
import { getReverseGeocode } from "@/lib/api/reverse-geocode";
import { toast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ImportPlacesModal from "@/components/admin/ImportPlacesModal";
import type { Place } from "@/lib/types";

const CATEGORIES = [
  { id: "ancient", label: "Di tích Cố đô" },
  { id: "spiritual", label: "Tâm linh & Chùa" },
  { id: "temple", label: "Đền đài Miếu mạo" },
  { id: "culture", label: "Văn hóa & Nghệ thuật" },
  { id: "cultural", label: "Không gian Di sản" },
  { id: "food", label: "Ẩm thực xứ Huế" },
  { id: "coffee", label: "Cà phê & Check-in" },
  { id: "hotel", label: "Khách sạn & Nghỉ dưỡng" },
  { id: "nature", label: "Thiên nhiên & Sinh thái" },
  { id: "beach", label: "Biển & Đầm phá" },
  { id: "craft_village", label: "Làng nghề truyền thống" },
  { id: "entertainment", label: "Vui chơi & Giải trí" },
  { id: "shopping", label: "Mua sắm & Chợ đặc sản" },
];

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Partial<Place> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeocodingAdmin, setIsGeocodingAdmin] = useState(false);
  const [formError, setFormError] = useState("");

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: "danger" | "warning" | "primary";
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    action: async () => { },
  });
  const [isConfirming, setIsConfirming] = useState(false);
  const placeFileInputRef = useRef<HTMLInputElement>(null);

  const loadPlaces = async () => {
    try {
      setIsLoading(true);
      const [res, statsRes] = await Promise.all([
        AdminAPI.getPlaces({
          page,
          limit,
          q: search,
          category: categoryFilter,
          status: statusFilter !== "all" ? statusFilter : undefined,
        }),
        AdminAPI.getStats().catch(() => null),
      ]);
      setPlaces(res.items);
      setTotal(res.pagination.total);
      if (statsRes?.overview?.pendingPlaces !== undefined) {
        setPendingCount(statsRes.overview.pendingPlaces);
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách địa điểm.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlaces();
  }, [page, categoryFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPlaces();
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const blob = await AdminAPI.exportPlacesCSV({
        q: search,
        category: categoryFilter,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `danh_sach_dia_diem_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Xuất danh sách địa điểm ra tệp CSV thành công!");
    } catch (err: any) {
      toast.error(err.message || "Xuất tệp CSV thất bại.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleApprove = async (id: string, name: string) => {
    try {
      await AdminAPI.updatePlaceStatus(id, "approved");
      approvePlace(id);
      loadPlaces();
      toast.success(`Đã phê duyệt địa điểm "${name}" thành công!`);
    } catch (err: any) {
      toast.error(err.message || `Phê duyệt địa điểm "${name}" thất bại.`);
    }
  };

  const handleReject = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Từ chối duyệt địa điểm",
      message: `Bạn có chắc chắn muốn từ chối địa điểm "${name}"? Địa điểm này sẽ không được đưa lên bản đồ công khai.`,
      confirmText: "Từ chối địa điểm",
      variant: "danger",
      action: async () => {
        try {
          setIsConfirming(true);
          await AdminAPI.updatePlaceStatus(id, "rejected");
          rejectPlace(id);
          loadPlaces();
          toast.success(`Đã từ chối địa điểm "${name}".`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          toast.error(err.message || `Từ chối địa điểm "${name}" thất bại.`);
        } finally {
          setIsConfirming(false);
        }
      },
    });
  };

  const handleOpenCreate = () => {
    setEditingPlace({
      name: "",
      category: "ancient" as any,
      lat: 16.4637,
      lng: 107.5907,
      address: "TP. Huế",
      price: 0,
      isLocal: false,
      status: "approved",
      openingHours: "07:30 - 17:30",
      description: "",
      imageUrl: "",
      rating: 4.5,
      bestTime: "Buổi sáng mát mẻ",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (place: Place) => {
    setEditingPlace({ ...place, status: place.status || "approved" });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Xác nhận xóa địa điểm",
      message: `Bạn có chắc chắn muốn xóa địa điểm "${name}"? Thao tác này không thể hoàn tác.`,
      confirmText: "Xóa vĩnh viễn",
      variant: "danger",
      action: async () => {
        try {
          setIsConfirming(true);
          await AdminAPI.deletePlace(id);
          loadPlaces();
          toast.success(`Đã xóa địa điểm "${name}" thành công.`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          toast.error(err.message || "Xóa địa điểm thất bại.");
        } finally {
          setIsConfirming(false);
        }
      },
    });
  };

  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlace) return;

    if (!editingPlace.name?.trim()) {
      setFormError("Vui lòng nhập tên địa điểm.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      if (editingPlace.id && places.some((p) => p.id === editingPlace.id)) {
        // Update
        await AdminAPI.updatePlace(editingPlace.id, editingPlace);
      } else {
        // Create
        await AdminAPI.createPlace(editingPlace);
      }

      setIsModalOpen(false);
      setEditingPlace(null);
      loadPlaces();
      toast.success("Lưu địa điểm thành công!");
    } catch (err: any) {
      setFormError(err.message || "Lưu địa điểm thất bại.");
      toast.error(err.message || "Lưu địa điểm thất bại.");
    } finally {
      setIsSaving(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="flex flex-1 flex-col space-y-6 min-h-0">
      {/* Header and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Quản lý Địa điểm Du lịch</h1>
          <p className="text-sm text-slate-400">
            Quản lý toàn bộ {total} địa điểm trên bản đồ và hệ thống gợi ý AI của HueDiMo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Nút Xuất CSV */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-semibold text-slate-200 shadow-sm transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
            title="Xuất toàn bộ hoặc danh sách địa điểm đang lọc ra file CSV"
          >
            {isExporting ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
            ) : (
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            <span>Xuất CSV</span>
          </button>

          {/* Nút Nhập CSV */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-950/40 px-3.5 py-2.5 text-xs font-semibold text-purple-300 shadow-sm transition hover:bg-purple-900/60 hover:text-white"
            title="Thêm hàng loạt địa điểm từ tệp CSV có kiểm tra trùng khớp"
          >
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            <span>Nhập CSV</span>
          </button>

          {/* Nút Thêm Mới */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-900/40 transition hover:bg-purple-500"
          >
            <span>+</span>
            <span>Thêm Địa điểm Mới</span>
          </button>
        </div>
      </div>

      {/* Tabs lọc trạng thái kiểm duyệt */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => {
            setStatusFilter("all");
            setPage(1);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${statusFilter === "all"
              ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
              : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
        >
          <span>Tất cả</span>
          <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px]">{total}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("pending");
            setPage(1);
          }}
          className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${statusFilter === "pending"
              ? "bg-amber-600 text-white shadow-md shadow-amber-900/30"
              : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
        >
          <span>⏳ Chờ duyệt (Pending)</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 text-[10px] animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("approved");
            setPage(1);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${statusFilter === "approved"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
              : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
        >
          <span>✓ Đã duyệt (Approved)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("rejected");
            setPage(1);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${statusFilter === "rejected"
              ? "bg-rose-600 text-white shadow-md shadow-rose-900/30"
              : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
        >
          <span>✕ Đã từ chối (Rejected)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center shrink-0">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, địa chỉ hoặc mô tả..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
          >
            Tìm
          </button>
        </form>

        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-purple-500 focus:outline-none"
        >
          <option value="">Tất cả Thể loại</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Thanh chuyển trang nhanh ở đầu trang (Không cần cuộn xuống) */}
        <div className="flex items-center gap-2 text-xs border border-slate-800 bg-slate-950/80 rounded-xl px-3 py-1.5 shrink-0">
          <span className="text-slate-400">Trang <span className="text-white font-bold">{page}</span>/{totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-6 w-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 transition flex items-center justify-center font-bold cursor-pointer"
              title="Trang trước"
            >
              ‹
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-6 w-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 transition flex items-center justify-center font-bold cursor-pointer"
              title="Trang sau"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Table Display */}
      <div className="flex-1 min-h-[450px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm flex flex-col">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center min-h-[300px]">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : places.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-slate-400 min-h-[300px]">
            <span className="text-3xl">🏜️</span>
            <p className="mt-2 text-xs">Không tìm thấy địa điểm nào phù hợp.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tên & Ảnh</th>
                  <th className="px-4 py-3 font-semibold">Danh mục</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Tọa độ GPS</th>
                  <th className="px-4 py-3 font-semibold">Giá vé (VNĐ)</th>
                  <th className="px-4 py-3 font-semibold">Đánh giá</th>
                  <th className="px-5 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {places.map((place) => (
                  <tr key={place.id} className="hover:bg-slate-800/25 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {(place.imageUrl || place.image_url || place.images?.[0]) ? (
                          <img
                            src={place.imageUrl || place.image_url || place.images?.[0]}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                            🏛️
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-white">{place.name}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                            {place.address || "TP. Huế"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-md bg-purple-950/60 border border-purple-800/30 px-2 py-0.5 text-[11px] font-medium text-purple-300 capitalize">
                        {place.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {place.status === "pending" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-950/70 border border-amber-500/40 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span>Chờ duyệt</span>
                        </span>
                      ) : place.status === "rejected" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-950/70 border border-rose-500/40 px-2.5 py-1 text-[11px] font-semibold text-rose-300">
                          <span>✕ Từ chối</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                          <span>✓ Đã duyệt</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                      {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-200 font-medium">
                      {place.price ? `${place.price.toLocaleString()} đ` : "Miễn phí"}
                    </td>
                    <td className="px-4 py-3.5 text-amber-400 font-semibold">
                      ★ {place.rating}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {place.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(place.id, place.name)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition active:scale-95 cursor-pointer"
                              title="Phê duyệt đưa lên bản đồ công khai"
                            >
                              <span>✓</span>
                              <span>Duyệt</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(place.id, place.name)}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-950/80 border border-rose-800/40 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900 transition active:scale-95 cursor-pointer"
                              title="Từ chối địa điểm này"
                            >
                              <span>✕</span>
                              <span>Từ chối</span>
                            </button>
                          </>
                        )}

                        {place.status === "rejected" && (
                          <button
                            type="button"
                            onClick={() => handleApprove(place.id, place.name)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                            title="Duyệt lại địa điểm này"
                          >
                            <span>✓ Duyệt lại</span>
                          </button>
                        )}

                        {(!place.status || place.status === "approved") && (
                          <button
                            type="button"
                            onClick={() => handleReject(place.id, place.name)}
                            className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-medium text-slate-400 hover:bg-rose-900/60 hover:text-rose-300 transition cursor-pointer"
                            title="Thu hồi khỏi bản đồ"
                          >
                            Thu hồi
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(place)}
                          className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-purple-600 hover:text-white transition cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(place.id, place.name)}
                          className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-600 hover:text-white transition cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Place */}
      {isModalOpen && editingPlace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">
                {editingPlace.id ? "Chỉnh sửa Địa điểm" : "Thêm Địa điểm Mới"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSavePlace} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-300">Tên địa điểm *</label>
                  <input
                    type="text"
                    required
                    value={editingPlace.name || ""}
                    onChange={(e) => setEditingPlace({ ...editingPlace, name: e.target.value })}
                    placeholder="VD: Chùa Thiên Mụ"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300">Thể loại *</label>
                  <select
                    value={editingPlace.category || "ancient"}
                    onChange={(e) => setEditingPlace({ ...editingPlace, category: e.target.value as any })}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label} ({c.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-300">Trạng thái phê duyệt *</label>
                  <select
                    value={editingPlace.status || "approved"}
                    onChange={(e) => setEditingPlace({ ...editingPlace, status: e.target.value as any })}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="approved">✓ Đã duyệt (Approved - Hiển thị công khai)</option>
                    <option value="pending">⏳ Chờ duyệt (Pending - Chưa hiển thị)</option>
                    <option value="rejected">✕ Đã từ chối (Rejected - Ẩn)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300">Nguồn gốc</label>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isLocalCheckbox"
                      checked={Boolean(editingPlace.isLocal)}
                      onChange={(e) => setEditingPlace({ ...editingPlace, isLocal: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="isLocalCheckbox" className="text-slate-300 cursor-pointer">
                      Địa điểm do cộng đồng đóng góp
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="font-semibold text-slate-300">Vĩ độ (Lat) *</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editingPlace.lat || 16.4637}
                    onChange={(e) => setEditingPlace({ ...editingPlace, lat: parseFloat(e.target.value) })}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300">Kinh độ (Lng) *</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editingPlace.lng || 107.5907}
                    onChange={(e) => setEditingPlace({ ...editingPlace, lng: parseFloat(e.target.value) })}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300">Giá vé (VNĐ)</label>
                  <input
                    type="number"
                    value={editingPlace.price || 0}
                    onChange={(e) => setEditingPlace({ ...editingPlace, price: parseInt(e.target.value, 10) || 0 })}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-300">Địa chỉ cụ thể</label>
                    <button
                      type="button"
                      disabled={isGeocodingAdmin || !editingPlace.lat || !editingPlace.lng}
                      onClick={async () => {
                        if (!editingPlace.lat || !editingPlace.lng) return;
                        try {
                          setIsGeocodingAdmin(true);
                          const res = await getReverseGeocode(editingPlace.lat, editingPlace.lng);
                          const resolved = res?.address || res?.fullAddress;
                          if (resolved) {
                            setEditingPlace((prev) => (prev ? { ...prev, address: resolved } : null));
                            toast.success(`Đã lấy địa chỉ từ toạ độ: ${resolved}`);
                          } else {
                            toast.warning("Không tìm thấy địa chỉ cụ thể cho toạ độ này.");
                          }
                        } catch (err: any) {
                          toast.error(err.message || "Không thể tìm địa chỉ từ toạ độ.");
                        } finally {
                          setIsGeocodingAdmin(false);
                        }
                      }}
                      className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Tự động tra cứu địa chỉ từ toạ độ Lat/Lng"
                    >
                      {isGeocodingAdmin ? "⏳ Đang tra cứu..." : "📍 Lấy từ toạ độ"}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editingPlace.address || ""}
                    onChange={(e) => setEditingPlace({ ...editingPlace, address: e.target.value })}
                    placeholder="VD: Đường Kim Long, TP Huế"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300">Giờ hoạt động</label>
                  <input
                    type="text"
                    value={editingPlace.openingHours || ""}
                    onChange={(e) => setEditingPlace({ ...editingPlace, openingHours: e.target.value })}
                    placeholder="VD: 07:00 - 17:30 hoặc 24/24"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300">Hình ảnh địa điểm (URL hoặc Tải lên)</label>
                  <input
                    ref={placeFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setIsUploadingImage(true);
                        setFormError("");
                        const uploadedUrl = await uploadMedia(file, "places");
                        if (uploadedUrl) {
                          setEditingPlace((prev) => ({
                            ...prev,
                            imageUrl: uploadedUrl,
                            images: prev?.images ? [...prev.images, uploadedUrl] : [uploadedUrl],
                          }));
                        }
                      } catch (err: any) {
                        setFormError(err.message || "Tải ảnh thất bại.");
                      } finally {
                        setIsUploadingImage(false);
                        if (placeFileInputRef.current) placeFileInputRef.current.value = "";
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={isUploadingImage}
                    onClick={() => placeFileInputRef.current?.click()}
                    className="text-[11px] text-purple-400 hover:text-purple-300 transition flex items-center gap-1 font-medium disabled:opacity-50"
                  >
                    {isUploadingImage ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border border-purple-400 border-t-transparent" />
                        <span>Đang tải lên Supabase...</span>
                      </>
                    ) : (
                      <>
                        <span>📤</span>
                        <span>Tải ảnh từ máy tính</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="url"
                    value={editingPlace.imageUrl || editingPlace.image_url || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingPlace((prev) => {
                        if (!prev) return prev;
                        const existingImages = prev.images || [];
                        return {
                          ...prev,
                          imageUrl: val,
                          image_url: val,
                          images: existingImages.length > 0 ? [val, ...existingImages.slice(1)] : (val ? [val] : []),
                        };
                      });
                    }}
                    placeholder="https://vhyfauholmouikskxecp.supabase.co/... hoặc link ảnh bất kỳ"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                  {(editingPlace.imageUrl || editingPlace.image_url) && (
                    <a
                      href={editingPlace.imageUrl || editingPlace.image_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Bấm để xem ảnh gốc kích thước lớn"
                      className="h-9 w-9 shrink-0 rounded-lg overflow-hidden border border-slate-700 block hover:scale-105 transition"
                    >
                      <img
                        src={editingPlace.imageUrl || editingPlace.image_url}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    </a>
                  )}
                </div>

                {/* Danh sách Album ảnh của địa điểm */}
                {editingPlace.images && editingPlace.images.length > 0 && (
                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Album Thư viện ảnh ({editingPlace.images.length} ảnh):
                      </span>
                      <span className="text-[10px] text-slate-500">Bấm ảnh để đặt làm ảnh đại diện</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editingPlace.images.map((imgUrl, imgIdx) => {
                        const isMain = imgUrl === (editingPlace.imageUrl || editingPlace.image_url);
                        return (
                          <div
                            key={imgIdx}
                            className={`group relative h-14 w-14 rounded-lg overflow-hidden border transition cursor-pointer ${isMain ? "border-purple-500 ring-2 ring-purple-500/40" : "border-slate-700 opacity-80 hover:opacity-100"
                              }`}
                            onClick={() => {
                              setEditingPlace((prev) => prev ? ({ ...prev, imageUrl: imgUrl, image_url: imgUrl }) : prev);
                            }}
                            title={isMain ? "Ảnh đại diện chính" : "Nhấn để đặt làm ảnh đại diện"}
                          >
                            <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                            {isMain && (
                              <span className="absolute bottom-0 inset-x-0 bg-purple-600 text-[8px] font-bold text-center text-white py-0.2">
                                Đại diện
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPlace((prev) => {
                                  if (!prev) return prev;
                                  const updated = (prev.images || []).filter((_, i) => i !== imgIdx);
                                  return {
                                    ...prev,
                                    images: updated,
                                    imageUrl: isMain ? (updated[0] || "") : prev.imageUrl,
                                    image_url: isMain ? (updated[0] || "") : prev.image_url,
                                  };
                                });
                              }}
                              className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[9px] text-white hover:bg-red-600 transition"
                              title="Xóa ảnh này khỏi album"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-slate-300">Giờ mở cửa</label>
                  <input
                    type="text"
                    value={editingPlace.openingHours || ""}
                    onChange={(e) => setEditingPlace({ ...editingPlace, openingHours: e.target.value })}
                    placeholder="VD: 07:00 - 17:30"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300">Thời điểm thích hợp nhất</label>
                  <input
                    type="text"
                    value={editingPlace.bestTime || ""}
                    onChange={(e) => setEditingPlace({ ...editingPlace, bestTime: e.target.value })}
                    placeholder="VD: Buổi hoàng hôn chiều tà"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  value={editingPlace.description || ""}
                  onChange={(e) => setEditingPlace({ ...editingPlace, description: e.target.value })}
                  placeholder="Giới thiệu về lịch sử, nét đặc sắc của danh thắng..."
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 font-medium text-slate-300 hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-purple-600 px-5 py-2 font-semibold text-white shadow-lg shadow-purple-900/30 hover:bg-purple-500 transition disabled:opacity-50"
                >
                  {isSaving ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => !isConfirming && setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        isLoading={isConfirming}
      />

      {/* Import Places from CSV Modal */}
      <ImportPlacesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          loadPlaces();
        }}
      />
    </div>
  );
}
