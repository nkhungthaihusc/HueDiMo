"use client";

import { useEffect, useState } from "react";
import { AdminAPI } from "@/lib/api/admin";
import { toast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface ReviewItem {
  id: string;
  place_id: string;
  place_name?: string;
  author_name: string;
  rating: number;
  comment: string;
  images?: string[];
  created_at: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    id: string;
  }>({ isOpen: false, id: "" });
  const [isDeleting, setIsDeleting] = useState(false);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      const res = await AdminAPI.getReviews({ page, limit });
      setReviews(res.items);
      setTotal(res.pagination.total);
    } catch (err: any) {
      toast.error(err.message || "Không thể nạp danh sách đánh giá.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [page]);

  const handleDelete = (id: string) => {
    setDeleteDialog({ isOpen: true, id });
  };

  const confirmDeleteReview = async () => {
    if (!deleteDialog.id) return;
    try {
      setIsDeleting(true);
      await AdminAPI.deleteReview(deleteDialog.id);
      loadReviews();
      toast.success("Đã xóa đánh giá thành công.");
      setDeleteDialog({ isOpen: false, id: "" });
    } catch (err: any) {
      toast.error(err.message || "Xóa đánh giá thất bại.");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="flex flex-1 flex-col space-y-6 min-h-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-admin-strong">Kiểm duyệt Đánh giá Du khách</h1>
          <p className="text-sm text-admin-subtle">
            Xem và kiểm duyệt phản hồi của du khách về các danh thắng và món ngon ở Huế ({total} đánh giá).
          </p>
        </div>

        {/* Thanh chuyển trang nhanh ở đầu */}
        <div className="flex items-center gap-2 text-xs border border-admin-border bg-admin-surface rounded-xl px-3 py-1.5 shrink-0 self-start sm:self-auto">
          <span className="text-admin-subtle">Trang <span className="text-admin-strong font-bold">{page}</span>/{totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-6 w-6 rounded-lg bg-admin-muted hover:bg-admin-muted text-admin-body hover:text-admin-strong disabled:opacity-30 transition flex items-center justify-center font-bold cursor-pointer"
              title="Trang trước"
            >
              ‹
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-6 w-6 rounded-lg bg-admin-muted hover:bg-admin-muted text-admin-body hover:text-admin-strong disabled:opacity-30 transition flex items-center justify-center font-bold cursor-pointer"
              title="Trang sau"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[450px] overflow-hidden rounded-2xl border border-admin-border bg-admin-surface shadow-sm flex flex-col">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center min-h-[300px]">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-admin-subtle min-h-[300px]">
            <span className="text-3xl">💬</span>
            <p className="mt-2 text-xs">Hiện tại chưa có đánh giá nào từ du khách.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
            <table className="w-full text-left text-xs">
                <caption className="caption-top px-4 py-3 text-left text-xs font-medium text-admin-subtle md:hidden">Vuốt ngang để xem đầy đủ thông tin và thao tác →</caption>
              <thead className="sticky top-0 z-10 border-b border-admin-border bg-admin-canvas backdrop-blur-md text-admin-subtle">
                <tr>
                  <th className="px-5 py-3 font-semibold">Địa điểm</th>
                  <th className="px-4 py-3 font-semibold">Tác giả</th>
                  <th className="px-4 py-3 font-semibold">Sao</th>
                  <th className="px-5 py-3 font-semibold">Nội dung & Hình ảnh</th>
                  <th className="px-4 py-3 font-semibold">Ngày gửi</th>
                  <th className="px-5 py-3 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-admin-muted transition">
                    <td className="px-5 py-3.5 font-semibold text-purple-700 dark:text-purple-300">
                      {r.place_name || r.place_id}
                    </td>
                    <td className="px-4 py-3.5 text-admin-strong font-medium">{r.author_name}</td>
                    <td className="px-4 py-3.5 text-amber-700 dark:text-amber-300 font-bold">★ {r.rating}</td>
                    <td className="px-5 py-3.5 text-admin-body max-w-md">
                      <p className="line-clamp-2">{r.comment}</p>
                      {r.images && r.images.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {r.images.map((imgUrl, imgIdx) => (
                            <a
                              key={imgIdx}
                              href={imgUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="h-10 w-10 overflow-hidden rounded-lg border border-admin-border bg-admin-canvas block hover:scale-105 transition"
                              title="Bấm để xem ảnh gốc"
                            >
                              <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-admin-subtle">
                      {new Date(r.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="rounded-lg bg-admin-muted px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-300 hover:bg-red-600 hover:text-admin-strong transition"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteDialog.isOpen}
        onClose={() => !isDeleting && setDeleteDialog({ isOpen: false, id: "" })}
        onConfirm={confirmDeleteReview}
        title="Xác nhận xóa đánh giá"
        message="Bạn có chắc chắn muốn xóa đánh giá này? Thao tác này không thể hoàn tác."
        confirmText="Xóa đánh giá"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
