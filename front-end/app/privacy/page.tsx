import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock, Database, Eye, RefreshCw, Mail, MapPin } from "lucide-react";

export const metadata = {
  title: "Chính sách quyền riêng tư | HueDiMo - Bản đồ Du lịch Số Cố đô Huế",
  description: "Chính sách bảo mật và quyền riêng tư của nền tảng HueDiMo.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-brand-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại Đăng nhập</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 font-bold text-white text-xs shadow-xs">
              H
            </span>
            <span className="font-extrabold text-sm tracking-tight text-slate-900">HueDiMo</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Title Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Quy chuẩn bảo vệ dữ liệu người dùng</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Chính Sách Quyền Riêng Tư
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            Cập nhật lần cuối: Ngày 14 tháng 09 năm 2026 • Phiên bản 2.1
          </p>
        </div>

        {/* Content Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/40 space-y-8 text-sm leading-relaxed text-slate-600">
          {/* Section 1 */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">
                1
              </span>
              Giới thiệu chung về HueDiMo
            </h2>
            <p>
              Chào mừng bạn đến với <strong>HueDiMo</strong> (Hue Digital Heritage Map) — Nền tảng bản đồ du lịch số và bảo tồn di sản Cố đô Huế. Chúng tôi tôn trọng quyền riêng tư của bạn và cam kết bảo vệ dữ liệu cá nhân theo các tiêu chuẩn bảo mật quốc tế và quy định pháp luật hiện hành của Việt Nam.
            </p>
            <p className="mt-2">
              Chính sách này giải thích cách thức chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ thông tin của bạn khi bạn sử dụng ứng dụng web, ứng dụng di động và các dịch vụ liên kết của HueDiMo.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">
                2
              </span>
              Dữ liệu chúng tôi thu thập
            </h2>
            <p>Tùy thuộc vào cách bạn tương tác với HueDiMo, chúng tôi có thể thu thập các loại dữ liệu sau:</p>
            
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs mb-1.5">
                  <Lock className="h-4 w-4 text-brand-600" />
                  Đăng nhập qua Mạng xã hội (OAuth)
                </div>
                <p className="text-xs text-slate-500">
                  Khi bạn đăng nhập bằng <strong>Google</strong> hoặc <strong>Facebook</strong>, chúng tôi chỉ tiếp nhận các thông tin cơ bản được bạn đồng ý chia sẻ: Họ tên, Địa chỉ email và Ảnh đại diện (Avatar).
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs mb-1.5">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Tọa độ vị trí địa lý (GPS)
                </div>
                <p className="text-xs text-slate-500">
                  Khi bạn sử dụng tính năng <em>Check-in di sản</em> hoặc <em>Chỉ đường thông minh</em>, chúng tôi chỉ thu thập tọa độ vị trí tức thời với sự cho phép của bạn trên trình duyệt để đối soát cự ly tới di tích.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs mb-1.5">
                  <Database className="h-4 w-4 text-amber-600" />
                  Lịch trình & Đánh giá du lịch
                </div>
                <p className="text-xs text-slate-500">
                  Các địa điểm bạn đã lưu, lịch trình bạn tạo lập, các bức ảnh chụp bạn tải lên và các bài nhận xét/đánh giá bạn đăng công khai trên hệ thống.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs mb-1.5">
                  <Eye className="h-4 w-4 text-sky-600" />
                  Dữ liệu kỹ thuật & Nhật ký
                </div>
                <p className="text-xs text-slate-500">
                  Địa chỉ IP, loại thiết bị, hệ điều hành, trình duyệt web nhằm phục vụ mục đích kiểm soát an ninh và tối ưu hóa hiệu năng ứng dụng.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">
                3
              </span>
              Mục đích sử dụng thông tin
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Xác thực danh tính và duy trì trạng thái đăng nhập an toàn của bạn.</li>
              <li>Lưu trữ và đồng bộ hóa lịch trình du lịch cá nhân hóa giữa các thiết bị.</li>
              <li>Tính toán điểm tích lũy văn hóa và xếp hạng huy hiệu danh hiệu khám phá Huế.</li>
              <li>Cung cấp gợi ý điểm tham quan, ẩm thực và dịch vụ du lịch phù hợp dựa trên vị trí của bạn.</li>
              <li>Hỗ trợ khách hàng và giải quyết các vấn đề kỹ thuật phát sinh.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">
                4
              </span>
              Cam kết Bảo mật & Chia sẻ Dữ liệu
            </h2>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs text-emerald-900 leading-relaxed">
              <strong>Cam kết tuyệt đối:</strong> HueDiMo <strong>không bao giờ bán</strong>, trao đổi hoặc thương mại hóa dữ liệu cá nhân của người dùng cho bất kỳ bên quảng cáo thứ ba nào. Mọi dữ liệu lưu trữ trên cơ sở dữ liệu đều được mã hóa bằng tiêu chuẩn công nghiệp (SSL/TLS, JWT mã hóa, băm mật khẩu bcrypt).
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">
                5
              </span>
              Quyền của bạn & Yêu cầu xóa dữ liệu (Data Deletion)
            </h2>
            <p>
              Bạn có toàn quyền kiểm soát dữ liệu cá nhân của mình bất kỳ lúc nào:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Xem và chỉnh sửa tên hiển thị, ảnh đại diện tại mục Hồ sơ cá nhân.</li>
              <li>Hủy liên kết tài khoản Facebook hoặc Google khỏi HueDiMo.</li>
              <li>Yêu cầu xóa toàn bộ tài khoản và các dữ liệu liên quan vĩnh viễn khỏi máy chủ của chúng tôi.</li>
            </ul>
            <div className="mt-3">
              <Link
                href="/data-deletion"
                className="inline-flex items-center gap-2 font-bold text-brand-600 hover:text-brand-700 hover:underline"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Xem hướng dẫn chi tiết về Quy trình Yêu cầu Xóa Dữ liệu Người dùng &rarr;</span>
              </Link>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">
                6
              </span>
              Thông tin liên hệ
            </h2>
            <p>
              Nếu bạn có bất kỳ thắc mắc hoặc khiếu nại nào liên quan đến chính sách bảo mật dữ liệu, xin vui lòng liên hệ với đội ngũ phát triển HueDiMo:
            </p>
            <div className="mt-2 flex flex-col gap-1.5 text-xs font-medium text-slate-700">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-600" />
                <span>Email hỗ trợ: <strong>support@huedimo.vn</strong> hoặc <strong>admin@huedimo.vn</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-600" />
                <span>Địa chỉ dự án: Thành phố Huế, Tỉnh Thừa Thiên Huế, Việt Nam</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} HueDiMo. Tất cả quyền được bảo lưu.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-slate-600 underline">
              Điều khoản dịch vụ
            </Link>
            <Link href="/data-deletion" className="hover:text-slate-600 underline">
              Xóa dữ liệu
            </Link>
            <Link href="/login" className="hover:text-slate-600 underline">
              Đăng nhập
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
