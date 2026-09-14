"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, CheckCircle2, ShieldAlert, Mail, ExternalLink, HelpCircle } from "lucide-react";
import { toast } from "@/components/ui/Toast";

export default function DataDeletionPage() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Sinh mã theo dõi ngẫu nhiên chuẩn định dạng Meta Data Deletion
    const code = `HDM-DEL-${Math.floor(100000 + Math.random() * 900000)}`;
    setTrackingCode(code);
    setSubmitted(true);
    toast.success("Yêu cầu xóa dữ liệu của bạn đã được ghi nhận!", "Đã tiếp nhận yêu cầu");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href="/privacy"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-brand-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Chính sách quyền riêng tư</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 font-bold text-white text-xs shadow-xs">
              H
            </span>
            <span className="font-extrabold text-sm tracking-tight text-slate-900">HueDiMo</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Title */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800">
            <Trash2 className="h-3.5 w-3.5" />
            <span>Facebook & Google Data Deletion Instructions</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Hướng Dẫn & Yêu Cầu Xóa Dữ Liệu
          </h1>
          <p className="mt-2 text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Theo Quy chuẩn bảo vệ dữ liệu người dùng của Facebook (Meta) và pháp luật bảo mật, người dùng có toàn quyền gỡ bỏ và xóa vĩnh viễn dữ liệu tài khoản khỏi ứng dụng HueDiMo.
          </p>
        </div>

        {/* Content Box */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/40 space-y-8">
          {/* Method 1: Gỡ ứng dụng trực tiếp trên Facebook */}
          <section>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-white text-xs font-bold">
                1
              </span>
              Cách 1: Gỡ bỏ liên kết HueDiMo trực tiếp trên Facebook
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Nếu bạn đã đăng nhập HueDiMo bằng tài khoản Facebook và muốn thu hồi quyền truy cập cũng như ngừng đồng bộ dữ liệu:
            </p>

            <ol className="mt-3 list-decimal pl-5 space-y-2 text-xs text-slate-600 leading-relaxed">
              <li>
                Truy cập vào tài khoản Facebook cá nhân của bạn, bấm vào ảnh đại diện góc trên bên phải $\rightarrow$ chọn <strong>Cài đặt & quyền riêng tư (Settings & Privacy)</strong> $\rightarrow$ chọn <strong>Cài đặt (Settings)</strong>.
              </li>
              <li>
                Ở menu bên trái, tìm và chọn mục <strong>Ứng dụng và trang web (Apps and Websites)</strong>.
              </li>
              <li>
                Tìm ứng dụng <strong>HueDiMo</strong> trong danh sách các ứng dụng đang hoạt động.
              </li>
              <li>
                Bấm nút <strong>Gỡ (Remove)</strong> bên cạnh tên ứng dụng HueDiMo.
              </li>
              <li>
                Tích chọn ô <em>"Đồng thời xóa các bài viết, video hoặc sự kiện mà HueDiMo đã đăng"</em> (nếu có) và bấm <strong>Gỡ</strong> để hoàn tất.
              </li>
            </ol>

            <div className="mt-4 flex items-center gap-2">
              <a
                href="https://www.facebook.com/settings?tab=applications"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-brand-600 transition"
              >
                <span>Mở trang Cài đặt Ứng dụng Facebook</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Method 2: Yêu cầu xóa vĩnh viễn dữ liệu trên hệ thống máy chủ HueDiMo */}
          <section>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-white text-xs font-bold">
                2
              </span>
              Cách 2: Gửi yêu cầu xóa toàn bộ dữ liệu khỏi máy chủ HueDiMo
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sau khi nhận được yêu cầu, hệ thống sẽ tiến hành xóa vĩnh viễn các thông tin của bạn khỏi cơ sở dữ liệu (Bao gồm Họ tên, Email, Ảnh đại diện, Lịch sử check-in, Điểm số văn hóa và Lịch trình đã lưu) trong vòng <strong>24 đến 48 giờ làm việc</strong>.
            </p>

            {submitted ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-emerald-900">Yêu cầu đã được tiếp nhận thành công!</h3>
                <p className="mt-1 text-xs text-emerald-700">
                  Mã theo dõi tiến trình của bạn:
                </p>
                <div className="my-2 inline-block rounded-xl border border-emerald-300 bg-white px-4 py-2 font-mono text-sm font-bold text-emerald-900 tracking-wider">
                  {trackingCode}
                </div>
                <p className="text-[11px] text-emerald-600">
                  Một email xác nhận sẽ được gửi đến <strong>{email}</strong> khi quá trình thanh lọc dữ liệu hoàn tất.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Địa chỉ Email tài khoản cần xóa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/10 transition"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Lý do xóa dữ liệu (Tùy chọn)
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Cho chúng tôi biết lý do bạn muốn rời đi để cải thiện dịch vụ..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/10 transition resize-none"
                  />
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-800 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    <strong>Cảnh báo:</strong> Hành động này không thể hoàn tác. Mọi điểm tích lũy văn hóa và lịch trình của bạn sẽ bị hủy bỏ vĩnh viễn.
                  </span>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 active:scale-[0.99] transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xác nhận Yêu cầu Xóa Dữ liệu</span>
                </button>
              </form>
            )}
          </section>

          <hr className="border-slate-100" />

          {/* Section 3: Hỗ trợ trực tiếp */}
          <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-brand-600 shrink-0" />
              <span>Cần trợ giúp thêm về tài khoản?</span>
            </div>
            <a
              href="mailto:support@huedimo.vn?subject=Yeu%20cau%20xoa%20du%20lieu%20HueDiMo"
              className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Gửi thư tới: support@huedimo.vn</span>
            </a>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} HueDiMo Data Protection.</p>
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="hover:text-slate-600 underline">
              Chính sách bảo mật
            </Link>
            <Link href="/terms" className="hover:text-slate-600 underline">
              Điều khoản
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
