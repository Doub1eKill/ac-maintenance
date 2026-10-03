"use client";

import { useEffect, useMemo, useState } from "react";
import type { PendingUser } from "@/components/admin/types";

/** How often the team page asks who is Online while it is on screen. */
const POLL_INTERVAL_MS = 60 * 1000;

/**
 * The team list with each person's Online flag kept current.
 *
 * The page renders with the flags the server worked out, then asks
 * /api/presence every minute while visible (and as soon as the tab is shown
 * again) — one small query, rather than router.refresh() re-rendering the
 * whole page for a dot. A failed request keeps the last known flags.
 */
export function useLivePresence(users: PendingUser[]): PendingUser[] {
  const [onlineIds, setOnlineIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const visible = () => document.visibilityState === "visible";

    async function poll() {
      try {
        const res = await fetch("/api/presence", { cache: "no-store", credentials: "same-origin" });
        if (!res.ok) return;
        const body = (await res.json()) as { online?: string[] };
        if (!cancelled && Array.isArray(body.online)) setOnlineIds(new Set(body.online));
      } catch {
        // Keep what is on screen.
      }
    }

    const timer = window.setInterval(() => {
      if (visible()) poll();
    }, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (visible()) poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return useMemo(
    () => (onlineIds ? users.map((u) => ({ ...u, online: onlineIds.has(u.id) })) : users),
    [users, onlineIds]
  );
}
