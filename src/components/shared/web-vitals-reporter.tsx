"use client";

import { useReportWebVitals } from "next/web-vitals";
import { normalizeVitalsPath } from "@/lib/web-vitals";

// Field LCP for the TTACON 2026 paper (src/lib/web-vitals.ts). Temporary.
//
// LCP exists only for a full page load, and the browser often reports it later
// (when the page is hidden or first touched) — by then a client-side link may
// have changed the URL. So the page is read once, when this module first runs
// during the full load, not when the report arrives. "fromScan" is read at the
// same moment: /tech?ac=<code> is the QR page's hand-off, and tech-shell strips
// the ?ac= in an effect, after this runs.
const initial =
  typeof window === "undefined"
    ? null
    : {
        path: normalizeVitalsPath(window.location.pathname),
        fromScan: new URLSearchParams(window.location.search).has("ac"),
      };

type Connection = { type?: string; effectiveType?: string };

// Module-level so its reference never changes: Next's docs warn that a new
// function per render makes useReportWebVitals report the same metric again.
function report(metric: { name: string; value: number; rating: string; id: string; navigationType: string }) {
  if (metric.name !== "LCP" || !initial) return;
  // Playwright, Selenium and the like set this; the e2e suites must not become field data.
  if (navigator.webdriver) return;
  const conn = (navigator as Navigator & { connection?: Connection }).connection;
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    navigationType: metric.navigationType,
    path: initial.path,
    fromScan: initial.fromScan,
    connectionType: conn?.type ?? null,
    effectiveType: conn?.effectiveType ?? null,
  });
  // sendBeacon survives the page being closed; fetch keepalive only if it is missing
  // or refused. The server drops a second copy by the metric id.
  if (!(navigator.sendBeacon && navigator.sendBeacon("/api/vitals", body))) {
    fetch("/api/vitals", { method: "POST", body, keepalive: true }).catch(() => {});
  }
}

export function WebVitalsReporter() {
  useReportWebVitals(report);
  return null;
}
