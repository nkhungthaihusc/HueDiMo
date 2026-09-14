import Link from "next/link";
import { FileText, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Điều khoản dịch vụ | HueDiMo - Bản đồ Du lịch Số Cố đô Huế",
  description: "Điều khoản và quy định sử dụng dịch vụ của nền tảng HueDiMo.",
};

export default function TermsOfServicePage() {
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
          <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
            <FileText className="h-3.5 w-3.5" />
            <span>Quy định sử dụng nền tảng du lịch số</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Điều Khoản Dịch Vụ
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            Áp dụng từ: Ngày 14 tháng 09 năm 2026 • Nền tảng HueDiMo
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/40 space-y-8 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">1</span>
              Chấp thuận Điều khoản
            </h2>
            <p>
              Bằng việc truy cập, đăng ký hoặc sử dụng nền tảng bản đồ số <strong>HueDiMo</strong>, bạn xác nhận rằng bạn đã đọc, hiểu và đồng ý tuân thủ toàn bộ các điều khoản được quy định dưới đây. Nếu không đồng ý với bất kỳ điều khoản nào, vui lòng ngưng sử dụng dịch vụ.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">2</span>
              Tài khoản người dùng & Trách nhiệm
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Bạn có thể đăng nhập bằng email hoặc thông qua các nhà cung cấp bên thứ ba (Google, Facebook OAuth).</li>
              <li>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động diễn ra dưới tài khoản của mình.</li>
              <li>Nghiêm cấm hành vi giả mạo danh tính, tạo tài khoản ảo để gian lận điểm thưởng hoặc thao túng xếp hạng du lịch.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">3</span>
              Quy chuẩn Nội dung, Đánh giá & Check-in
            </h2>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Văn hóa ứng xử & Tôn trọng Di sản Cố đô
              </div>
              <p>
                HueDiMo là không gian số tôn vinh văn hóa và di sản Huế. Mọi bình luận, bài đánh giá và hình ảnh do người dùng đăng tải phải tuân thủ thuần phong mỹ tục, không chứa nội dung xúc phạm, sai lệch lịch sử hoặc quảng cáo trái phép. Quản trị viên có quyền xóa bài viết vi phạm mà không cần báo trước.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">4</span>
              Sở hữu trí tuệ
            </h2>
            <p className="text-xs">
              Mọi tài nguyên bản đồ số, hình ảnh minh họa, giao diện người dùng và thuật toán gợi ý lịch trình thuộc quyền sở hữu của dự án HueDiMo. Nghiêm cấm sao chép, trích xuất dữ liệu (crawling) thương mại khi chưa có văn bản chấp thuận.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">5</span>
              Giới hạn trách nhiệm
            </h2>
            <p className="text-xs">
              Thông tin về giá vé, giờ mở cửa các lăng tẩm và tình hình thời tiết được tổng hợp và cập nhật liên tục từ các cơ quan chức năng. Tuy nhiên, HueDiMo khuyến nghị du khách kiểm tra lại thực tế tại quầy vé trước các chuyến đi trong điều kiện thời tiết đặc biệt.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">6</span>
              Liên hệ
            </h2>
            <p className="text-xs">
              Mọi thắc mắc về điều khoản dịch vụ, vui lòng liên hệ qua email: <strong>support@huedimo.vn</strong>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} HueDiMo Terms of Service.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-600 underline">
              Chính sách quyền riêng tư
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
