"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface UseHorizontalScrollOptions {
  scrollAmount?: number;
  wheelMultiplier?: number;
}

export function useHorizontalScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseHorizontalScrollOptions = {}
) {
  const { scrollAmount = 180, wheelMultiplier = 1.0 } = options;
  const containerRef = useRef<T | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  // Cập nhật trạng thái hiển thị của nút cuộn trái / phải
  const updateScrollState = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  // Lắng nghe sự kiện lăn chuột (Mouse Wheel) để cuộn ngang mượt mà
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      if (delta === 0) return;

      const { scrollLeft, scrollWidth, clientWidth } = el;
      const atStart = scrollLeft <= 0 && delta < 0;
      const atEnd = scrollLeft >= scrollWidth - clientWidth && delta > 0;

      // Nếu còn không gian cuộn ngang thì chuyển lực lăn thành cuộn ngang
      if (!atStart && !atEnd) {
        e.preventDefault();
        el.scrollLeft += delta * wheelMultiplier;
        updateScrollState();
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("resize", updateScrollState);

    // Initial check
    updateScrollState();
    const timeout = setTimeout(updateScrollState, 200);

    return () => {
      el.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", updateScrollState);
      clearTimeout(timeout);
    };
  }, [updateScrollState, wheelMultiplier]);

  // Hành động bấm nút cuộn sang trái
  const scrollPrev = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  }, [scrollAmount]);

  // Hành động bấm nút cuộn sang phải
  const scrollNext = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
  }, [scrollAmount]);

  // Kéo chuột để cuộn (Mouse Drag to scroll)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.getBoundingClientRect().left;
    scrollLeftRef.current = el.scrollLeft;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!isDraggingRef.current || !el) return;
    const x = e.pageX - el.getBoundingClientRect().left;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 10) {
      hasDraggedRef.current = true;
      el.scrollLeft = scrollLeftRef.current - walk;
      updateScrollState();
    }
  }, [updateScrollState]);

  const onMouseUpOrLeave = useCallback(() => {
    isDraggingRef.current = false;
    // Delay reset hasDragged một chút để sự kiện onClick của button con kịp đọc
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 120);
  }, []);

  return {
    containerRef,
    canScrollLeft,
    canScrollRight,
    scrollPrev,
    scrollNext,
    updateScrollState,
    hasDraggedRef,
    dragProps: {
      onMouseDown,
      onMouseMove,
      onMouseUp: onMouseUpOrLeave,
      onMouseLeave: onMouseUpOrLeave,
      onScroll: updateScrollState,
    },
  };
}
