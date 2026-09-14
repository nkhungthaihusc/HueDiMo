"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { uploadMedia } from "@/lib/api/media";
import { toast } from "@/components/ui/Toast";
import {
  X,
  Camera,
  Award,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  User as UserIcon,
  Mail,
  ShieldCheck,
} from "lucide-react";

import type { Place } from "@/lib/types";
import { getCategory } from "@/lib/data/categories";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLeaderboard?: () => void;
  userContributedPlaces?: Place[];
  onSelectPlace?: (place: Place) => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  onOpenLeaderboard,
  userContributedPlaces = [],
  onSelectPlace,
}: ProfileModalProps) {
  const { user, updateProfile, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"info" | "places">("info");
  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || user?.avatar_url || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Đồng bộ lại khi user thay đổi (sau khi refreshUser)
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setAvatarUrl(user.avatarUrl || user.avatar_url || "");
    }
  }, [user]);

  if (!isOpen) return null;

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Giới hạn 5MB
    if (file.size > 5 * 1024 * 1024) {
      const msg = "Kích thước ảnh đại diện không được vượt quá 5MB.";
      setError(msg);
      toast.warning(msg, "Ảnh quá lớn");
      return;
    }

    try {
      setIsUploading(true);
      setError("");
      // Upload trực tiếp lên Supabase bucket huedimo-media qua folder 'avatars'
      const uploadedUrl = await uploadMedia(file, "avatars");
      setAvatarUrl(uploadedUrl);

      // Tự động cập nhật ngay lập tức vào hồ sơ và cơ sở dữ liệu
      const res = await updateProfile({
        name: name.trim() || user?.name || "Du khách Huế",
        avatarUrl: uploadedUrl,
        avatar_url: uploadedUrl,
      });

      if (!res.ok) {
        const msg = res.error || "Tải ảnh lên thành công nhưng chưa thể lưu vào hồ sơ.";
        setError(msg);
        toast.error(msg);
      } else {
        await refreshUser();
        setSuccess(true);
        toast.success("Ảnh đại diện đã được cập nhật!", "Thành công");
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      const msg = err.message || "Tải ảnh đại diện lên thất bại.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      const msg = "Họ và tên không được để trống.";
      setError(msg);
      toast.warning(msg);
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccess(false);

      const cleanAvatar = avatarUrl.trim();
      const res = await updateProfile({
        name: name.trim(),
        avatarUrl: cleanAvatar,
        avatar_url: cleanAvatar,
      });

      if (!res.ok) {
        const msg = res.error || "Không thể cập nhật hồ sơ.";
        setError(msg);
        toast.error(msg);
      } else {
        setSuccess(true);
        toast.success("Thông tin cá nhân đã được lưu!", "Cập nhật thành công");
        await refreshUser();
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      const msg = err.message || "Đã xảy ra lỗi khi lưu thông tin.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPoints = user?.points || 0;
  const currentCheckins = user?.checkin_count ?? user?.checkinCount ?? 0;

  // Tính cấp bậc du khách theo điểm số
  const getBadgeTitle = (pts: number) => {
    if (pts >= 1000) return { title: "Đại Sứ Du Lịch Cố Đô", color: "from-amber-500 to-yellow-600", text: "text-amber-700 bg-amber-50 border-amber-200" };
    if (pts >= 500) return { title: "Nhà Thám Hiểm Huê Di Mô", color: "from-purple-500 to-indigo-600", text: "text-purple-700 bg-purple-50 border-purple-200" };
    if (pts >= 200) return { title: "Lữ Khách Sành Sỏi", color: "from-blue-500 to-teal-600", text: "text-blue-700 bg-blue-50 border-blue-200" };
    return { title: "Tân Binh Khám Phá", color: "from-emerald-500 to-teal-600", text: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  };

  const rankBadge = getBadgeTitle(currentPoints);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header với Cover Banner Tinh Tế */}
        <div className="h-28 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 relative flex items-center justify-end px-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition backdrop-blur-md"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung Modal */}
        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar Container */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-14 mb-4 gap-3">
            <div className="relative group w-24 h-24 rounded-2xl p-1 bg-white dark:bg-slate-900 shadow-xl inline-block">
              <div className="w-full h-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={name || "Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-10 h-10 text-slate-400" />
                )}

                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Nút Upload Avatar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition hover:scale-105 active:scale-95"
                title="Thay đổi ảnh đại diện"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>

            {/* Thống kê điểm thưởng & Lượt Check-in */}
            <div className="flex items-center gap-2">
              <div className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-center gap-2">
                <div className="p-1 rounded-lg bg-amber-500 text-white shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">
                    Điểm tích luỹ
                  </p>
                  <p className="text-sm font-black text-amber-900 dark:text-amber-200">
                    {currentPoints.toLocaleString()} pts
                  </p>
                </div>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 flex items-center gap-2">
                <div className="p-1 rounded-lg bg-emerald-600 text-white shadow-sm">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                    Đã Check-in
                  </p>
                  <p className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                    {currentCheckins} điểm
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cấp bậc Danh hiệu du khách */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Danh hiệu khám phá</p>
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md border mt-0.5 ${rankBadge.text}`}>
                  {rankBadge.title}
                </span>
              </div>
            </div>

            {onOpenLeaderboard && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLeaderboard();
                }}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 hover:underline"
              >
                Xem BXH &rarr;
              </button>
            )}
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeTab === "info"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              👤 Thông tin cá nhân
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("places")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "places"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <span>📍 Địa điểm đã thêm</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold">
                {userContributedPlaces.length}
              </span>
            </button>
          </div>

          {activeTab === "info" ? (
            /* Form cập nhật thông tin */
            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Cập nhật hồ sơ cá nhân thành công!</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Họ và tên hiển thị
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn Huế"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Địa chỉ Email (Không thay đổi)
                  </label>
                  {user?.provider && user.provider !== "local" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                      {user.provider === "google" ? "Tài khoản Google" : user.provider === "facebook" ? "Tài khoản Facebook" : user.provider}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      Email cục bộ
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
                  />
                  <ShieldCheck className="w-4 h-4 text-emerald-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Đường dẫn Ảnh đại diện (Tuỳ chọn hoặc Upload phía trên)
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-lg shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu thay đổi</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Tab: Danh sách địa điểm đã thêm */
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {userContributedPlaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center text-2xl mb-2">
                    📍
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Chưa có địa điểm nào được thêm
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                    Bạn có thể bấm vào nút &quot;Thêm địa điểm&quot; ở góc trên bản đồ để đóng góp địa điểm mới cho Cố đô Huế.
                  </p>
                </div>
              ) : (
                userContributedPlaces.map((place) => {
                  const cat = getCategory(place.category);
                  const thumb = place.images?.[0] || place.imageUrl || place.image_url;
                  return (
                    <div
                      key={place.id}
                      className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-lg shadow-xs overflow-hidden relative"
                          style={{ background: cat.color }}
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={place.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{cat.emoji}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                              {place.name}
                            </h4>
                            {place.status === "pending" && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                ⏳ Chờ duyệt
                              </span>
                            )}
                            {(!place.status || place.status === "approved") && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                ✅ Đã duyệt
                              </span>
                            )}
                            {place.status === "rejected" && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                                ❌ Từ chối
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {place.address || cat.label}
                          </p>
                        </div>
                      </div>

                      {onSelectPlace && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectPlace(place);
                          }}
                          className="shrink-0 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-emerald-500 hover:text-emerald-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          title="Xem chi tiết trên bản đồ"
                        >
                          <span>📍</span>
                          <span>Xem</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
