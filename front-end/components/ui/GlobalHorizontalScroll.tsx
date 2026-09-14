"use client";

import { useEffect } from "react";

/**
 * GlobalHorizontalScroll
 * Tự động chuyển đổi con lăn chuột dọc (Mouse Wheel deltaY) thành cuộn ngang
 * cho TẤT CẢ các vùng có overflow-x: auto / scroll trên toàn bộ hệ thống
 * nếu vùng đó không có thanh cuộn dọc (scrollHeight <= clientHeight).
 */
export default function GlobalHorizontalScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleGlobalWheel = (e: WheelEvent) => {
      // Nếu người dùng đang giữ Shift hoặc chuột có con lăn ngang thực sự
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.deltaY === 0) return;

      let el = e.target as HTMLElement | null;

      // Tìm phần tử tổ tiên gần nhất có thể cuộn ngang
      while (el && el !== document.body && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const overflowX = style.overflowX;
        const overflowY = style.overflowY;

        const isHorizontalScrollable =
          (overflowX === "auto" || overflowX === "scroll") &&
          el.scrollWidth > el.clientWidth;

        const isVerticalScrollable =
          (overflowY === "auto" || overflowY === "scroll") &&
          el.scrollHeight > el.clientHeight;

        // Nếu phần tử có cuộn ngang nhưng KHÔNG có cuộn dọc
        if (isHorizontalScrollable && !isVerticalScrollable) {
          const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
          const atEnd =
            el.scrollLeft >= el.scrollWidth - el.clientWidth - 1 && e.deltaY > 0;

          // Nếu chưa chạm kịch mép cuộn, chặn cuộn trang dọc và cuộn ngang phần tử
          if (!atStart && !atEnd) {
            e.preventDefault();
            el.scrollLeft += e.deltaY * 1.1;
            return;
          }
        }

        el = el.parentElement;
      }
    };

    window.addEventListener("wheel", handleGlobalWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleGlobalWheel);
    };
  }, []);

  return null;
}
