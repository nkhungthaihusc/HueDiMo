"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/api/leaderboard";
import {
  Trophy,
  X,
  Medal,
  Sparkles,
  MapPin,
  RefreshCw,
  User as UserIcon,
  Crown,
} from "lucide-react";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile?: () => void;
}

export default function LeaderboardModal({
  isOpen,
  onClose,
  onOpenProfile,
}: LeaderboardModalProps) {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBoard = async () => {
    setLoading(true);
    try {
      const data = await getLeaderboard(50);
      setLeaderboard(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBoard();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const top3 = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  // Tìm thứ hạng của user hiện tại
  const myRankIndex = user
    ? leaderboard.findIndex((item) => item.id === user.id || item.name === user.name)
    : -1;
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero Vinh Danh Cố Đô */}
        <div className="relative bg-gradient-to-br from-amber-500 via-emerald-600 to-teal-700 p-6 text-white overflow-hidden shrink-0">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
                <Trophy className="w-7 h-7 text-amber-300" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  Bảng Vinh Danh Du Khách
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </h3>
                <p className="text-xs text-white/80 mt-0.5">
                  Khám phá Cố Đô Huế, check-in tích lũy điểm thưởng & vinh danh
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchBoard}
                disabled={loading}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition backdrop-blur-md disabled:opacity-50"
                title="Làm mới"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition backdrop-blur-md"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Podium Top 3 Bục Vinh Danh */}
          {top3.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/20 flex items-end justify-center gap-3 sm:gap-6">
              {/* Vị trí 2 (Bạc) */}
              {top3[1] && (
                <div className="flex flex-col items-center flex-1 max-w-[110px]">
                  <div className="relative mb-1.5">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-slate-300 shadow-lg bg-slate-100 flex items-center justify-center">
                      {top3[1].avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={top3[1].avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-7 h-7 text-slate-400" />
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-black text-[11px] flex items-center justify-center shadow-md">
                      2
                    </div>
                  </div>
                  <p className="text-xs font-bold text-white truncate max-w-full text-center">
                    {top3[1].name}
                  </p>
                  <span className="text-[10px] font-black text-amber-200 mt-0.5">
                    {top3[1].points.toLocaleString()} pts
                  </span>
                  <div className="w-full h-14 mt-2 bg-gradient-to-t from-white/20 to-white/10 rounded-t-xl flex items-center justify-center border-t border-white/20">
                    <Medal className="w-5 h-5 text-slate-200" />
                  </div>
                </div>
              )}

              {/* Vị trí 1 (Vàng - Trung tâm, cao nhất) */}
              {top3[0] && (
                <div className="flex flex-col items-center flex-1 max-w-[125px]">
                  <div className="relative mb-1.5 -top-2">
                    <Crown className="w-6 h-6 text-amber-300 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
                    <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-amber-300 shadow-xl bg-amber-50 flex items-center justify-center">
                      {top3[0].avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={top3[0].avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-8 h-8 text-amber-600" />
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-1 w-7 h-7 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg">
                      1
                    </div>
                  </div>
                  <p className="text-sm font-black text-white truncate max-w-full text-center">
                    {top3[0].name}
                  </p>
                  <span className="text-xs font-black text-amber-300 mt-0.5">
                    {top3[0].points.toLocaleString()} pts
                  </span>
                  <div className="w-full h-20 mt-2 bg-gradient-to-t from-amber-400/30 to-amber-300/20 rounded-t-2xl flex items-center justify-center border-t-2 border-amber-300/40 shadow-inner">
                    <Trophy className="w-7 h-7 text-amber-300 drop-shadow" />
                  </div>
                </div>
              )}

              {/* Vị trí 3 (Đồng) */}
              {top3[2] && (
                <div className="flex flex-col items-center flex-1 max-w-[110px]">
                  <div className="relative mb-1.5">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-amber-700/60 shadow-lg bg-slate-100 flex items-center justify-center">
                      {top3[2].avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={top3[2].avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-7 h-7 text-slate-400" />
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-[11px] flex items-center justify-center shadow-md">
                      3
                    </div>
                  </div>
                  <p className="text-xs font-bold text-white truncate max-w-full text-center">
                    {top3[2].name}
                  </p>
                  <span className="text-[10px] font-black text-amber-200 mt-0.5">
                    {top3[2].points.toLocaleString()} pts
                  </span>
                  <div className="w-full h-11 mt-2 bg-gradient-to-t from-white/20 to-white/10 rounded-t-xl flex items-center justify-center border-t border-white/20">
                    <Medal className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Danh sách thứ hạng từ Top 4 trở đi */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {leaderboard.length === 0 && !loading && (
            <div className="py-12 text-center text-slate-400">
              <Trophy className="w-12 h-12 mx-auto stroke-[1.2] mb-2 text-slate-300" />
              <p className="text-sm font-medium">Chưa có dữ liệu xếp hạng.</p>
              <p className="text-xs text-slate-400 mt-1">
                Hãy là người đầu tiên check-in các địa điểm ở Huế để leo lên đỉnh bảng!
              </p>
            </div>
          )}

          {remaining.map((item, idx) => {
            const rank = idx + 4;
            const isMe = user?.id === item.id || user?.name === item.name;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                  isMe
                    ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-sm"
                    : "bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-100 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center font-black text-sm text-slate-400 dark:text-slate-500">
                    #{rank}
                  </span>

                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    {item.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      {item.name}
                      {isMe && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                          Bạn
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-emerald-500" />
                        {item.checkin_count} lượt check-in
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {item.points.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">pts</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Thanh trạng thái cá nhân dưới đáy modal */}
        {user ? (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow">
                {myRank ? `#${myRank}` : "-"}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Vị trí của bạn: {myRank ? `Hạng #${myRank}` : "Chưa có thứ hạng"}
                </p>
                <p className="text-[11px] text-slate-400">
                  {user.points || 0} điểm &bull; {user.checkinCount ?? user.checkin_count ?? 0} địa điểm đã ghé thăm
                </p>
              </div>
            </div>

            {onOpenProfile && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenProfile();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                Hồ sơ cá nhân
              </button>
            )}
          </div>
        ) : (
          <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800/80 border-t border-emerald-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              <span className="text-base">🏆</span>
              <p className="text-xs">
                Đăng nhập để <strong>check-in di sản</strong> và nhận điểm vinh danh!
              </p>
            </div>
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition shrink-0"
            >
              Đăng nhập
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
