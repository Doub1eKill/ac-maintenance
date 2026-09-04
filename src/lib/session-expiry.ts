/**
 * When a signed-in session stops being valid.
 *
 * Two rules, asked for together: a session must not survive the browser being
 * closed and reopened, and it must not survive midnight.
 *
 * The midnight half lives here because it is the one the server can enforce on
 * its own — it is a property of the token, checked on every request. The
 * browser half cannot be: Auth.js always writes an `expires` onto the session
 * cookie (lib/utils/cookie.js merges its own `{ expires }` over anything
 * configured), so there is no way to ask for a cookie that dies with the
 * browser. That half is handled by BrowserSessionGuard, which notices that this
 * is a fresh browser session and signs out.
 *
 * No date-fns and no imports from lib/maintenance: this is imported by
 * auth.config.ts, which proxy.ts loads on every request and which is kept free
 * of heavy dependencies on purpose.
 */

/** The app's timezone. Thailand is UTC+7 year round — no daylight saving. */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The next 00:00 Bangkok time strictly after `now`, as an epoch timestamp.
 *
 * Signing in at 22:00 gives two hours; signing in at 00:05 gives just under a
 * full day. Exactly at midnight the session is already over — the comparison
 * that uses this is `now >= expiresAt`, so a token minted at 00:00:00 expires
 * the following midnight rather than instantly.
 */
export function nextMidnightAfter(now: number = Date.now()): number {
  const local = now + BANGKOK_OFFSET_MS;
  const midnightLocal = Math.floor(local / DAY_MS) * DAY_MS + DAY_MS;
  return midnightLocal - BANGKOK_OFFSET_MS;
}

/**
 * Whether a token has passed its midnight.
 *
 * A token with no `expiresAt` counts as expired. Those are the ones minted
 * before this rule existed, and letting them through would leave whoever was
 * already signed in exempt from it until they happened to sign in again — the
 * one group the change is most obviously meant to cover. The cost is a single
 * forced sign-in when this ships.
 */
export function isPastExpiry(expiresAt: unknown, now: number = Date.now()): boolean {
  if (typeof expiresAt !== "number") {
    return true;
  }
  return now >= expiresAt;
}

/**
 * The key BrowserSessionGuard writes into sessionStorage, which the browser
 * discards when it closes. Shared with the login form, which sets it as part of
 * signing in so the redirect straight after login is not read as a stale
 * session and bounced back out.
 */
export const BROWSER_SESSION_KEY = "ac-maintenance.browser-session";
