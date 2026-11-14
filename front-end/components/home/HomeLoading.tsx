import Image from "next/image";

export default function HomeLoading({ retry }: { retry?: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-brand-50 px-6 text-center text-slate-900">
      <div className="flex flex-col items-center gap-4">
        <Image src="/logo.jpg" alt="" width={72} height={72} priority className="rounded-2xl shadow-sm" />
        <h1 className="text-2xl font-bold">HueDiMo</h1>
        {retry ? (
          <>
            <p role="alert" className="text-sm text-slate-700">Không thể tải dữ liệu bản đồ.</p>
            <button type="button" onClick={retry} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Thử lại</button>
          </>
        ) : (
          <div role="status" className="flex items-center gap-3 text-sm text-slate-700">
            <span aria-hidden="true" className="h-5 w-5 rounded-full border-2 border-brand-600 border-r-transparent motion-safe:animate-spin" />
            Đang tải bản đồ và địa điểm…
          </div>
        )}
      </div>
    </main>
  );
}
