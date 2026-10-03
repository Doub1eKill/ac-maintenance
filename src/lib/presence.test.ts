import { describe, expect, it } from "vitest";
import { isOnline, lastMidnightAtOrBefore, onlineCutoff, ONLINE_WINDOW_MS } from "@/lib/presence";

const at = (iso: string) => Date.parse(iso);
const date = (iso: string) => new Date(iso);

// 10:00 in Bangkok on 4 Oct.
const NOW = at("2026-10-04T03:00:00Z");

function user(overrides: Partial<Parameters<typeof isOnline>[0]> = {}) {
  return { status: "active", lastSeenAt: date("2026-10-04T02:59:00Z"), signedOutAt: null, ...overrides };
}

describe("isOnline", () => {
  it("is true for an active account seen a minute ago", () => {
    expect(isOnline(user(), NOW)).toBe(true);
  });

  it("is false once the window has passed without a heartbeat", () => {
    expect(isOnline(user({ lastSeenAt: new Date(NOW - ONLINE_WINDOW_MS + 1000) }), NOW)).toBe(true);
    expect(isOnline(user({ lastSeenAt: new Date(NOW - ONLINE_WINDOW_MS) }), NOW)).toBe(false);
  });

  it("is false for an account never seen", () => {
    expect(isOnline(user({ lastSeenAt: null }), NOW)).toBe(false);
  });

  it("is false for pending and suspended accounts however recent", () => {
    expect(isOnline(user({ status: "suspended" }), NOW)).toBe(false);
    expect(isOnline(user({ status: "pending" }), NOW)).toBe(false);
  });

  it("is false after a sign-out, including one in the same second as the last beat", () => {
    expect(isOnline(user({ signedOutAt: date("2026-10-04T02:59:30Z") }), NOW)).toBe(false);
    expect(isOnline(user({ signedOutAt: date("2026-10-04T02:59:00Z") }), NOW)).toBe(false);
  });

  it("is true again when another device beats after the sign-out", () => {
    expect(isOnline(user({ signedOutAt: date("2026-10-04T02:58:00Z") }), NOW)).toBe(true);
  });

  it("drops everyone at midnight, even inside the window", () => {
    // 00:02 Bangkok; last seen 23:59 the night before, when every session ended.
    const justAfterMidnight = at("2026-10-04T17:02:00Z");
    expect(isOnline(user({ lastSeenAt: date("2026-10-04T16:59:00Z") }), justAfterMidnight)).toBe(false);
    expect(isOnline(user({ lastSeenAt: date("2026-10-04T17:01:00Z") }), justAfterMidnight)).toBe(true);
  });
});

describe("lastMidnightAtOrBefore / onlineCutoff", () => {
  it("gives today's 00:00 Bangkok", () => {
    expect(lastMidnightAtOrBefore(NOW)).toBe(at("2026-10-03T17:00:00Z"));
    expect(lastMidnightAtOrBefore(at("2026-10-03T17:00:00Z"))).toBe(at("2026-10-03T17:00:00Z"));
  });

  it("is the window's start in the day and midnight just after it", () => {
    expect(onlineCutoff(NOW).getTime()).toBe(NOW - ONLINE_WINDOW_MS);
    expect(onlineCutoff(at("2026-10-04T17:02:00Z")).getTime()).toBe(at("2026-10-04T17:00:00Z"));
  });
});
