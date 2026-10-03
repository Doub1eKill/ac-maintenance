import { describe, expect, it } from "vitest";
import { isPastExpiry, nextMidnightAfter } from "@/lib/session-expiry";

const at = (iso: string) => Date.parse(iso);

describe("nextMidnightAfter (Bangkok, UTC+7)", () => {
  it("gives the coming midnight to a sign-in late in the evening", () => {
    // 22:00 in Bangkok on 3 Oct -> 00:00 on 4 Oct, which is 17:00 UTC on 3 Oct.
    expect(nextMidnightAfter(at("2026-10-03T15:00:00Z"))).toBe(at("2026-10-03T17:00:00Z"));
  });

  it("gives almost a full day to a sign-in just after midnight", () => {
    expect(nextMidnightAfter(at("2026-10-03T17:05:00Z"))).toBe(at("2026-10-04T17:00:00Z"));
  });

  it("treats exactly midnight as the start of a new day, not its end", () => {
    expect(nextMidnightAfter(at("2026-10-03T17:00:00Z"))).toBe(at("2026-10-04T17:00:00Z"));
  });
});

describe("isPastExpiry", () => {
  it("is false before the deadline and true from it on", () => {
    expect(isPastExpiry(1000, 999)).toBe(false);
    expect(isPastExpiry(1000, 1000)).toBe(true);
    expect(isPastExpiry(1000, 1001)).toBe(true);
  });

  it("counts a token without a numeric deadline as expired", () => {
    expect(isPastExpiry(undefined)).toBe(true);
    expect(isPastExpiry("1000", 0)).toBe(true);
    expect(isPastExpiry(null)).toBe(true);
  });
});
