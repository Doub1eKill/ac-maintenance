import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { clientIp } from "@/lib/login-throttle";

const request = (headers: Record<string, string>) => new Request("https://example.test/login", { headers });

describe("clientIp", () => {
  it("takes the first address Vercel forwards", () => {
    expect(clientIp(request({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip, then to nothing", () => {
    expect(clientIp(request({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(clientIp(request({}))).toBeNull();
    expect(clientIp(undefined)).toBeNull();
  });

  it("fits the column", () => {
    expect(clientIp(request({ "x-forwarded-for": "a".repeat(100) }))).toHaveLength(64);
  });
});
