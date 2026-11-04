"use client";

import { useEffect, useState } from "react";
import { AdminAPI } from "@/lib/api/admin";
import type { User } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    isOpen: boolean;
    user: User | null;
    newRole: "user" | "admin";
  }>({ isOpen: false, user: null, newRole: "user" });

  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    isOpen: boolean;
    user: User | null;
    newStatus: "active" | "banned";
  }>({ isOpen: false, user: null, newStatus: "banned" });

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const res = await AdminAPI.getUsers({
        page,
        limit,
        q: search,
        role: roleFilter,
      });
      setUsers(res.items);
      setTotal(res.pagination.total);
    } catch (err: any) {
      toast.error(err.message || "Không thể nạp danh sách người dùng.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleToggleRole = async (user: User) => {
    if (!user.id) return;
    const newRole = user.role === "admin" ? "user" : "admin";

    if (user.id === currentUser?.id && newRole !== "admin") {
      toast.warning("Bạn không thể tự hạ quyền Admin của chính mình!");
      return;
    }

    setRoleChangeDialog({ isOpen: true, user, newRole });
  };

  const confirmRoleChange = async () => {
    const { user, newRole } = roleChangeDialog;
    if (!user?.id) return;
    try {
      setUpdatingUserId(user.id);
      await AdminAPI.updateUserRole(user.id, newRole);
      loadUsers();
      toast.success(`Cập nhật quyền của "${user.name || user.id}" thành '${newRole}' thành công!`);
      setRoleChangeDialog({ isOpen: false, user: null, newRole: "user" });
    } catch (err: any) {
      toast.error(err.message || "Cập nhật quyền người dùng thất bại.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleStatus = (user: User) => {
    if (!user.id) return;
    const isBanned = user.status === "banned";

    if (user.id === currentUser?.id && !isBanned) {
      toast.warning("Bạn không thể tự khóa tài khoản của chính mình!");
      return;
    }

    setStatusChangeDialog({
      isOpen: true,
      user,
      newStatus: isBanned ? "active" : "banned",
    });
  };

  const confirmStatusChange = async () => {
    const { user, newStatus } = statusChangeDialog;
    if (!user?.id) return;
    try {
      setUpdatingUserId(user.id);
      const result = await AdminAPI.updateUserStatus(user.id, newStatus);
      loadUsers();
      toast.success(result.message || `Đã cập nhật trạng thái tài khoản thành công.`);
      setStatusChangeDialog({ isOpen: false, user: null, newStatus: "banned" });
    } catch (err: any) {
      toast.error(err.message || "Thay đổi trạng thái tài khoản thất bại.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="flex flex-1 flex-col space-y-6 min-h-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý Người dùng & Phân quyền</h1>
          <p className="text-sm text-slate-500">
            Danh sách tài khoản hệ thống ({total} người dùng). Phân quyền & Quản lý trạng thái tài khoản.
          </p>
        </div>

        {/* Thanh chuyển trang nhanh ở đầu trang */}
        <div className="flex items-center gap-2 text-xs border border-slate-200 bg-slate-50 rounded-xl px-3 py-1.5 shrink-0 self-start sm:self-auto">
          <span className="text-slate-500">Trang <span className="text-slate-900 font-bold">{page}</span>/{totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-6 w-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30 transition flex items-center justify-center font-bold cursor-pointer"
              title="Trang trước"
            >
              ‹
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-6 w-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30 transition flex items-center justify-center font-bold cursor-pointer"
              title="Trang sau"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center shrink-0">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo họ tên hoặc email..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-900 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200 transition"
          >
            Tìm
          </button>
        </form>

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 focus:border-purple-500 focus:outline-none"
        >
          <option value="">Tất cả Vai trò</option>
          <option value="admin">Quản trị viên (Admin)</option>
          <option value="user">Người dùng (User)</option>
        </select>
      </div>

      {/* Table Display */}
      <div className="flex-1 min-h-[450px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center min-h-[300px]">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
            <table className="w-full text-left text-xs">
                <caption className="caption-top px-4 py-3 text-left text-xs font-medium text-slate-500 md:hidden">Vuốt ngang để xem đầy đủ thông tin và thao tác →</caption>
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 backdrop-blur-md text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Người dùng</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Vai trò</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-5 py-3 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isAdmin = u.role === "admin";
                  const isBanned = u.status === "banned";
                  const isUpdating = updatingUserId === u.id;

                  return (
                    <tr
                      key={u.id || u.email}
                      className={`hover:bg-slate-100 transition ${isBanned ? "opacity-60" : ""}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${isBanned ? "bg-rose-50 border border-rose-700/40 text-rose-700" : "bg-purple-50 border border-purple-700/50 text-purple-700"}`}>
                            {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="rounded-md bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                                  Bạn
                                </span>
                              )}
                              {isBanned && (
                                <span className="rounded-md bg-rose-50 border border-rose-600/40 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                  🔒 Đã khóa
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              ID: {u.id?.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">{u.email}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isAdmin
                              ? "bg-purple-500/20 text-purple-700 border border-purple-500/40"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          <span>{isAdmin ? "👑 Admin" : "👤 User"}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isBanned
                              ? "bg-rose-50 text-rose-700 border border-rose-700/50"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-700/50"
                          }`}
                        >
                          {isBanned ? "🔒 Bị khóa" : "✓ Hoạt động"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Đổi role */}
                          <button
                            disabled={isCurrent || Boolean(isUpdating)}
                            onClick={() => handleToggleRole(u)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                              isAdmin
                                ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50"
                                : "bg-purple-50 text-purple-700 border border-purple-700/40 hover:bg-purple-800/50"
                            } disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
                          >
                            {isUpdating
                              ? "..."
                              : isAdmin
                              ? "Hạ User"
                              : "Cấp Admin"}
                          </button>

                          {/* Khóa / Kích hoạt */}
                          <button
                            disabled={isCurrent || Boolean(isUpdating)}
                            onClick={() => handleToggleStatus(u)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                              isBanned
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                                : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-50"
                            } disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
                          >
                            {isUpdating ? "..." : isBanned ? "🔓 Kích hoạt" : "🔒 Khóa TK"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal xác nhận đổi quyền */}
      <ConfirmModal
        isOpen={roleChangeDialog.isOpen}
        onClose={() => !updatingUserId && setRoleChangeDialog({ isOpen: false, user: null, newRole: "user" })}
        onConfirm={confirmRoleChange}
        title="Xác nhận thay đổi quyền"
        message={`Bạn có chắc chắn muốn đổi quyền của "${roleChangeDialog.user?.name}" (${roleChangeDialog.user?.email}) thành '${roleChangeDialog.newRole}'?`}
        confirmText="Đổi quyền"
        variant="warning"
        isLoading={Boolean(updatingUserId)}
      />

      {/* Modal xác nhận khóa / kích hoạt tài khoản */}
      <ConfirmModal
        isOpen={statusChangeDialog.isOpen}
        onClose={() => !updatingUserId && setStatusChangeDialog({ isOpen: false, user: null, newStatus: "banned" })}
        onConfirm={confirmStatusChange}
        title={statusChangeDialog.newStatus === "banned" ? "🔒 Xác nhận Khóa Tài khoản" : "🔓 Xác nhận Kích hoạt Tài khoản"}
        message={
          statusChangeDialog.newStatus === "banned"
            ? `Tài khoản của "${statusChangeDialog.user?.name}" (${statusChangeDialog.user?.email}) sẽ bị khóa — người dùng này sẽ không thể đăng nhập cho đến khi được kích hoạt lại. Dữ liệu không bị xóa.`
            : `Bạn có chắc chắn muốn kích hoạt lại tài khoản của "${statusChangeDialog.user?.name}" (${statusChangeDialog.user?.email})? Người dùng này sẽ có thể đăng nhập bình thường trở lại.`
        }
        confirmText={statusChangeDialog.newStatus === "banned" ? "🔒 Khóa tài khoản" : "🔓 Kích hoạt lại"}
        variant={statusChangeDialog.newStatus === "banned" ? "danger" : "primary"}
        isLoading={Boolean(updatingUserId)}
      />
    </div>
  );
}


