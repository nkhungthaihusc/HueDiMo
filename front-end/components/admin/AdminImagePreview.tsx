"use client";

import { useRef, useState } from "react";
import { ImageOff, Minus, Plus, X } from "lucide-react";

export default function AdminImagePreview({ src, label, className, avatar = false }: {
  src: string;
  label: string;
  className: string;
  avatar?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(1);
  const [open, setOpen] = useState(false);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [previewFailedSrc, setPreviewFailedSrc] = useState<string | null>(null);

  if (failedSrc === src && !open) {
    return (
      <span role="img" aria-label={avatar ? `Ảnh đại diện ${label} không khả dụng` : `Ảnh ${label} không khả dụng`}
        className={`flex shrink-0 items-center justify-center bg-admin-muted text-xs font-bold text-admin-subtle ${className}`}>
        {avatar ? label.trim().charAt(0).toLocaleUpperCase("vi-VN") || "?" : <ImageOff size={16} aria-hidden="true" />}
      </span>
    );
  }

  return (
    <>
      <button type="button" aria-label={`Xem ảnh ${label}`} aria-haspopup="dialog"
        className={`block shrink-0 cursor-zoom-in overflow-hidden focus-visible:outline-2 focus-visible:outline-purple-500 ${className}`}
        onClick={() => {
          setZoom(1);
          setPreviewFailedSrc(null);
          setOpen(true);
          dialog.current?.showModal();
        }}>
        <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailedSrc(src)} className="h-full w-full object-cover" />
      </button>
      <dialog ref={dialog} aria-label={`Xem ảnh ${label}`} onClose={() => setOpen(false)}
        className="m-auto w-[calc(100%-1.5rem)] max-w-5xl overflow-hidden rounded-2xl bg-slate-950 p-3 text-white backdrop:bg-black/80">
        {open && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 text-sm font-semibold break-words">{label}</span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Thu nhỏ ảnh" disabled={zoom === 1}
                  onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
                  className="rounded-lg p-2 hover:bg-white/15 disabled:opacity-40"><Minus size={18} /></button>
                <button type="button" aria-label="Đặt lại kích thước ảnh" onClick={() => setZoom(1)}
                  className="min-w-14 rounded-lg px-2 py-2 text-sm hover:bg-white/15">{zoom * 100}%</button>
                <button type="button" aria-label="Phóng to ảnh" disabled={zoom === 3}
                  onClick={() => setZoom((value) => Math.min(3, value + 0.5))}
                  className="rounded-lg p-2 hover:bg-white/15 disabled:opacity-40"><Plus size={18} /></button>
                <button type="button" aria-label="Đóng ảnh" autoFocus onClick={() => dialog.current?.close()}
                  className="rounded-lg p-2 hover:bg-white/15"><X size={18} /></button>
              </div>
            </div>
            <div tabIndex={0} aria-label="Vùng xem ảnh" className="max-h-[72dvh] overflow-auto overscroll-contain">
              <div style={{ width: previewFailedSrc === src ? "100%" : `${zoom * 100}%` }}>
                {previewFailedSrc === src ? (
                  <p role="status" className="p-6 text-sm">Không tải được ảnh.</p>
                ) : (
                  <img src={src} alt={label} referrerPolicy="no-referrer"
                    onError={() => setPreviewFailedSrc(src)} className="mx-auto w-full object-contain"
                    style={{ maxHeight: `${zoom * 72}dvh` }} />
                )}
              </div>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
