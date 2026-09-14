"use client";

import { useState, useRef, useEffect } from "react";
import type { CategoryId, Place } from "@/lib/types";
import { CATEGORIES } from "@/lib/data/categories";
import { addPlace } from "@/lib/addplace/logic";
import { contributePlace } from "@/lib/api/places";
import { uploadMultipleMedia } from "@/lib/api/media";
import { getReverseGeocode } from "@/lib/api/reverse-geocode";
import { toast } from "@/components/ui/Toast";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";

interface AddPlacePanelProps {
  position: { lat: number; lng: number };
  onCancel: () => void;
  onSubmit: (place: Place) => void;
}

const TIME_PRESETS = [
  { label: "07:00 - 17:30 (Di tích)", open: "07:00", close: "17:30", allDay: false },
  { label: "07:00 - 22:00 (Cà phê/Ăn uống)", open: "07:00", close: "22:00", allDay: false },
  { label: "06:00 - 18:00 (Chùa chiền)", open: "06:00", close: "18:00", allDay: false },
  { label: "17:00 - 23:00 (Phố đêm)", open: "17:00", close: "23:00", allDay: false },
  { label: "24/24 (Cả ngày)", open: "", close: "", allDay: true },
];

export default function AddPlacePanel({ position, onCancel, onSubmit }: AddPlacePanelProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategoryId>(CATEGORIES[0]?.id || "ancient");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [suggestedAddress, setSuggestedAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isManualAddress, setIsManualAddress] = useState(false);
  const isManualAddressRef = useRef(false);
  const [openTime, setOpenTime] = useState("07:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [isCustomText, setIsCustomText] = useState(false);
  const [openingHours, setOpeningHours] = useState("07:00 - 22:00");

  // Tự động reverse geocode toạ độ ghim để gợi ý trước địa chỉ cho người dùng
  useEffect(() => {
    let isMounted = true;
    setIsGeocoding(true);

    getReverseGeocode(position.lat, position.lng)
      .then((res) => {
        if (!isMounted) return;
        const resolved = res?.address || res?.fullAddress || "";
        setSuggestedAddress(resolved);
        if (resolved) {
          if (!isManualAddressRef.current || address.trim() === "") {
            setAddress(resolved);
          }
        }
      })
      .catch((err) => {
        console.warn("Lỗi lấy địa chỉ gợi ý từ toạ độ:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsGeocoding(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [position.lat, position.lng]);

  const handleApplySuggestedAddress = () => {
    if (suggestedAddress) {
      setAddress(suggestedAddress);
      setIsManualAddress(false);
      isManualAddressRef.current = false;
    }
  };

  const {
    containerRef: presetScrollRef,
    canScrollLeft: canPresetScrollLeft,
    canScrollRight: canPresetScrollRight,
    scrollPrev: scrollPresetPrev,
    scrollNext: scrollPresetNext,
    hasDraggedRef: hasPresetDraggedRef,
    dragProps: presetDragProps,
  } = useHorizontalScroll<HTMLDivElement>({ scrollAmount: 130, wheelMultiplier: 1.1 });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedImages.length + files.length > 5) {
      const msg = "Bạn chỉ có thể tải lên tối đa 5 ảnh.";
      setUploadError(msg);
      toast.warning(msg, "Quá giới hạn ảnh");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError("");
      const urls = await uploadMultipleMedia(Array.from(files), "places");
      setUploadedImages((prev) => [...prev, ...urls]);
      toast.success(`Đã tải lên ${urls.length} ảnh thành công!`);
    } catch (err: any) {
      const msg = err.message || "Tải ảnh lên máy chủ thất bại.";
      setUploadError(msg);
      toast.error(msg, "Lỗi tải ảnh");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (idxToRemove: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== idxToRemove));
  };

  const handleSubmit = async () => {
    if (!name.trim() || isSubmitting) return;

    if (isUploading) {
      toast.warning("Vui lòng đợi ảnh tải lên máy chủ hoàn tất trước khi gửi.", "Đang tải ảnh");
      return;
    }

    setIsSubmitting(true);
    try {
      const placeData = {
        name: name.trim(),
        category,
        lat: position.lat,
        lng: position.lng,
        description: description.trim(),
        price: price.trim() ? Number(price) : undefined,
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
        address: address.trim() || undefined,
        openingHours: openingHours.trim() || undefined,
        status: "pending" as const,
      };

      // Gửi lên backend API lưu vào PostgreSQL với status = 'pending'
      const res = await contributePlace(placeData);
      const createdPlace = res.place;

      // Cập nhật local storage
      addPlace(createdPlace);

      toast.success(
        "Đóng góp của bạn đã được gửi tới Ban Quản Trị và đang chờ phê duyệt trước khi hiển thị công khai trên bản đồ.",
        "Gửi địa điểm thành công!"
      );

      onSubmit(createdPlace);
    } catch (err: any) {
      toast.error(err.message || "Không thể gửi đóng góp địa điểm lên máy chủ.", "Lỗi gửi địa điểm");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pointer-events-auto flex h-full w-full max-w-[calc(100vw-1rem)] sm:w-[410px] sm:max-w-[410px] flex-col overflow-hidden rounded-3xl bg-white border border-slate-200/90 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-right-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <div className="flex h-8 sm:h-9 w-8 sm:w-9 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm text-base">
            📍
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">Thêm địa điểm mới</h2>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">Đóng góp điểm tham quan vào bản đồ Huế</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition active:scale-95 cursor-pointer ml-1"
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {/* Tọa độ đang ghim */}
        <div className="flex flex-col gap-1.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 to-purple-50/70 border border-indigo-100/90 p-3 text-indigo-900 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🎯</span>
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Toạ độ ghim</span>
            </div>
            <span className="font-mono text-xs font-semibold text-indigo-700 bg-white/90 px-2.5 py-0.5 rounded-lg border border-indigo-200/70 shadow-xs">
              {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            </span>
          </div>
          {isGeocoding ? (
            <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-medium animate-pulse mt-0.5">
              <span className="text-xs">⏳</span>
              <span>Đang định vị địa chỉ từ toạ độ...</span>
            </div>
          ) : suggestedAddress ? (
            <div className="flex items-start gap-1.5 text-[11px] text-indigo-950 font-medium mt-0.5">
              <span className="text-indigo-600 shrink-0">📍</span>
              <span className="line-clamp-2 leading-relaxed">{suggestedAddress}</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 font-normal leading-tight flex items-center gap-1 mt-0.5">
              <span>💡</span> Bấm vị trí khác trên bản đồ hoặc kéo ghim để đổi
            </p>
          )}
        </div>

        {/* Tên địa điểm */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Tên địa điểm *
          </label>
          <input
            type="text"
            value={name}
            placeholder="VD: Cà phê Muối Rùa, Chùa Huyền Không Sơn Thượng..."
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
          />
        </div>

        {/* Phân loại */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Thể loại
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryId)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji} {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Upload hình ảnh trực tiếp lên Supabase */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Hình ảnh ({uploadedImages.length}/5)
            </label>
            <span className="text-[10px] text-slate-400">Chọn ảnh trực tiếp</span>
          </div>

          <div className="space-y-2">
            {uploadedImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {uploadedImages.map((url, idx) => (
                  <div key={idx} className="relative h-16 w-16 rounded-xl overflow-hidden border border-slate-200 group">
                    <img src={url} alt={`Ảnh ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] shadow-sm hover:scale-110 transition cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadedImages.length < 5 && (
              <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-3 hover:border-indigo-400 hover:bg-indigo-50/30 transition cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesSelected}
                  className="hidden"
                  disabled={isUploading}
                />
                <span className="text-xl mb-1">{isUploading ? "⏳" : "📷"}</span>
                <span className="text-xs font-semibold text-slate-700">
                  {isUploading ? "Đang tải ảnh lên Cloud..." : "Tải ảnh từ máy lên"}
                </span>
                <span className="text-[10px] text-slate-400">PNG, JPG, WEBP tối đa 10MB</span>
              </label>
            )}

            {uploadError && (
              <p className="text-[11px] text-rose-600 font-medium">⚠️ {uploadError}</p>
            )}
          </div>
        </div>

        {/* Địa chỉ cụ thể */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Địa chỉ cụ thể
            </label>
            {isGeocoding ? (
              <span className="text-[10px] text-indigo-600 font-medium flex items-center gap-1 animate-pulse">
                <span>⏳</span> Đang gợi ý địa chỉ...
              </span>
            ) : suggestedAddress && address !== suggestedAddress ? (
              <button
                type="button"
                onClick={handleApplySuggestedAddress}
                className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60 transition active:scale-95"
                title="Điền địa chỉ được gợi ý từ toạ độ ghim"
              >
                <span>📍 Áp dụng vị trí ghim</span>
              </button>
            ) : null}
          </div>
          <div className="relative">
            <input
              type="text"
              value={address}
              placeholder={isGeocoding ? "Đang xác định địa chỉ từ toạ độ..." : "VD: 142 Đặng Thái Thân, Thuận Hòa, TP. Huế"}
              onChange={(e) => {
                setAddress(e.target.value);
                setIsManualAddress(true);
                isManualAddressRef.current = true;
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition pr-8"
            />
            {suggestedAddress && (
              <button
                type="button"
                onClick={handleApplySuggestedAddress}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition p-1"
                title="Sử dụng địa chỉ từ toạ độ ghim"
              >
                📍
              </button>
            )}
          </div>
          {suggestedAddress && address !== suggestedAddress && (
            <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg bg-indigo-50/70 border border-indigo-100/80 px-2.5 py-1.5 text-[10.5px]">
              <span className="truncate text-slate-600">
                Gợi ý: <span className="font-semibold text-indigo-900">{suggestedAddress}</span>
              </span>
              <button
                type="button"
                onClick={handleApplySuggestedAddress}
                className="shrink-0 font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Dùng ngay
              </button>
            </div>
          )}
        </div>

        {/* Giá vé */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Giá vé / Chi phí tham quan (VND)
          </label>
          <input
            type="number"
            value={price}
            placeholder="0 = Miễn phí vé"
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
          />
        </div>

        {/* Giờ hoạt động - Bộ chọn thời gian tiện lợi */}
        <div className="space-y-2 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200/80 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⏰</span>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Giờ hoạt động
              </label>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomText((v) => !v)}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
            >
              {isCustomText ? "⏰ Chọn khung giờ" : "✏️ Tự nhập chữ"}
            </button>
          </div>

          {isCustomText ? (
            <input
              type="text"
              value={openingHours}
              placeholder="VD: 07:00 - 22:00 hoặc 24/24..."
              onChange={(e) => setOpeningHours(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />
          ) : (
            <>
              {/* Chọn giờ Mở cửa - Đóng cửa */}
              {!isAllDay ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <span className="block text-[10px] font-bold text-slate-500 mb-1">
                      Mở cửa
                    </span>
                    <input
                      type="time"
                      value={openTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOpenTime(val);
                        setOpeningHours(`${val} - ${closeTime}`);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition cursor-pointer"
                    />
                  </div>

                  <span className="text-slate-400 font-bold text-sm pt-4 select-none">→</span>

                  <div className="flex-1">
                    <span className="block text-[10px] font-bold text-slate-500 mb-1">
                      Đóng cửa
                    </span>
                    <input
                      type="time"
                      value={closeTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCloseTime(val);
                        setOpeningHours(`${openTime} - ${val}`);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200/80 px-3 py-2 text-xs font-bold text-emerald-800">
                  <div className="flex items-center gap-2">
                    <span>🌟</span>
                    <span>Mở cửa cả ngày (24/24)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAllDay(false);
                      setOpeningHours(`${openTime} - ${closeTime}`);
                    }}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                  >
                    Đổi khung giờ
                  </button>
                </div>
              )}

              {/* Lựa chọn nhanh (Quick presets) */}
              <div className="relative group/presets pt-1">
                {canPresetScrollLeft && (
                  <div className="absolute left-0 inset-y-0 top-1 flex items-center pr-2 pl-0 bg-gradient-to-r from-slate-50 via-slate-50/95 to-transparent z-10 pointer-events-none">
                    <button
                      type="button"
                      onClick={scrollPresetPrev}
                      className="pointer-events-auto flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm border border-slate-200/90 hover:bg-slate-50 hover:scale-110 active:scale-95 transition cursor-pointer text-[10px] font-black"
                      aria-label="Lướt sang trái"
                      title="Lướt sang trái"
                    >
                      ‹
                    </button>
                  </div>
                )}

                <div
                  ref={presetScrollRef}
                  {...presetDragProps}
                  className="flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none cursor-grab active:cursor-grabbing touch-pan-x overscroll-x-contain"
                >
                  {TIME_PRESETS.map((preset) => {
                    const isSelected = isAllDay
                      ? preset.allDay
                      : !preset.allDay && openTime === preset.open && closeTime === preset.close;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          if (hasPresetDraggedRef.current) return;
                          if (preset.allDay) {
                            setIsAllDay(true);
                            setOpeningHours("Cả ngày");
                          } else {
                            setIsAllDay(false);
                            setOpenTime(preset.open);
                            setCloseTime(preset.close);
                            setOpeningHours(`${preset.open} - ${preset.close}`);
                          }
                        }}
                        className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {canPresetScrollRight && (
                  <div className="absolute right-0 inset-y-0 top-1 flex items-center pl-2 pr-0 bg-gradient-to-l from-slate-50 via-slate-50/95 to-transparent z-10 pointer-events-none">
                    <button
                      type="button"
                      onClick={scrollPresetNext}
                      className="pointer-events-auto flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm border border-slate-200/90 hover:bg-slate-50 hover:scale-110 active:scale-95 transition cursor-pointer text-[10px] font-black"
                      aria-label="Lướt sang phải"
                      title="Lướt sang phải"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mô tả */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Mô tả giới thiệu
          </label>
          <textarea
            value={description}
            rows={2}
            placeholder="Chia sẻ vài nét đặc sắc về địa điểm này..."
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none"
          />
        </div>
      </div>

      {/* Footer Submit */}
      <div className="border-t border-slate-100 p-4 bg-slate-50/80">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim() || isUploading || isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none active:scale-95 transition cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Đang gửi đóng góp...</span>
            </>
          ) : (
            <>
              <span>📤</span>
              <span>Gửi đóng góp (Chờ admin duyệt)</span>
            </>
          )}
        </button>
        <p className="mt-2 text-center text-[10px] text-slate-500 font-medium">
          ⏳ Địa điểm sẽ được kiểm duyệt trước khi hiển thị công khai trên bản đồ Huế.
        </p>
      </div>
    </div>
  );
}