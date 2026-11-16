"use client";

import { useEffect, useState } from "react";

const RESEND_DELAY_SECONDS = 60;

export function useOtpCooldown(scope: string) {
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

  function startCooldown() {
    setCooldown({ scope, deadline: Date.now() + RESEND_DELAY_SECONDS * 1000 });
    setSeconds(RESEND_DELAY_SECONDS);
  }

  return { remaining: cooldown?.scope === scope ? seconds : 0, startCooldown };
}
