"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Sparkles, Compass, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const SUPABASE_STORAGE_URL =
  "https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/auth";

interface SlideItem {
  url: string;
  title: string;
  subtitle: string;
}

const FALLBACK_SLIDES: SlideItem[] = [
  {
    url: `${SUPABASE_STORAGE_URL}/anh-dep-hue-thumbnail.jpg`,
    title: "Hoàng Thành Cố Đô Huế",
    subtitle: "Dấu ấn vàng son của triều đại phong kiến cuối cùng Việt Nam",
  },
  {
    url: `${SUPABASE_STORAGE_URL}/anh_hue_ve_dem.jpg`,
    title: "Cố Đô Lung Linh Về Đêm",
    subtitle: "Sắc màu huyền ảo soi bóng sông Hương và cầu Tràng Tiền thơ mộng",
  },
  {
    url: `${SUPABASE_STORAGE_URL}/hue-city-5151869_1280.jpg`,
    title: "Trầm Tích Di Sản Ngàn Năm",
    subtitle: "Không gian cổ kính thanh tao hòa quyện cùng chiều sâu văn hóa",
  },
  {
    url: `${SUPABASE_STORAGE_URL}/images%20(2).jpg`,
    title: "Kiến Trúc Cung Đình Đỉnh Cao",
    subtitle: "Nét chạm khắc tinh xảo và kiến trúc cung điện uy nghiêm",
  },
  {
    url: `${SUPABASE_STORAGE_URL}/images%20(1).jpg`,
    title: "Thiên Nhiên & Di Tích Giao Hòa",
    subtitle: "Những lăng tẩm yên bình nép mình giữa rừng thông xanh mướt",
  },
  {
    url: `${SUPABASE_STORAGE_URL}/images%20(3).jpg`,
    title: "Huế — Bản Sắc & Hội Nhập",
    subtitle: "Lưu giữ hồn cốt di sản và chuyển mình cùng kỷ nguyên số",
  },
  {
    url: `${SUPABASE_STORAGE_URL}/images.jpg`,
    title: "Cầu Tràng Tiền & Sông Hương",
    subtitle: "Biểu tượng bất biến của vẻ đẹp dịu dàng và nét duyên dáng xứ Huế",
  },
];

export default function AuthHeroSlider() {
  const [slides, setSlides] = useState<SlideItem[]>(FALLBACK_SLIDES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Lấy thêm danh sách file động từ folder 'auth' của Supabase Storage nếu có cập nhật mới
  useEffect(() => {
    let isMounted = true;
    async function loadAuthImages() {
      try {
        const { data, error } = await supabase.storage.from("huedimo-media").list("auth");
        if (!error && data && data.length > 0 && isMounted) {
          const fetchedSlides: SlideItem[] = data
            .filter((item) => item.name && !item.name.startsWith("."))
            .map((item, idx) => {
              const filename = encodeURIComponent(item.name);
              const fallback = FALLBACK_SLIDES[idx % FALLBACK_SLIDES.length];
              return {
                url: `${SUPABASE_STORAGE_URL}/${filename}`,
                title: fallback ? fallback.title : `Di sản Cố đô Huế #${idx + 1}`,
                subtitle: fallback ? fallback.subtitle : "Khám phá vẻ đẹp bất tận của miền di sản văn hóa thế giới",
              };
            });

          if (fetchedSlides.length > 0) {
            setSlides(fetchedSlides);
          }
        }
      } catch {
        // Fallback slides đã có sẵn
      }
    }

    loadAuthImages();
    return () => {
      isMounted = false;
    };
  }, []);

  // Tự động chuyển ảnh liên tục mỗi 4.5 giây
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, isPaused]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <div
      className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-ink-900 p-10 xl:p-12 text-white select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Danh sách ảnh chạy liên tục với hiệu ứng Cross-fade & Ken Burns zoom */}
      <div className="absolute inset-0">
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={slide.url}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.url}
                alt={slide.title}
                className={`h-full w-full object-cover object-center transform transition-transform duration-[5000ms] ease-out ${
                  isActive ? "scale-105" : "scale-100"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Lớp phủ Gradient điện ảnh giúp text luôn đọc dễ dàng */}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/95 via-black/45 to-black/30 backdrop-blur-[0.5px]" />
      <div className="absolute inset-0 z-20 bg-gradient-to-r from-brand-950/60 via-transparent to-black/40" />

      {/* Header góc trên */}
      <div className="relative z-30 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-white/30 shadow-xl backdrop-blur-md transition-all group-hover:scale-105 group-hover:border-purple-300/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/avatars/473616240_1779979822801506_5513169442076253620_n.jpg"
              alt="HueDiMo Logo"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-white drop-shadow-md">
              HueDiMo
            </span>
            <p className="text-[11px] font-semibold tracking-wide text-purple-300 drop-shadow">
              Di sản văn hóa với hội nhập & phát triển
            </p>
          </div>
        </Link>

        {/* Nút điều hướng ảnh thủ công */}
        <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 p-1 backdrop-blur-md">
          <button
            onClick={handlePrev}
            aria-label="Ảnh trước"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-1 text-[11px] font-mono text-white/75">
            {String(currentIndex + 1).padStart(2, "0")}/{String(slides.length).padStart(2, "0")}
          </span>
          <button
            onClick={handleNext}
            aria-label="Ảnh tiếp theo"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Nội dung thông tin ảnh hiện tại ở giữa */}
      <div className="relative z-30 my-auto max-w-lg space-y-5 pt-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-300/30 bg-purple-500/15 px-3.5 py-1 text-xs font-semibold text-purple-200 backdrop-blur-md shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>Nền tảng du lịch số thông minh Cố đô Huế</span>
        </div>

        <div className="min-h-[110px] transition-all duration-500">
          <h2 className="text-2xl xl:text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg">
            {slides[currentIndex]?.title}
          </h2>
          <p className="mt-2 text-sm text-white/85 leading-relaxed font-light drop-shadow">
            {slides[currentIndex]?.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md transition hover:bg-white/15">
            <Compass className="h-5 w-5 text-purple-300 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-white">Bản đồ số trực quan</p>
              <p className="text-[11px] text-white/70">40+ di tích & ẩm thực Huế</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md transition hover:bg-white/15">
            <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-white">Lịch trình AI cá nhân</p>
              <p className="text-[11px] text-white/70">Tự động gợi ý & cảnh báo mưa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer & Thanh chỉ báo tiến trình ảnh */}
      <div className="relative z-30 flex flex-col gap-3 pt-6 border-t border-white/15">
        {/* Thanh chỉ báo các slide */}
        <div className="flex items-center gap-1.5 w-full">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Chuyển đến ảnh ${idx + 1}`}
              className="group relative flex-1 h-1.5 rounded-full overflow-hidden bg-white/20 transition-all hover:h-2"
            >
              <div
                className={`h-full bg-purple-400 transition-all duration-500 rounded-full ${
                  idx === currentIndex ? "w-full" : "w-0 group-hover:w-full group-hover:bg-white/50"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-white/60">
          <span>© 2026 HueDiMo. Mọi quyền được bảo lưu.</span>
          <span className="font-medium text-white/80">Kỷ nguyên số di sản Cố đô</span>
        </div>
      </div>
    </div>
  );
}
