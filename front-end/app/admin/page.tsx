"use client";

import { useEffect, useState } from "react";
import { AdminAPI, type AdminStats } from "@/lib/api/admin";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await AdminAPI.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải số liệu thống kê.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="text-xs">Đang nạp dữ liệu thống kê hệ thống...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-600">
        <p className="text-sm font-semibold">{error}</p>
        <button
          onClick={loadStats}
          className="mt-4 rounded-xl bg-slate-100 px-4 py-2 text-xs font-medium text-slate-900 transition hover:bg-slate-200"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const overview = stats?.overview;
  const categories = stats?.categoryDistribution || [];
  const recentPlaces = stats?.recentPlaces || [];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tổng quan Hệ thống</h1>
          <p className="text-sm text-slate-500">
            Theo dõi dữ liệu địa điểm, lưu lượng người dùng và phản hồi du lịch tại Thừa Thiên Huế.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/places"
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-500"
          >
            <span>+</span>
            <span>Thêm địa điểm</span>
          </Link>
          <button
            onClick={loadStats}
            title="Làm mới"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-900 transition"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Alert Banner nếu có địa điểm đang chờ phê duyệt */}
      {Boolean(overview?.pendingPlaces && overview.pendingPlaces > 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-50 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-lg text-amber-700">
              ⏳
            </span>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Có {overview?.pendingPlaces} địa điểm du lịch mới đang chờ phê duyệt!
              </h3>
              <p className="text-xs text-amber-700/80">
                Người dùng đã đóng góp địa điểm vào hệ thống. Vui lòng kiểm duyệt thông tin trước khi xuất bản lên bản đồ.
              </p>
            </div>
          </div>
          <Link
            href="/admin/places"
            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition active:scale-95 shadow-md shadow-amber-950/40"
          >
            <span>Duyệt ngay</span>
            <span>→</span>
          </Link>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="admin-kpis grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Địa điểm
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700">
              📍
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">
            {overview?.totalPlaces ?? 0}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700">
            <span>● Đang hoạt động trên bản đồ</span>
          </div>
        </div>

        <Link
          href="/admin/places"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-amber-500/50 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-amber-700 transition">
              Chờ Kiểm Duyệt
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
              ⏳
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {overview?.pendingPlaces ?? 0}
            </span>
            {(overview?.pendingPlaces ?? 0) > 0 && (
              <span className="text-xs font-semibold text-amber-700 animate-pulse">Cần duyệt</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 group-hover:text-amber-700/80 transition">
            <span>Bấm để xem danh sách chờ →</span>
          </div>
        </Link>

        <Link
          href="/admin/itineraries"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-500/50 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-indigo-700 transition">
              Lộ trình Du lịch
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-700">
              🗺️
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">
            {overview?.totalItineraries ?? 0}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-indigo-700">
            <span>{overview?.publicItineraries ?? 0} công khai cộng đồng</span>
          </div>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tài khoản Người dùng
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
              👥
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">
            {overview?.totalUsers ?? 0}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <span>Hệ thống tài khoản JWT kép</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Đánh giá Địa điểm
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
              💬
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">
            {overview?.totalReviews ?? 0}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-700">
            <span>⭐ Điểm TB: {overview?.avgRating ?? 0} / 5</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Category Distribution & Recent Places */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Category Breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900">Phân bố theo Thể loại</h2>
          <p className="mt-0.5 text-xs text-slate-500">Số lượng địa điểm theo từng danh mục du lịch</p>

          <div className="mt-6 space-y-3.5">
            {categories.map((cat) => {
              const percentage = overview?.totalPlaces
                ? Math.round((cat.count / overview.totalPlaces) * 100)
                : 0;
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600 capitalize">{cat.category}</span>
                    <span className="text-slate-500">
                      {cat.count} địa điểm ({percentage}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Places Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Địa điểm cập nhật gần đây</h2>
              <p className="mt-0.5 text-xs text-slate-500">Danh sách các danh thắng và điểm đến mới nhất</p>
            </div>
            <Link
              href="/admin/places"
              className="text-xs font-semibold text-purple-700 hover:text-purple-700"
            >
              Xem tất cả →
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
                <caption className="caption-top px-4 py-3 text-left text-xs font-medium text-slate-500 md:hidden">Vuốt ngang để xem đầy đủ thông tin và thao tác →</caption>
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="pb-3 font-semibold">Tên địa điểm</th>
                  <th className="pb-3 font-semibold">Thể loại</th>
                  <th className="pb-3 font-semibold">Đánh giá</th>
                  <th className="pb-3 font-semibold">Giá vé tham quan</th>
                  <th className="pb-3 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPlaces.map((place) => (
                  <tr key={place.id} className="hover:bg-slate-100">
                    <td className="py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        {place.imageUrl ? (
                          <img
                            src={place.imageUrl}
                            alt=""
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            🏛️
                          </div>
                        )}
                        <span className="truncate max-w-[180px]">{place.name}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-purple-700 capitalize">
                        {place.category}
                      </span>
                    </td>
                    <td className="py-3 text-amber-700 font-semibold">★ {place.rating}</td>
                    <td className="py-3 text-slate-600">
                      {place.price ? `${place.price.toLocaleString()} đ` : "Miễn phí"}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/places?edit=${place.id}`}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition"
                      >
                        Sửa
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
