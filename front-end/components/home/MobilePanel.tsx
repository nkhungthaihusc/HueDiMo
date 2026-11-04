"use client";

import { useRef, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface MobilePanelProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  title: string;
  children: ReactNode;
}

export default function MobilePanel({ expanded, onExpandedChange, title, children }: MobilePanelProps) {
  const startY = useRef<number | null>(null);
  const dragged = useRef(false);
  return (
    <section className="home-panel" data-expanded={expanded} aria-label={title}>
      <button type="button" className="home-panel-handle" aria-expanded={expanded} aria-controls="home-panel-content"
        onClick={() => { if (!dragged.current) onExpandedChange(!expanded); }}
        onPointerDown={(event) => { dragged.current = false; startY.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerUp={(event) => {
          if (startY.current === null) return;
          const distance = event.clientY - startY.current;
          startY.current = null;
          if (Math.abs(distance) > 25) { dragged.current = true; onExpandedChange(distance < 0); }
        }}
        onPointerCancel={() => { startY.current = null; }}>
        <span className="mx-auto mb-2 block h-1 w-9 rounded-full bg-slate-300" />
        <span className="flex items-center justify-between gap-3 text-sm font-semibold"><span className="truncate">{title}</span><span className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-700">{expanded ? "Xem bản đồ" : "Mở nội dung"}{expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</span></span>
      </button>
      <div id="home-panel-content" className="home-panel-content">{children}</div>
    </section>
  );
}
