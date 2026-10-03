/**
 * Whether someone counts as Online on the team page.
 *
 * The session is a JWT with no server-side record, so "is this person signed
 * in" cannot be read anywhere. Two columns on users stand in for it:
 * last_seen_at, moved at sign-in and by the heartbeat every open dashboard
 * sends while it is on screen, and signed_out_at, moved by an explicit sign-out.
 *
 * Online needs all of these:
 * - the account is active (a suspension ends the session within a minute);
 * - it was seen within ONLINE_WINDOW_MS (a closed or hidden tab stops the
 *   heartbeat, and the cookie it leaves behind proves nothing);
 * - it was seen since the last midnight (every session ends then);
 * - it was seen after its last sign-out. A second device that is still open
 *   sends the next heartbeat after that, which puts the person back online.
 *
 * No Prisma here: the client imports HEARTBEAT_INTERVAL_MS from this module.
 */
import { nextMidnightAfter } from "@/lib/session-expiry";

/** How often an open, visible dashboard reports in. */
export const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;

/** How long after the last report someone still counts as Online — two missed beats' worth. */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

/**
 * The heartbeat writes at most this often per person, however many tabs they
 * have open: last_seen_at only needs to be fresher than ONLINE_WINDOW_MS.
 */
export const TOUCH_THROTTLE_MS = 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PresenceFields {
  status: string;
  lastSeenAt: Date | null;
  signedOutAt: Date | null;
}

/** 00:00 Bangkok time at or before `now` — when today's sessions began. */
export function lastMidnightAtOrBefore(now: number): number {
  return nextMidnightAfter(now) - DAY_MS;
}

export function isOnline(user: PresenceFields, now: number = Date.now()): boolean {
  if (user.status !== "active" || !user.lastSeenAt) return false;
  const seen = user.lastSeenAt.getTime();
  if (now - seen >= ONLINE_WINDOW_MS) return false;
  if (seen < lastMidnightAtOrBefore(now)) return false;
  // Strictly after: the columns hold whole seconds, and a sign-out in the same
  // second as the last beat came after it.
  if (user.signedOutAt && seen <= user.signedOutAt.getTime()) return false;
  return true;
}

/**
 * The earliest last_seen_at that can still be Online at `now`. Lets the
 * database narrow the candidates before isOnline() decides.
 */
export function onlineCutoff(now: number = Date.now()): Date {
  return new Date(Math.max(now - ONLINE_WINDOW_MS, lastMidnightAtOrBefore(now)));
}
