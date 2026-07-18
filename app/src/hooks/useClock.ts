"use client";

import { useEffect, useState } from "react";

/**
 * Wall-clock time ("6:35 PM"), refreshed every 15s. Starts empty and fills in
 * from an effect on purpose — the server can't know the client's local time,
 * so rendering it during SSR would guarantee a hydration mismatch.
 */
export function useClock() {
  const [now, setNow] = useState("");
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    setNow(fmt());
    const iv = setInterval(() => setNow(fmt()), 15000);
    return () => clearInterval(iv);
  }, []);
  return now;
}
