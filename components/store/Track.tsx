"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const rid = () => (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`).replace(/-/g, "").slice(0, 32);

/** Counts a page view for Admin → Visitors. Sent after the page has loaded, so it never slows the site down. No cookies, no IP stored. */
export function Track() {
  const path = usePathname();
  useEffect(() => {
    try {
      if (navigator.doNotTrack === "1") return;
      let isNew = false;
      let v = localStorage.getItem("cc_vid");
      if (!v) { v = rid(); isNew = true; localStorage.setItem("cc_vid", v); }
      let s = sessionStorage.getItem("cc_sid");
      const firstOfSession = !s;
      if (!s) { s = rid(); sessionStorage.setItem("cc_sid", s); }
      const body = JSON.stringify({
        v, s, p: path, n: isNew,
        r: firstOfSession ? document.referrer : "",
        u: firstOfSession ? new URLSearchParams(location.search).get("utm_source") ?? "" : "",
      });
      const send = () => {
        if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
      };
      if ("requestIdleCallback" in window) (window as unknown as { requestIdleCallback: (f: () => void, o: { timeout: number }) => void }).requestIdleCallback(send, { timeout: 3000 });
      else setTimeout(send, 1500);
    } catch {
      /* private mode or blocked storage: skip quietly */
    }
  }, [path]);
  return null;
}
