import { beforeEach, describe, expect, it, vi } from "vitest";

// The table is mocked: what is under test is the decision made from the counts.
const loginFailure = vi.hoisted(() => ({
  count: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { loginFailure } }));

import { clientIp, isThrottled, recordFailure } from "@/lib/login-throttle";

const request = (headers: Record<string, string>) => new Request("https://example.test/login", { headers });

/** Answers the two count() calls: the per-address one and the per-IP one. */
function counts(byEmail: number, byIp: number) {
  loginFailure.count.mockImplementation(async ({ where }: { where: { email?: string; ip?: string } }) =>
    where.ip !== undefined ? byIp : byEmail
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

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

describe("isThrottled: per address", () => {
  it("allows the 10th attempt and refuses from the 11th (10 failures already counted)", async () => {
    counts(9, 0);
    expect(await isThrottled("a@x.test", "203.0.113.5")).toBe(false);
    counts(10, 0);
    expect(await isThrottled("a@x.test", "203.0.113.5")).toBe(true);
  });
});

describe("isThrottled: per IP", () => {
  it("allows up to 49 failures from one IP across addresses and refuses at 50", async () => {
    counts(0, 49);
    expect(await isThrottled("fresh@x.test", "203.0.113.5")).toBe(false);
    counts(0, 50);
    expect(await isThrottled("fresh@x.test", "203.0.113.5")).toBe(true);
  });

  it("counts the IP over the same 15-minute window as the address", async () => {
    counts(0, 0);
    const before = Date.now();
    await isThrottled("a@x.test", "203.0.113.5");
    const byIp = loginFailure.count.mock.calls.find(([arg]) => arg.where.ip !== undefined)?.[0];
    expect(byIp.where.ip).toBe("203.0.113.5");
    const since = byIp.where.createdAt.gte.getTime();
    expect(before - since).toBeGreaterThanOrEqual(15 * 60 * 1000 - 50);
    expect(before - since).toBeLessThanOrEqual(15 * 60 * 1000 + 1000);
  });

  it("does not count by IP when there is none (local requests)", async () => {
    counts(0, 999);
    expect(await isThrottled("a@x.test", null)).toBe(false);
    expect(loginFailure.count).toHaveBeenCalledTimes(1);
  });
});

describe("failing open", () => {
  it("lets the attempt through when the table cannot be read", async () => {
    loginFailure.count.mockRejectedValue(new Error("db down"));
    expect(await isThrottled("a@x.test", "203.0.113.5")).toBe(false);
  });

  it("does not throw when a failure cannot be recorded", async () => {
    loginFailure.create.mockRejectedValue(new Error("db down"));
    await expect(recordFailure("a@x.test", "203.0.113.5")).resolves.toBeUndefined();
  });

  it("records the IP with the failure", async () => {
    loginFailure.create.mockResolvedValue({});
    loginFailure.deleteMany.mockResolvedValue({ count: 0 });
    await recordFailure("a@x.test", "203.0.113.5");
    expect(loginFailure.create).toHaveBeenCalledWith({ data: { email: "a@x.test", ip: "203.0.113.5" } });
  });
});
