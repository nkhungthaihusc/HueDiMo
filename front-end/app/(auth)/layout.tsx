import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AuthHeroSlider from "@/components/auth/AuthHeroSlider";

const HUE_BG_IMAGE =
  "https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/auth/anh-dep-hue-thumbnail.jpg";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen w-full flex-col lg:flex-row overflow-hidden bg-gradient-to-br from-[#faf7ff] via-[#f3edff] to-[#e9dcff]">
      {/* NỬA BÊN TRÁI (Desktop): CAROUSEL ẢNH LIÊN TỤC TỪ SUPABASE */}
      <AuthHeroSlider />

      {/* NỬA BÊN PHẢI (hoặc toàn màn hình trên Mobile/Tablet): GIAO DIỆN AUTH VỚI NỀN TÍM NHẸ MỘNG MƠ XỨ HUẾ */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto p-4 sm:p-8 lg:p-12 min-h-screen">
        {/* Nền phong cảnh Huế mờ ảo hòa quyện cùng lớp phủ tím nhẹ nhàng */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUE_BG_IMAGE}
            alt="Cố Đô Huế"
            className="h-full w-full object-cover object-center opacity-15 lg:opacity-20 scale-105 filter blur-[1.5px] transition-transform duration-1000 mix-blend-multiply"
          />
          {/* Lớp gradient tím nhẹ thơ mộng đa tầng */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-50/70 via-purple-100/40 to-[#e9dcff]/80" />
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-200/30 via-transparent to-purple-300/20" />

          {/* Các quả cầu ánh sáng ambient tím lavender phát sáng mờ ảo dịu mắt */}
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-purple-300/35 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-violet-300/30 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-fuchsia-200/25 blur-3xl" />

          {/* Lưới chấm họa tiết di sản tím nhạt tinh tế */}
          <div className="absolute inset-0 bg-[radial-gradient(#7c3aed18_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />
        </div>

        {/* Thanh điều hướng trên cùng: Nút quay lại & Huy hiệu Du lịch số */}
        <div className="w-full max-w-md lg:max-w-lg flex items-center justify-between z-20 mb-4 pt-2">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-2xl border border-purple-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-purple-900 shadow-xs backdrop-blur-md transition-all hover:bg-white hover:border-purple-300 hover:text-purple-950 active:scale-95"
            title="Quay lại Bản đồ Cố đô"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-purple-600" />
            <span>Về Bản đồ</span>
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-purple-200/80 bg-purple-100/80 px-3.5 py-1.5 text-xs font-semibold text-purple-700 shadow-xs backdrop-blur-md">
            <span className="inline-block h-2 w-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_#a855f7]" />
            <span>Du lịch số Huế</span>
          </div>
        </div>

        {/* Header thương hiệu nhỏ khi ở màn hình nhỏ */}
        <div className="mb-4 flex lg:hidden items-center gap-3 z-20">
          <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-white/80 shadow-md ring-2 ring-purple-300/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/avatars/473616240_1779979822801506_5513169442076253620_n.jpg"
              alt="HueDiMo"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-purple-950 drop-shadow-xs">
                Hue<span className="text-purple-600">DiMo</span>
              </span>
              <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                Cố đô
              </span>
            </div>
            <p className="text-[11px] text-purple-900/75 font-medium">
              Bản đồ Di sản & Du lịch số Cố đô Huế
            </p>
          </div>
        </div>

        {/* Nội dung AuthForm */}
        <div className="relative z-10 w-full flex justify-center py-2">
          {children}
        </div>

        {/* Footer ghi chú nhỏ với các huy hiệu văn hóa */}
        <div className="relative z-10 mt-5 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] text-purple-800/70 font-medium select-none">
          <span className="flex items-center gap-1.5">
            <span>🏛️</span> Di sản Văn hóa Thế giới
          </span>
          <span className="h-1 w-1 rounded-full bg-purple-300 hidden sm:inline" />
          <span className="flex items-center gap-1.5">
            <span>✨</span> Lịch trình AI cá nhân hóa
          </span>
          <span className="h-1 w-1 rounded-full bg-purple-300 hidden sm:inline" />
          <span className="flex items-center gap-1.5">
            <span>📍</span> Check-in nhận điểm thưởng
          </span>
        </div>
      </div>
    </main>
  );
}

