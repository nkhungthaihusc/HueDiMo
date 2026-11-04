import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import AuthHeroSlider from "@/components/auth/AuthHeroSlider";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-screen flex h-dvh w-full overflow-y-auto bg-slate-50 lg:overflow-hidden">
      <AuthHeroSlider />
      <section className="flex min-h-full min-w-0 flex-1 flex-col overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 lg:px-12">
        <Link href="/" className="mb-5 flex min-h-11 shrink-0 items-center gap-2 self-start rounded-xl px-2 text-sm font-medium text-slate-600 hover:bg-white"><ArrowLeft size={17} />Về bản đồ Huế</Link>
        <div className="my-auto flex w-full shrink-0 flex-col items-center py-4">
          <Link href="/" className="mb-6 flex items-center gap-3 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="" className="h-11 w-11 rounded-xl object-cover" />
            <div><p className="text-xl font-extrabold tracking-tight text-slate-900">Hue<span className="text-brand-600">DiMo</span></p><p className="text-xs text-slate-500">Một hành trình, nhiều trải nghiệm</p></div>
          </Link>
          {children}
          <p className="mt-6 flex items-center gap-2 text-xs text-slate-500"><MapPin size={14} aria-hidden="true" />Lưu hành trình. Khám phá Huế. Kết nối cộng đồng.</p>
        </div>
        <div className="mt-5 flex shrink-0 justify-center gap-5 py-3 text-xs text-slate-500"><Link href="/terms" className="py-2 hover:text-brand-700">Điều khoản</Link><Link href="/privacy" className="py-2 hover:text-brand-700">Quyền riêng tư</Link></div>
      </section>
    </main>
  );
}
