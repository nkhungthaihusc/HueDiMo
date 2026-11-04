"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Matches --motion-exit in app/motion.css.
export const MOTION_EXIT_MS = 160;

export function usePresence(open: boolean) {
  const [retained, setRetained] = useState(open);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (open) {
      if (retained) return;
      const frame = requestAnimationFrame(() => setRetained(true));
      return () => cancelAnimationFrame(frame);
    }
    if (!retained) return;
    const timer = setTimeout(() => setRetained(false), reducedMotion ? 0 : MOTION_EXIT_MS);
    return () => clearTimeout(timer);
  }, [open, retained, reducedMotion]);

  return { present: open || retained, phase: open ? "open" : "closing" } as const;
}
