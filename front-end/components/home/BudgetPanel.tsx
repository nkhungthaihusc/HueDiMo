"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import type { SavedItinerary } from "@/lib/itinerary/logic";
import { getItineraries, setItineraryBudget } from "@/lib/itinerary/logic";
import { getAllPlaces } from "@/lib/addplace/logic";
import { getCategory } from "@/lib/data/categories";
import { formatVND } from "@/lib/format";

interface BudgetPanelProps {
  onClose: () => void;
  onOpen: (itinerary: SavedItinerary) => void;
}

export default function BudgetPanel({ onClose, onOpen }: BudgetPanelProps) {
  const { user } = useAuth();
  const [list, setList] = useState<SavedItinerary[]>(() => getItineraries());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState("");

  const placeCategories = useMemo(() => {
    const map = new Map<string, string>();
    getAllPlaces().forEach((p) => map.set(p.id, p.category));
    return map;
  }, []);

  const saveBudget = (it: SavedItinerary) => {
    const n = Number(budgetValue);
    setList(setItineraryBudget(it.id, Number.isFinite(n) && n > 0 ? Math.round(n) : 0));
    setEditingId(null);
    setBudgetValue("");
  };

  const breakdown = (it: SavedItinerary) => {
    const groups = new Map<string, number>();
    it.days.forEach((d) =>
      d.places.forEach((p) => {
        const cat = placeCategories.get(p.placeId) ?? "other";
        groups.set(cat, (groups.get(cat) ?? 0) + p.estimatedCost);
      }),
    );
    return [...groups.entries()].sort((a, b) => b[1] - a[1]);
  };

  const totals = list.reduce(
    (acc, it) => ({
      spent: acc.spent + it.totalEstimatedCost,
      budget: acc.budget + (typeof it.budget === "number" && it.budget > 0 ? it.budget : 0),
      budgeted: acc.budgeted + (typeof it.budget === "number" && it.budget > 0 ? 1 : 0),
    }),
    { spent: 0, budget: 0, budgeted: 0 },
  );

  return (
    <div className="pointer-events-auto flex h-full w-full max-w-[calc(100vw-1rem)] sm:w-[410px] sm:max-w-[410px] flex-col overflow-hidden rounded-3xl bg-white/95 border border-slate-200/80 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-right-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-slate-50/80 to-white">
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
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">Dự toán Ngân sách</h2>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">Theo dõi và kiểm soát chi tiêu du lịch</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!user ? (
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50/90 via-amber-50/50 to-white p-6 border border-amber-200/70 text-center space-y-3 shadow-xs my-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs border border-amber-200 text-2xl">
              💰
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Đăng nhập để xem dự toán
              </h4>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                Tính năng quản lý và phân tích ngân sách chi tiêu du lịch yêu cầu đăng nhập tài khoản HueDiMo.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Link
                href="/login"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95 cursor-pointer"
              >
                Đăng nhập ngay
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
              >
                Đăng ký
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Card tổng chi toàn bộ */}
            <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-md relative overflow-hidden">
              <div className="text-xs font-medium text-slate-400">Tổng chi phí ước tính các lộ trình</div>
              <div className="text-2xl font-black tracking-tight text-amber-400 mt-1">
                {formatVND(totals.spent)}
              </div>
              <div className="mt-2 text-[11px] text-slate-300">
                Đã lập ngân sách cho {totals.budgeted}/{list.length} kế hoạch
              </div>
            </div>

            {list.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-xs">
                Chưa có lộ trình nào để dự toán. Hãy lưu một lộ trình trước.
              </div>
            )}
          </>
        )}

        {/* Danh sách các lộ trình và tiến độ chi tiêu */}
        {user && list.map((it) => {
          const bd = breakdown(it);
          const hasBudget = typeof it.budget === "number" && it.budget > 0;
          const isOver = hasBudget && it.totalEstimatedCost > (it.budget as number);
          const percent = hasBudget
            ? Math.min(100, Math.round((it.totalEstimatedCost / (it.budget as number)) * 100))
            : 0;

          return (
            <div
              key={it.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    {it.title || `Lộ trình ${it.days.length} ngày`}
                  </h3>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {it.days.length} ngày · {it.days.reduce((acc, d) => acc + d.places.length, 0)} địa điểm
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-900">
                    {formatVND(it.totalEstimatedCost)}
                  </div>
                  {hasBudget && (
                    <div className={`text-[10px] font-semibold ${isOver ? "text-rose-600" : "text-emerald-600"}`}>
                      {isOver ? `Vượt ${formatVND(it.totalEstimatedCost - (it.budget as number))}` : `Dư ${formatVND((it.budget as number) - it.totalEstimatedCost)}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar ngân sách */}
              {hasBudget && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Tiến độ ngân sách</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isOver ? "bg-rose-500" : "bg-emerald-500"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Phân rã theo thể loại */}
              {bd.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                  {bd.map(([catId, amount]) => {
                    const cat = getCategory(catId);
                    return (
                      <span
                        key={catId}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200/60"
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.label}: {formatVND(amount)}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Nút đặt lại ngân sách hoặc Mở */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                {editingId === it.id ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="number"
                      step={50000}
                      value={budgetValue}
                      placeholder="Ngân sách (đ)..."
                      onChange={(e) => setBudgetValue(e.target.value)}
                      className="w-full rounded-lg border border-indigo-400 bg-white px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => saveBudget(it)}
                      className="rounded-lg bg-indigo-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 cursor-pointer"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(it.id);
                      setBudgetValue(it.budget ? String(it.budget) : "");
                    }}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {hasBudget ? "✏️ Chỉnh ngân sách" : "+ Đặt ngân sách"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpen(it)}
                  className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  Mở lịch trình
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}