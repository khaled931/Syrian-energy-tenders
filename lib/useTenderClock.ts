"use client";

import { useEffect, useState } from "react";

/** Refresh derived deadline state on an open page without reloading its data. */
export function useTenderClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    const refresh = () => setNow(new Date());
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  return now;
}
