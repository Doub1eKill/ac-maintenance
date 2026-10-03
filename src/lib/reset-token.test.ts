import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createResetToken, resetTokenUserId, verifyResetToken } from "@/lib/reset-token";

beforeAll(() => {
  process.env.AUTH_SECRET = "unit-test-secret";
});

afterEach(() => {
  vi.useRealTimers();
});

const parts = (token: string) => Buffer.from(token, "base64url").toString().split(":");
const pack = (s: string) => Buffer.from(s).toString("base64url");

describe("password reset tokens", () => {
  it("verifies against the password hash it was made for", () => {
    const token = createResetToken(42, "hash-before");
    expect(resetTokenUserId(token)).toBe(42);
    expect(verifyResetToken(token, "hash-before")).toEqual({ userId: 42 });
  });

  it("stops verifying once the password has changed, so a link works once", () => {
    const token = createResetToken(42, "hash-before");
    expect(verifyResetToken(token, "hash-after")).toBeNull();
  });

  it("works for an account that has no password yet", () => {
    const token = createResetToken(7, null);
    expect(verifyResetToken(token, null)).toEqual({ userId: 7 });
    expect(verifyResetToken(token, "hash-set-since")).toBeNull();
  });

  it("expires after an hour", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
    const token = createResetToken(42, "h");
    vi.setSystemTime(new Date("2026-10-03T10:59:00Z"));
    expect(verifyResetToken(token, "h")).toEqual({ userId: 42 });
    vi.setSystemTime(new Date("2026-10-03T11:00:01Z"));
    expect(verifyResetToken(token, "h")).toBeNull();
  });

  it("refuses a token moved to another account or given a later expiry", () => {
    const [id, expires, signature] = parts(createResetToken(42, "h"));
    expect(verifyResetToken(pack(`43:${expires}:${signature}`), "h")).toBeNull();
    expect(verifyResetToken(pack(`${id}:${Number(expires) + 3_600_000}:${signature}`), "h")).toBeNull();
  });

  it("refuses garbage without throwing", () => {
    expect(verifyResetToken("not-a-token", "h")).toBeNull();
    expect(resetTokenUserId("not-a-token")).toBeNull();
    expect(resetTokenUserId(pack("-5:1:x"))).toBeNull();
  });
});
