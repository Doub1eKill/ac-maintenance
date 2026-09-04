"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { BROWSER_SESSION_KEY } from "@/lib/session-expiry";

/**
 * Ends the session when the app is opened in a browser that has been closed and
 * reopened since signing in.
 *
 * The signed-in cookie survives a browser restart and there is no way to ask
 * Auth.js for one that does not — it writes its own `expires` onto the cookie
 * regardless of what the config says. So the check happens here instead, using
 * sessionStorage, which the browser itself discards when it closes: a dashboard
 * that loads with no marker is being shown to a browser session that never
 * signed in, and it signs out.
 *
 * Rendered only inside the /admin and /tech layouts, where a session exists by
 * definition. The login page sets the same marker as it loads, so signing in
 * and being redirected straight to a dashboard is not mistaken for this.
 *
 * Known trade-off, deliberately accepted: a browser tab opened from scratch
 * (Ctrl+T, then typing the address) gets its own empty sessionStorage and is
 * therefore signed out too. Duplicating a tab, following a link, refreshing and
 * navigating all carry the marker across and are unaffected.
 */
export function BrowserSessionGuard() {
  useEffect(() => {
    let alreadyMarked: boolean;

    try {
      alreadyMarked = window.sessionStorage.getItem(BROWSER_SESSION_KEY) !== null;
      window.sessionStorage.setItem(BROWSER_SESSION_KEY, "1");
    } catch {
      // Storage can throw outright — a browser set to block site data, or
      // private mode in some browsers. Signing everyone out because the marker
      // could not be read would be far worse than not enforcing this, so the
      // midnight rule is left to carry it on its own.
      return;
    }

    if (!alreadyMarked) {
      signOut({ callbackUrl: "/login" });
    }
  }, []);

  return null;
}
