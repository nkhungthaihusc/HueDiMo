"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Place, Review } from "@/lib/types";
import { getCategory } from "@/lib/data/categories";
import { getReviews, addReview, averageRating } from "@/lib/review/logic";
import { calculateDistanceKm } from "@/lib/itinerary/types";
import { getPlaceSpecifics } from "@/lib/data/placeSpecifics";
import { ReviewAPI } from "@/lib/api/reviews";
import { uploadMedia } from "@/lib/api/media";
import { useAuth } from "@/components/auth/AuthProvider";
import { checkinPlace } from "@/lib/api/leaderboard";
import Link from "next/link";
import AuthPromptModal from "@/components/auth/AuthPromptModal";

interface PlaceDetailPanelProps {
  place: Place;
  onBack: () => void;
  onAddToItinerary?: (place: Place) => void;
  userLocation?: { lat: number; lng: number } | null;
}

function Stars({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-base",
    lg: "text-2xl",
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const isClickable = onChange !== undefined;
        return (
          <button
            key={star}
            type="button"
            disabled={!isClickable}
            onClick={() => onChange?.(star)}
            className={`${sizeClasses[size]} transition-all duration-150 ${isClickable ? "cursor-pointer hover:scale-125" : "cursor-default"
              } ${filled ? "text-amber-400 drop-shadow-sm" : "text-ink-200"}`}
            aria-label={`${star} sao`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Mới đây";
  }
}

function formatBestTime(val?: string): string {
  if (!val) return "";
  const map: Record<string, string> = {
    morning: "Buổi sáng sớm (07:00 - 10:30)",
    afternoon: "Buổi chiều mát (14:30 - 17:00)",
    sunset: "Hoàng hôn chiều tà (16:30 - 18:00)",
    sunrise: "Bình minh sáng sớm (05:00 - 06:30)",
    evening: "Buổi tối lung linh (18:30 - 22:00)",
    all_day: "Cả ngày (bất kỳ thời điểm nào)",
  };
  return map[val.toLowerCase().trim()] || val;
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function PlaceDetailPanel({
  place,
  onBack,
  onAddToItinerary,
  userLocation,
}: PlaceDetailPanelProps) {
  const [reviews, setReviews] = useState<Review[]>(() => getReviews(place.id));
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "reviews">("info");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Auth & Checkin State
  const { user, refreshUser } = useAuth();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    icon?: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
  });

  const handleCheckin = async () => {
    if (!user) {
      setAuthModal({
        isOpen: true,
        title: "Đăng nhập để Check-in",
        description: "Đăng nhập tài khoản để check-in tại danh thắng Huế và nhận 100 điểm thưởng nâng thứ hạng du khách!",
        icon: "📍",
      });
      setCheckinMessage({
        type: "error",
        text: "Vui lòng đăng nhập tài khoản để check-in nhận điểm thưởng!",
      });
      setTimeout(() => setCheckinMessage(null), 4000);
      return;
    }

    try {
      setIsCheckingIn(true);
      setCheckinMessage(null);

      // 1. Xác định vị trí GPS thực tế hiện tại của du khách
      let currentCoords: { lat: number; lng: number } | null = userLocation
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : null;

      // Cố gắng truy vấn GPS mới nhất từ trình duyệt
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 6000,
              maximumAge: 10000,
            });
          });
          currentCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
        } catch {
          // Dùng userLocation fallback nếu navigator.geolocation timeout hoặc bị chặn
        }
      }

      if (!currentCoords) {
        setCheckinMessage({
          type: "error",
          text: "📍 Không thể xác định vị trí của bạn. Vui lòng bật định vị GPS trên trình duyệt để xác thực bạn đang ở địa điểm (bán kính 500m)!",
        });
        setTimeout(() => setCheckinMessage(null), 6000);
        return;
      }

      // 2. Tính khoảng cách đường chim bay đến địa điểm
      const distMeters = calculateDistanceMeters(
        currentCoords.lat,
        currentCoords.lng,
        place.lat,
        place.lng
      );

      const MAX_CHECKIN_RADIUS_METERS = 500; // Bán kính tối đa 500m theo yêu cầu

      if (distMeters > MAX_CHECKIN_RADIUS_METERS) {
        const distDisplay =
          distMeters >= 1000
            ? `${(distMeters / 1000).toFixed(1)} km`
            : `${Math.round(distMeters)} mét`;

        setCheckinMessage({
          type: "error",
          text: `📍 Bạn đang ở cách ${place.name} khoảng ${distDisplay}. Bạn cần có mặt trong bán kính 500m của địa điểm để có thể check-in nhận điểm!`,
        });
        setTimeout(() => setCheckinMessage(null), 7000);
        return;
      }

      // 3. Đạt điều kiện vị trí (<= 500m) -> Gửi check-in lên server
      const res = await checkinPlace(place.id, undefined, currentCoords);
      if (!res.ok) {
        setCheckinMessage({
          type: "error",
          text: res.error || "Check-in không thành công.",
        });
      } else {
        const roundedM = Math.round(distMeters);
        setCheckinMessage({
          type: "success",
          text: `🎉 Check-in thành công tại ${place.name}! (Vị trí hợp lệ: cách ${roundedM}m). Bạn nhận được +${res.pointsEarned || 100} điểm!`,
        });
        await refreshUser();
      }
    } catch {
      setCheckinMessage({
        type: "error",
        text: "Có lỗi xảy ra khi check-in. Vui lòng thử lại sau.",
      });
    } finally {
      setIsCheckingIn(false);
      setTimeout(() => setCheckinMessage(null), 7000);
    }
  };

  // Review Form State
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Đồng bộ đánh giá từ backend khi mở địa điểm
  useEffect(() => {
    let isMounted = true;

    // Khởi tạo từ local trước
    const local = getReviews(place.id);
    setReviews(local);

    async function fetchBackendReviews() {
      setIsLoadingReviews(true);
      try {
        const backendReviews = await ReviewAPI.getPlaceReviews(place.id);
        if (isMounted) {
          if (backendReviews && backendReviews.length > 0) {
            // Hợp nhất backend reviews và local reviews, tránh trùng ID
            const backendIds = new Set(backendReviews.map((r) => r.id));
            const uniqueLocal = local.filter((r) => !backendIds.has(r.id));
            setReviews([...backendReviews, ...uniqueLocal]);
          }
        }
      } catch (err) {
        console.error("Lỗi tải reviews từ server:", err);
      } finally {
        if (isMounted) setIsLoadingReviews(false);
      }
    }

    fetchBackendReviews();
    return () => {
      isMounted = false;
    };
  }, [place.id]);

  const [heroImageError, setHeroImageError] = useState(false);

  // Reset index ảnh và error khi chuyển sang địa điểm khác
  useEffect(() => {
    setCurrentImageIndex(0);
    setHeroImageError(false);
  }, [place.id]);

  const handleBack = () => {
    onBack();
  };

  const cat = getCategory(place.category);
  const avg = averageRating(place.id) ?? (place.rating > 0 ? place.rating : 0);
  const reviewCount = reviews.length;

  const distanceToUser = useMemo(() => {
    if (!userLocation) return null;
    return calculateDistanceMeters(userLocation.lat, userLocation.lng, place.lat, place.lng);
  }, [userLocation, place.lat, place.lng]);

  const distanceToUserKM = useMemo(() => {
    if (!userLocation) return null;
    return calculateDistanceKm(userLocation.lat, userLocation.lng, place.lat, place.lng);
  }, [userLocation, place.lat, place.lng]);

  const specifics = useMemo(() => getPlaceSpecifics(place), [place]);

  const images: string[] =
    place.images && place.images.length > 0
      ? place.images
      : place.imageUrl
        ? [place.imageUrl]
        : place.image_url
          ? [place.image_url]
          : [];

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === "ArrowLeft") handlePrevImage();
      if (e.key === "ArrowRight") handleNextImage();
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
        setLightboxImage(null);
      }
    },
    [isLightboxOpen, images.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleCopy = () => {
    const text = `${place.name} - ${place.address || "TP. Huế"}`;
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleOpenGoogleMaps = () => {
    const originParam = userLocation
      ? `&origin=${userLocation.lat},${userLocation.lng}`
      : "";
    const url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${place.lat},${place.lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Xử lý upload ảnh đánh giá lên Supabase Storage
  const handleSelectReviewImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (reviewImages.length >= 5) {
      setReviewError("Bạn chỉ có thể đính kèm tối đa 5 ảnh cho mỗi đánh giá.");
      return;
    }

    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      setReviewError("Dung lượng ảnh không được vượt quá 10MB.");
      return;
    }

    try {
      setIsUploadingImage(true);
      setReviewError(null);
      const uploadedUrl = await uploadMedia(file, "reviews");
      if (uploadedUrl) {
        setReviewImages((prev) => [...prev, uploadedUrl]);
      }
    } catch (err: any) {
      setReviewError(err.message || "Tải ảnh lên Supabase thất bại.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveReviewImage = (indexToRemove: number) => {
    setReviewImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModal({
        isOpen: true,
        title: "Đăng nhập để gửi đánh giá",
        description: "Bạn cần đăng nhập tài khoản HueDiMo để gửi chấm điểm sao và nhận xét trải nghiệm tại địa điểm này.",
        icon: "✍️",
      });
      return;
    }
    if (!comment.trim() || isSubmittingReview) return;

    try {
      setIsSubmittingReview(true);
      setReviewError(null);

      const reviewPayload = {
        authorName: user.name?.trim() || "Du khách HueDiMo",
        rating,
        comment: comment.trim(),
        images: reviewImages,
      };

      // Gửi lên server backend Supabase
      const newReview = await ReviewAPI.createReview(place.id, reviewPayload);

      // Cập nhật UI ngay lập tức
      setReviews((prev) => [newReview, ...prev]);

      // Đồng thời lưu vào local storage để offline-first
      addReview({
        placeId: place.id,
        authorName: reviewPayload.authorName,
        rating: reviewPayload.rating,
        comment: reviewPayload.comment,
      });

      // Reset form
      setComment("");
      setAuthorName("");
      setReviewImages([]);
    } catch (err: any) {
      setReviewError(err.message || "Không thể gửi đánh giá lúc này.");
    } finally {
      setIsSubmittingReview(false);
    }
  };


  return (
    <>
      <div
        className={`glass-strong pointer-events-auto flex h-full w-full max-w-[calc(100vw-1rem)] sm:w-[410px] sm:max-w-[410px] flex-col overflow-hidden rounded-3xl border border-white/40 shadow-2xl backdrop-blur-xl transition-all duration-200 ease-out ${isClosing
          ? "opacity-0 translate-x-10 scale-95 pointer-events-none"
          : "opacity-100 translate-x-0 scale-100 animate-in fade-in slide-in-from-right-4"
          }`}
      >
        {/* Top Hero: Image Slider hoặc Gradient Banner */}
        <div className="relative h-60 w-full shrink-0 overflow-hidden bg-ink-900 select-none">
          {images.length > 0 && !heroImageError ? (
            <div
              className="group relative h-full w-full cursor-pointer"
              onClick={() => setIsLightboxOpen(true)}
              title="Nhấn để xem ảnh phóng to"
            >
              <img
                src={images[currentImageIndex]}
                alt={`${place.name} - ảnh ${currentImageIndex + 1}`}
                draggable={false}
                onError={() => setHeroImageError(true)}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105 pointer-events-auto select-none"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 pointer-events-none" />

              {/* Điều hướng chuyển ảnh */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md opacity-80 transition hover:scale-110 hover:bg-black/80 hover:opacity-100 cursor-pointer select-none"
                    aria-label="Ảnh trước"
                  >
                    <span className="pointer-events-none select-none text-base">‹</span>
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md opacity-80 transition hover:scale-110 hover:bg-black/80 hover:opacity-100 cursor-pointer select-none"
                    aria-label="Ảnh tiếp theo"
                  >
                    <span className="pointer-events-none select-none text-base">›</span>
                  </button>

                  {/* Chấm tròn chỉ báo slide với vùng bấm tối ưu */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(idx);
                        }}
                        className="flex h-5 items-center justify-center p-1 cursor-pointer select-none"
                        aria-label={`Chuyển đến ảnh ${idx + 1}`}
                      >
                        <span
                          className={`h-1.5 rounded-full transition-all pointer-events-none ${idx === currentImageIndex ? "w-5 bg-white shadow-sm" : "w-1.5 bg-white/50"
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Badge số lượng ảnh & nút zoom */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md pointer-events-none select-none">
                <span>📷 {currentImageIndex + 1}/{images.length}</span>
                <span className="text-white/60">· Phóng to</span>
              </div>
            </div>
          ) : (
            <div
              className="relative flex h-full w-full flex-col justify-end p-5 select-none"
              style={{
                background: `linear-gradient(135deg, ${cat.color} 0%, #0f172a 100%)`,
              }}
            >
              <div className="absolute top-4 right-4 text-6xl opacity-30 drop-shadow-md">{cat.emoji}</div>
              <p className="text-sm font-bold text-white tracking-wide drop-shadow-md">{place.name}</p>
              <p className="text-xs text-white/80 font-medium">Bản đồ Du lịch Huế · HueDiMo</p>
            </div>
          )}

          {/* Top Bar Navigation: Chỉ giữ Nút Quay lại (bỏ nút X theo yêu cầu) */}
          <div className="absolute left-0 right-0 top-0 z-40 flex items-center p-3.5 pointer-events-none select-none">
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleBack();
              }}
              className="pointer-events-auto flex h-10 items-center gap-2 rounded-full bg-slate-950/85 hover:bg-slate-950 px-4 text-xs font-bold text-white backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl border border-white/30 cursor-pointer select-none"
              aria-label="Quay lại danh sách"
            >
              <span className="text-base leading-none pointer-events-none select-none">←</span>
              <span className="pointer-events-none select-none">Quay lại</span>
            </button>
          </div>
        </div>

        {/* Header Thông tin Địa điểm */}
        <div className="border-b border-ink-100 bg-white/80 p-4 pb-3">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: cat.color }}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </span>

            {place.status === "pending" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-800">
                <span>⏳</span>
                <span>Chờ BQT duyệt</span>
              </span>
            )}

            {place.isLocal && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-medium text-emerald-800">
                <span>🌿</span>
                <span>Người Huế khuyên đi</span>
              </span>
            )}

            {typeof place.price === "number" && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {place.price === 0
                  ? "Miễn phí vé"
                  : `~${place.price.toLocaleString("vi-VN")} đ`}
              </span>
            )}
          </div>

          {place.status === "pending" && (
            <div className="mb-2.5 flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200/80 p-2.5 text-amber-900 shadow-2xs text-xs">
              <span className="text-sm">⏳</span>
              <div>
                <div className="font-bold text-amber-950">Địa điểm đóng góp đang chờ phê duyệt</div>
                <div className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  Địa điểm của bạn đã được gửi thành công. Sau khi Ban Quản Trị xác nhận, địa điểm sẽ hiển thị công khai cho tất cả du khách.
                </div>
              </div>
            </div>
          )}

          <h2 className="text-xl font-extrabold text-ink-900 leading-snug">
            {place.name}
          </h2>

          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Stars value={Math.round(avg)} size="sm" />
              <span className="text-sm font-bold text-ink-900">{avg.toFixed(1)}</span>
              <span className="text-xs text-ink-500">
                ({reviewCount} nhận xét)
              </span>
            </div>

            {place.duration && (
              <span className="text-xs font-medium text-ink-600 bg-ink-100/80 px-2 py-0.5 rounded-md">
                ⏳ {place.duration}
              </span>
            )}
          </div>

          {distanceToUser !== null && (
            <div
              className={`mt-2.5 flex items-center justify-between rounded-xl px-3 py-1.5 text-xs shadow-2xs border ${distanceToUser <= 500
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-800"
                : "bg-blue-50/90 border-blue-100 text-blue-800"
                }`}
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${distanceToUser <= 500 ? "bg-emerald-400" : "bg-blue-400"
                      }`}
                  ></span>
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${distanceToUser <= 500 ? "bg-emerald-600" : "bg-blue-600"
                      }`}
                  ></span>
                </span>
                <span className="font-semibold">
                  {distanceToUser <= 500
                    ? `Đủ điều kiện check-in (cách ~${Math.round(distanceToUser)}m)`
                    : distanceToUser < 1000
                      ? `Cách bạn: ~${Math.round(distanceToUser)}m`
                      : `Cách bạn: ~${(distanceToUser / 1000).toFixed(2)} km`}
                </span>
              </div>
              <span className="text-[10px] font-bold opacity-80">
                {distanceToUser <= 500 ? "✓ Bán kính ≤ 500m" : "Check-in ≤ 500m"}
              </span>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="mt-3.5 grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={handleCheckin}
              disabled={isCheckingIn}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 py-2 px-1 text-[11px] font-bold text-white shadow-sm transition-all duration-150 hover:from-emerald-600 hover:to-teal-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer select-none"
              title="Check-in nhận 100 điểm thưởng"
            >
              <span className="pointer-events-none select-none">{isCheckingIn ? "⏳" : "📍"}</span>
              <span className="pointer-events-none select-none">{isCheckingIn ? "..." : "Check-in"}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenGoogleMaps}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-brand-500 py-2 px-1 text-[11px] font-bold text-white shadow-sm transition-all duration-150 hover:bg-brand-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer select-none"
            >
              <span className="pointer-events-none select-none">🧭</span>
              <span className="pointer-events-none select-none">Chỉ đường</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-ink-200 bg-white/90 py-2 px-1 text-[11px] font-bold text-ink-800 shadow-sm transition-all duration-150 hover:bg-ink-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer select-none"
            >
              <span className="pointer-events-none select-none">{isCopied ? "✓" : "🔗"}</span>
              <span className="pointer-events-none select-none">{isCopied ? "Đã chép" : "Sao chép"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reviews")}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-ink-200 bg-white/90 py-2 px-1 text-[11px] font-bold text-ink-800 shadow-sm transition-all duration-150 hover:bg-ink-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer select-none"
            >
              <span className="pointer-events-none select-none">✍️</span>
              <span className="pointer-events-none select-none">Đánh giá</span>
            </button>
          </div>

          {/* Thông báo Check-in */}
          {checkinMessage && (
            <div
              className={`mt-2.5 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 ${checkinMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
            >
              <span className="pointer-events-none select-none">{checkinMessage.type === "success" ? "✨" : "⚠️"}</span>
              <span className="pointer-events-none select-none">{checkinMessage.text}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation: Tổng quan & Đánh giá */}
        <div className="mx-3.5 my-2 flex rounded-2xl bg-ink-100/80 p-1 backdrop-blur-sm select-none">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-center text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer select-none ${activeTab === "info"
              ? "bg-white text-brand-700 shadow-sm ring-1 ring-black/5"
              : "text-ink-600 hover:text-ink-900 hover:bg-white/50"
              }`}
          >
            <span className="pointer-events-none select-none">📋 Thông tin chi tiết</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-center text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer select-none ${activeTab === "reviews"
              ? "bg-white text-brand-700 shadow-sm ring-1 ring-black/5"
              : "text-ink-600 hover:text-ink-900 hover:bg-white/50"
              }`}
          >
            <span className="pointer-events-none select-none">⭐ Đánh giá</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold pointer-events-none select-none ${activeTab === "reviews"
                ? "bg-brand-600 text-white"
                : "bg-ink-200 text-ink-700"
                }`}
            >
              {reviewCount}
            </span>
          </button>
        </div>

        {/* Nội dung cuộn mượt mà */}
        <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-4 space-y-4">
          {activeTab === "info" ? (
            <div key="tab-info" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
              {/* Mô tả giới thiệu */}
              {place.description && (
                <div className="rounded-2xl bg-white/70 p-3.5 shadow-sm border border-white/60">
                  <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-500">
                    Giới thiệu
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-800 whitespace-pre-line">
                    {place.description}
                  </p>
                </div>
              )}

              {/* Điểm nổi bật (Highlights) */}
              {place.highlights && place.highlights.length > 0 && (
                <div className="rounded-2xl bg-white/70 p-3.5 shadow-sm border border-white/60">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">
                    Điểm nhấn / Món nổi bật
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {place.highlights.map((item, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-brand-50 border border-brand-200 px-2.5 py-1 text-xs font-medium text-brand-800"
                      >
                        ✨ {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 1. THỰC ĐƠN ĐẶC SẮC (Dành riêng cho Nhà hàng, Quán ăn, Quán Cà phê) */}
              {specifics.menu && specifics.menu.length > 0 && (
                <div className="rounded-2xl bg-white/80 p-4 shadow-sm border border-white/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/15 text-sm text-orange-600">
                        {place.category === "coffee" ? "☕" : "🍽️"}
                      </span>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700">
                          {place.category === "coffee" ? "Thực đơn đồ uống & Đặc sản" : "Thực đơn đặc sắc & Món nổi bật"}
                        </h3>
                        {specifics.cuisineType && (
                          <p className="text-[11px] text-ink-500">{specifics.cuisineType}</p>
                        )}
                      </div>
                    </div>
                    {specifics.priceRangeText && (
                      <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-800">
                        {specifics.priceRangeText}
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-ink-100/80">
                    {specifics.menu.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between py-2 gap-2 text-xs">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-ink-900">{item.name}</span>
                            {item.isSignature && (
                              <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-500/30">
                                ⭐ Món phải thử
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-ink-500 mt-0.5 leading-snug">{item.description}</p>
                          )}
                        </div>
                        <span className="font-extrabold text-brand-600 shrink-0 text-xs">
                          {item.price.toLocaleString("vi-VN")} đ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. BẢNG GIÁ VÉ THAM QUAN (Dành cho Di tích cổ, Lăng tẩm, Văn hóa, Danh lam) */}
              {specifics.tickets && specifics.tickets.length > 0 && (
                <div className="rounded-2xl bg-white/80 p-4 shadow-sm border border-white/70 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/15 text-sm text-purple-600">
                      🎟️
                    </span>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700">
                        Bảng giá vé tham quan
                      </h3>
                      <p className="text-[11px] text-ink-500">Giá vé niêm yết chính thức tại điểm</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {specifics.tickets.map((t, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl p-2.5 border ${t.price === 0
                          ? "bg-emerald-50/70 border-emerald-200/80 text-emerald-900"
                          : "bg-ink-50/70 border-ink-200/70 text-ink-900"
                          }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold">{t.type}</span>
                          <span className={`font-bold ${t.price === 0 ? "text-emerald-700 font-extrabold" : "text-purple-700 font-bold"}`}>
                            {t.price === 0 ? "Miễn phí" : `${t.price.toLocaleString("vi-VN")} đ`}
                          </span>
                        </div>
                        {t.note && <p className="text-[10px] text-ink-500 mt-1">{t.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. QUY ĐỊNH TRANG PHỤC & VĂN HÓA THAM QUAN (Di tích, Chùa & Tâm linh) */}
              {(specifics.dressCode || (specifics.rules && specifics.rules.length > 0)) && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5 space-y-2 text-xs text-amber-900">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <span className="text-base">👔</span>
                    <span>Quy định trang phục & Văn hóa ứng xử</span>
                  </div>

                  {specifics.dressCode && (
                    <div className="rounded-xl bg-white/80 p-2.5 text-xs text-amber-950 border border-amber-200/60 flex items-start gap-2">
                      <span className="text-sm">✨</span>
                      <p className="leading-snug font-medium">{specifics.dressCode}</p>
                    </div>
                  )}

                  {specifics.rules && specifics.rules.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900/90 pl-1">
                      {specifics.rules.map((rule, idx) => (
                        <li key={idx} className="leading-relaxed">{rule}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* 4. THÔNG TIN KHÁCH SẠN & LƯU TRÚ (Dành riêng cho Khách sạn / Homestay) */}
              {specifics.hotel && (
                <div className="rounded-2xl bg-white/80 p-4 shadow-sm border border-white/70 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/15 text-sm text-cyan-600">
                        🏨
                      </span>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700">
                          Thông tin lưu trú & Giờ nhận phòng
                        </h3>
                        <p className="text-[11px] text-ink-500">Khách sạn & Homestay Huế</p>
                      </div>
                    </div>
                    {specifics.hotel.priceRange && (
                      <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[11px] font-bold text-cyan-800">
                        {specifics.hotel.priceRange}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-cyan-50/60 p-2 border border-cyan-100">
                      <span className="text-[10px] text-ink-500 block">Giờ nhận phòng (Check-in)</span>
                      <span className="font-bold text-cyan-900 text-sm">{specifics.hotel.checkInTime || "14:00"}</span>
                    </div>
                    <div className="rounded-xl bg-cyan-50/60 p-2 border border-cyan-100">
                      <span className="text-[10px] text-ink-500 block">Giờ trả phòng (Check-out)</span>
                      <span className="font-bold text-cyan-900 text-sm">{specifics.hotel.checkOutTime || "12:00"}</span>
                    </div>
                  </div>

                  {specifics.hotel.roomTypes && specifics.hotel.roomTypes.length > 0 && (
                    <div className="space-y-1 mt-1">
                      <span className="text-[11px] font-semibold text-ink-600 block">Hạng phòng tiêu biểu:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {specifics.hotel.roomTypes.map((rt, idx) => (
                          <span key={idx} className="rounded-lg bg-ink-100/70 px-2 py-0.5 text-[11px] text-ink-800 font-medium">
                            🛏️ {rt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. HOẠT ĐỘNG TRẢI NGHIỆM (Thiên nhiên, Bãi biển, Giải trí, Làng nghề) */}
              {specifics.activities && specifics.activities.length > 0 && (
                <div className="rounded-2xl bg-white/80 p-3.5 shadow-sm border border-white/70 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏄</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700">
                      Hoạt động & Trải nghiệm thú vị
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {specifics.activities.map((act, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-ink-800">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span className="leading-snug">{act}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. ĐẶC SẢN NÊN MUA LÀM QUÀ (Làng nghề, Chợ, Mua sắm) */}
              {specifics.specialtiesToBuy && specifics.specialtiesToBuy.length > 0 && (
                <div className="rounded-2xl bg-white/80 p-3.5 shadow-sm border border-white/70 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎁</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700">
                      Đặc sản xứ Huế nên mua làm quà
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {specifics.specialtiesToBuy.map((item, idx) => (
                      <span key={idx} className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-800">
                        🛍️ {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. TIỆN ÍCH TẠI ĐIỂM */}
              {specifics.amenities && specifics.amenities.length > 0 && (
                <div className="rounded-2xl bg-white/70 p-3.5 shadow-sm border border-white/60 text-xs">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-500 mb-2">
                    Tiện ích & Dịch vụ tại điểm
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {specifics.amenities.map((amenity, idx) => (
                      <span key={idx} className="rounded-lg bg-ink-100/80 px-2 py-0.5 text-[11px] font-medium text-ink-700">
                        ✓ {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Lưới thông số thực tế */}
              <div className="rounded-2xl bg-white/70 p-3.5 shadow-sm border border-white/60 space-y-2.5 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                  Thông tin tham quan
                </h3>

                {place.address && (
                  <div className="flex items-start gap-2.5 text-ink-800">
                    <span className="text-base leading-none">📍</span>
                    <div>
                      <span className="font-semibold block text-ink-900">Địa chỉ:</span>
                      <span>{place.address}</span>
                    </div>
                  </div>
                )}

                {place.openingHours && (
                  <div className="flex items-start gap-2.5 text-ink-800">
                    <span className="text-base leading-none">⏰</span>
                    <div>
                      <span className="font-semibold block text-ink-900">Thời gian mở cửa:</span>
                      <span>{place.openingHours}</span>
                    </div>
                  </div>
                )}

                {place.bestTime && (
                  <div className="flex items-start gap-2.5 text-ink-800">
                    <span className="text-base leading-none">🌅</span>
                    <div>
                      <span className="font-semibold block text-ink-900">Thời điểm đẹp nhất:</span>
                      <span>{formatBestTime(place.bestTime)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2.5 text-ink-800">
                  <span className="text-base leading-none">🌐</span>
                  <div>
                    <span className="font-semibold block text-ink-900">Tọa độ GPS:</span>
                    <span className="font-mono text-[11px] text-ink-600">
                      {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ghi chú & Lưu ý */}
              {place.notes && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <span>💡</span>
                    <span>Lưu ý cho du khách</span>
                  </div>
                  <p className="leading-relaxed">{place.notes}</p>
                </div>
              )}
            </div>
          ) : (
            /* Tab Đánh giá & Nhận xét */
            <div key="tab-reviews" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
              {/* Điểm tổng quan */}
              <div className="flex items-center gap-4 rounded-2xl bg-white/80 p-4 shadow-sm border border-white/60">
                <div className="flex flex-col items-center justify-center rounded-2xl bg-brand-500 px-4 py-3 text-white">
                  <span className="text-2xl font-black">{avg.toFixed(1)}</span>
                  <span className="text-[10px] uppercase font-bold text-white/80">trên 5</span>
                </div>
                <div className="flex-1">
                  <Stars value={Math.round(avg)} size="md" />
                  <p className="mt-1 text-xs text-ink-600">
                    Dựa trên <strong>{reviewCount}</strong> lượt đánh giá từ khách du lịch.
                  </p>
                </div>
              </div>

              {/* Form gửi đánh giá hoặc Thẻ nhắc đăng nhập */}
              {!user ? (
                <div className="rounded-2xl bg-gradient-to-br from-indigo-50/90 via-emerald-50/60 to-white p-4 border border-emerald-200/70 text-center space-y-3 shadow-xs">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-xs border border-emerald-100 text-xl">
                    ✍️
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Đăng nhập để gửi đánh giá
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-600 leading-relaxed max-w-xs mx-auto">
                      Đăng nhập tài khoản HueDiMo để chấm điểm sao, chia sẻ cảm nhận và đăng tải hình ảnh trải nghiệm thực tế của bạn tại <strong className="text-slate-800">{place.name}</strong>.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Link
                      href="/login"
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95"
                    >
                      Đăng nhập ngay
                    </Link>
                    <Link
                      href="/register"
                      className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition active:scale-95"
                    >
                      Đăng ký
                    </Link>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmitReview}
                  className="rounded-2xl bg-white/80 p-3.5 shadow-sm border border-white/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wider">
                      Gửi cảm nhận của bạn
                    </h4>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      👤 {user.name}
                    </span>
                  </div>

                  {reviewError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-2 text-[11px] text-red-600">
                      ⚠️ {reviewError}
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-ink-700">
                      Số sao bạn muốn chấm:
                    </label>
                    <Stars value={rating} onChange={setRating} size="lg" />
                  </div>

                  <div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Chia sẻ trải nghiệm thực tế, món ăn nên thử, góc chụp đẹp..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-brand-100 bg-white p-2 text-xs text-ink-900 outline-none placeholder:text-ink-400 focus:ring-2 focus:ring-brand-400 leading-relaxed"
                    />
                  </div>

                  {/* Phần Upload Ảnh Đánh Giá lên Supabase */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-ink-700">
                        Ảnh chụp thực tế ({reviewImages.length}/5)
                      </label>
                      <span className="text-[10px] text-ink-400">Tối đa 5 ảnh, 10MB/ảnh</span>
                    </div>

                    {/* Danh sách ảnh đã upload */}
                    {reviewImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {reviewImages.map((imgUrl, idx) => (
                          <div key={idx} className="relative group h-14 w-14 rounded-xl overflow-hidden border border-brand-200">
                            <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveReviewImage(idx)}
                              className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-[9px] text-white hover:bg-red-600 transition"
                              title="Xóa ảnh này"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Nút bấm chọn ảnh */}
                    {reviewImages.length < 5 && (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleSelectReviewImage}
                          disabled={isUploadingImage}
                          className="hidden"
                          id="review-image-input"
                        />
                        <label
                          htmlFor="review-image-input"
                          className={`inline-flex items-center gap-1.5 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100/60 cursor-pointer transition ${isUploadingImage ? "opacity-50 pointer-events-none" : ""
                            }`}
                        >
                          {isUploadingImage ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                              <span>Đang tải lên Supabase...</span>
                            </>
                          ) : (
                            <>
                              <span>📸</span>
                              <span>Thêm ảnh review</span>
                            </>
                          )}
                        </label>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!comment.trim() || isSubmittingReview || isUploadingImage}
                    className="w-full rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40 shadow-sm flex items-center justify-center gap-2 cursor-pointer select-none"
                  >
                    {isSubmittingReview ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent pointer-events-none" />
                        <span className="pointer-events-none select-none">Đang gửi đánh giá...</span>
                      </>
                    ) : (
                      <span className="pointer-events-none select-none">Gửi đánh giá ngay</span>
                    )}
                  </button>
                </form>
              )}

              {/* Danh sách nhận xét */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                    Tất cả đánh giá ({reviews.length})
                  </h4>
                  {isLoadingReviews && (
                    <span className="text-[10px] text-ink-400 animate-pulse">Đang cập nhật...</span>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <div className="rounded-2xl bg-white/60 p-4 text-center text-xs text-ink-500">
                    Chưa có đánh giá nào cho địa điểm này. Hãy là người đầu tiên chia sẻ cảm nhận nhé!
                  </div>
                ) : (
                  reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="rounded-2xl bg-white/80 p-3.5 shadow-sm border border-white/60 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                            {rev.authorName ? rev.authorName.charAt(0).toUpperCase() : "D"}
                          </div>
                          <span className="text-xs font-bold text-ink-900">
                            {rev.authorName}
                          </span>
                        </div>
                        <span className="text-[10px] text-ink-400">
                          {formatDate(rev.createdAt)}
                        </span>
                      </div>

                      <Stars value={rev.rating} size="sm" />

                      {rev.comment && (
                        <p className="text-xs leading-relaxed text-ink-700 pt-0.5">
                          {rev.comment}
                        </p>
                      )}

                      {/* Render ảnh đính kèm của review */}
                      {rev.images && rev.images.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {rev.images.map((imgUrl, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              onClick={() => {
                                setLightboxImage(imgUrl);
                                setIsLightboxOpen(true);
                              }}
                              className="h-16 w-16 overflow-hidden rounded-xl border border-brand-100/80 shadow-xs hover:opacity-90 hover:scale-105 transition"
                            >
                              <img
                                src={imgUrl}
                                alt={`Ảnh đánh giá ${imgIdx + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Phóng to Thư viện ảnh Toàn màn hình */}
      {isLightboxOpen && (images.length > 0 || lightboxImage) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => {
            setIsLightboxOpen(false);
            setLightboxImage(null);
          }}
        >
          <div
            className="relative flex max-h-[90vh] max-w-4xl flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng */}
            <button
              type="button"
              onClick={() => {
                setIsLightboxOpen(false);
                setLightboxImage(null);
              }}
              className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white transition hover:bg-white/40"
              aria-label="Đóng thư viện ảnh"
            >
              ✕
            </button>

            {/* Ảnh lớn */}
            <div className="relative overflow-hidden rounded-2xl shadow-2xl">
              <img
                src={lightboxImage || images[currentImageIndex]}
                alt={`${place.name} - ảnh lớn`}
                className="max-h-[70vh] w-auto object-contain"
              />

              {!lightboxImage && images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-2xl text-white transition hover:bg-black/90 hover:scale-110"
                    aria-label="Ảnh trước"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-2xl text-white transition hover:bg-black/90 hover:scale-110"
                    aria-label="Ảnh sau"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {/* Thông tin caption dưới ảnh */}
            <div className="mt-4 flex w-full items-center justify-between text-white">
              <div>
                <h3 className="text-base font-bold">{place.name}</h3>
                <p className="text-xs text-white/70">
                  {place.address || "Thành phố Huế"} · Ảnh {currentImageIndex + 1}/{images.length}
                </p>
              </div>

              {/* Thumbnails strip */}
              {images.length > 1 && (
                <div className="flex gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`h-12 w-16 overflow-hidden rounded-lg border-2 transition ${idx === currentImageIndex
                        ? "border-brand-400 scale-105"
                        : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                    >
                      <img src={img} alt="thumb" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal nhắc nhở đăng nhập */}
      <AuthPromptModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal((prev) => ({ ...prev, isOpen: false }))}
        title={authModal.title}
        description={authModal.description}
        icon={authModal.icon}
      />
    </>
  );
}