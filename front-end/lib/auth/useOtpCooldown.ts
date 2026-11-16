"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";

const RESEND_DELAY_SECONDS = 60;

export function useOtpCooldown() {
  const [cooldown, setCooldown] = useState<{ scope: string; deadline: number }>();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!cooldown) return;

    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((cooldown.deadline - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) window.clearInterval(timer);
    }, 250);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  function startCooldown(scope: string, seconds = RESEND_DELAY_SECONDS) {
    setCooldown({ scope, deadline: Date.now() + seconds * 1000 });
    setSeconds(seconds);
  }

  function resumeCooldown(scope: string, error: unknown): boolean {
    if (!(error instanceof ApiError) || error.status !== 429) return false;
    const details = error.details as { retryAfterSeconds?: unknown } | undefined;
    const seconds = details?.retryAfterSeconds;
    startCooldown(scope, typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0
      ? Math.ceil(seconds) : RESEND_DELAY_SECONDS);
    return true;
  }

  return {
    remainingFor: (scope: string) => cooldown?.scope === scope ? seconds : 0,
    startCooldown,
    resumeCooldown,
  };
}
