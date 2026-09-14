"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CATEGORIES } from "@/lib/data/categories";
import type { CategoryId } from "@/lib/types";

interface RadialMenuProps {
  activeCategory: CategoryId | null;
  onToggle: (id: CategoryId) => void;
}

export default function RadialMenu({ activeCategory, onToggle }: RadialMenuProps) {
  const [open, setOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const prevAngleRef = useRef(0);
  const totalDragMovementRef = useRef(0);

  // Chặn cuộn map và xử lý lăn chuột (Wheel) để xoay vòng sở thích
  useEffect(() => {
    const container = containerRef.current;
    const wheel = wheelRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      // Bắt buộc preventDefault & stopPropagation để map không bao giờ bị zoom/cuộn
      e.preventDefault();
      e.stopPropagation();

      if (open) {
        const delta = e.deltaY || e.deltaX;
        setRotation((prev) => prev - delta * 0.003);
        setShowHint(false);
      }
    };

    // Lắng nghe wheel với { passive: false } để ngăn triệt để việc zoom map
    container.addEventListener("wheel", onWheel, { passive: false });
    if (wheel) {
      wheel.addEventListener("wheel", onWheel, { passive: false });
    }

    return () => {
      container.removeEventListener("wheel", onWheel);
      if (wheel) {
        wheel.removeEventListener("wheel", onWheel);
      }
    };
  }, [open]);

  // Xử lý giữ và kéo chuột / cảm ứng để xoay (Hold & Drag to Rotate)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Không bắt đầu drag nếu nhấp vào nút đóng trung tâm
    if ((e.target as HTMLElement).closest("[data-center-btn]")) return;

    e.stopPropagation();

    const rect = wheelRef.current?.getBoundingClientRect() || containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    isDraggingRef.current = true;
    totalDragMovementRef.current = 0;
    prevAngleRef.current = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    setShowHint(false);
  }, []);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;

      // Khi đang kéo xoay menu, chặn map bị pan/drag
      e.preventDefault();
      e.stopPropagation();

      const rect = wheelRef.current?.getBoundingClientRect() || containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      let delta = currentAngle - prevAngleRef.current;

      // Chuẩn hóa bước nhảy góc qua ranh giới [-PI, PI]
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;

      totalDragMovementRef.current += Math.abs(delta);
      if (totalDragMovementRef.current > 0.03) {
        setIsDragging(true);
      }

      setRotation((prev) => prev + delta);
      prevAngleRef.current = currentAngle;
    };

    const onPointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setTimeout(() => {
          setIsDragging(false);
          totalDragMovementRef.current = 0;
        }, 60);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  const handleCategoryClick = (id: CategoryId) => {
    // Nếu người dùng vừa kéo xoay vòng thì không kích hoạt chọn
    if (totalDragMovementRef.current > 0.04 || isDragging) return;

    onToggle(id);
    if (activeCategory === id) setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`pointer-events-auto relative flex items-center justify-center select-none touch-none ${
        open ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
      }`}
    >
      {/* Vòng menu radial */}
      {open && (
        <div
          ref={wheelRef}
          onPointerDown={handlePointerDown}
          className="pointer-events-auto absolute h-[360px] w-[360px] rounded-full glass-strong shadow-2xl border border-white/80 animate-in zoom-in-90 duration-200 cursor-grab active:cursor-grabbing select-none touch-none flex items-center justify-center"
        >
          {/* Đường ray xoay (Rotation Track) dạng nét đứt */}
          <div
            className="pointer-events-none absolute rounded-full border-2 border-dashed border-brand-300/40"
            style={{
              width: "270px",
              height: "270px",
              transform: `rotate(${rotation}rad)`,
            }}
          />

          {/* Gợi ý tương tác xoay */}
          {showHint && (
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-full bg-ink-900/85 px-3 py-1 text-[11px] font-medium text-white shadow-lg backdrop-blur-md whitespace-nowrap animate-bounce">
              <span>🔄</span>
              <span>Lăn chuột hoặc giữ để xoay</span>
            </div>
          )}

          {/* Danh sách các nút sở thích */}
          {CATEGORIES.map((cat, i) => {
            const baseAngle = (i / CATEGORIES.length) * 2 * Math.PI - Math.PI / 2;
            const angle = baseAngle + rotation;
            const x = Math.cos(angle) * 135;
            const y = Math.sin(angle) * 135;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handlePointerDown(e);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategoryClick(cat.id as CategoryId);
                }}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  // Khi đang kéo xoay thì không transition để bám sát con trỏ, khi buông thì có transition mượt
                  transition: isDragging ? "none" : "transform 0.15s ease-out",
                }}
                className="absolute flex flex-col items-center gap-0.5 group active:scale-95 transition-transform cursor-pointer"
                title={`Chọn: ${cat.label} (Có thể xoay vòng)`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-xl shadow-md transition-all duration-200 ${
                    isActive
                      ? "text-white ring-4 ring-white shadow-lg scale-110"
                      : "bg-white/95 text-ink-900 hover:bg-white hover:scale-110 group-hover:shadow-lg"
                  }`}
                  style={isActive ? { backgroundColor: cat.color } : undefined}
                >
                  {cat.emoji}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap shadow-sm transition-all ${
                    isActive
                      ? "bg-brand-600 text-white shadow-md scale-105"
                      : "glass text-ink-800 group-hover:bg-white"
                  }`}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Nút trung tâm mở/đóng menu */}
      <button
        data-center-btn="true"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Bộ lọc thể loại"
        className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-white/60"
        style={{
          background: open
            ? "linear-gradient(135deg, #ef4444, #f43f5e)"
            : "linear-gradient(135deg, #8b5cf6, #d946ef)",
          color: "#fff",
        }}
        title={open ? "Đóng vòng xoay sở thích" : "Mở vòng xoay sở thích (Lăn chuột hoặc kéo để xoay)"}
      >
        <span className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
          {open ? "✕" : "🎯"}
        </span>
      </button>
    </div>
  );
}
