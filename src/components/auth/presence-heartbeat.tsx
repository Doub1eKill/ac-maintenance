"use client";

import { useEffect } from "react";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/presence";

function beat() {
  fetch("/api/presence", { method: "POST", credentials: "same-origin", keepalive: true }).catch(() => {
    // Lost signal: the person drops to Offline after a few minutes, which is
    // true enough of someone who cannot reach the server.
  });
}

/**
 * Tells the server this dashboard is open and on screen, so the team page can
 * show its owner as Online (see src/lib/presence.ts).
 *
 * Beats on load, every HEARTBEAT_INTERVAL_MS while the tab is visible, and the
 * moment a hidden tab comes back. A hidden tab, a locked phone or a closed
 * browser stops it, and the person turns Offline once ONLINE_WINDOW_MS passes.
 * Rendered in the /admin and /tech layouts, beside BrowserSessionGuard.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    const visible = () => document.visibilityState === "visible";
    if (visible()) beat();

    const timer = window.setInterval(() => {
      if (visible()) beat();
    }, HEARTBEAT_INTERVAL_MS);
    const onVisibility = () => {
      if (visible()) beat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
