"use client";

import { useState } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { toast } from "@/components/ui/Toast";

interface DeleteAllButtonProps {
  resource: string;
  message: string;
  disabled?: boolean;
  list: (params: { page: number; limit: number }) => Promise<{
    items: { id: string }[];
    pagination: { totalPages: number };
  }>;
  remove: (id: string) => Promise<{ deleted: boolean }>;
  reload: () => void | Promise<void>;
}

export default function DeleteAllButton({ resource, message, disabled, list, remove, reload }: DeleteAllButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    const ids = new Set<string>();
    let deleted = 0;
    try {
      // Đọc hết các trang trước để lượt xóa không làm dịch bản ghi giữa các trang.
      let totalPages = 1;
      for (let page = 1; page <= totalPages; page++) {
        const result = await list({ page, limit: 100 });
        if (page === 1) totalPages = result.pagination.totalPages;
        for (const { id } of result.items) ids.add(id);
      }

      for (const id of ids) {
        const result = await remove(id);
        if (!result.deleted) throw new Error("Máy chủ chưa xác nhận xóa bản ghi.");
        deleted++;
      }

      if (deleted) toast.success(`Đã xóa ${deleted} ${resource}.`);
      else toast.info(`Không có ${resource} để xóa.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Vui lòng thử lại.";
      toast.error(`Đã xóa ${deleted} ${resource}. Thao tác đã dừng. ${detail}`);
    } finally {
      await reload();
      setOpen(false);
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => setOpen(true)}
        className="rounded-xl border border-rose-500/40 px-3.5 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-300"
      >
        Xóa toàn bộ
      </button>
      <ConfirmModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        title={`Xóa toàn bộ ${resource}?`}
        confirmText={`Xóa toàn bộ ${resource}`}
        message={message}
        isLoading={busy}
      />
    </>
  );
}
