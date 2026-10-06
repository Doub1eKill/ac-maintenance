import { describe, expect, it } from "vitest";
import {
  MAX_VITALS_BODY,
  WindowCounter,
  deviceFromUserAgent,
  isAutomatedUserAgent,
  normalizeVitalsPath,
  parseVitalSample,
} from "@/lib/web-vitals";

const good = {
  name: "LCP",
  value: 812.4,
  rating: "good",
  id: "v4-1791300000000-1234567890123",
  navigationType: "navigate",
  path: "/qr/2c9e1f3a-0b4d-4e5f-8a6b-7c8d9e0f1a2b",
  fromScan: false,
  connectionType: "wifi",
  effectiveType: "4g",
};
const body = (over: Record<string, unknown> = {}) => JSON.stringify({ ...good, ...over });

describe("normalizeVitalsPath", () => {
  it("collapses ids and trailing slashes", () => {
    expect(normalizeVitalsPath("/qr/2C9E1F3A-0B4D-4E5F-8A6B-7C8D9E0F1A2B")).toBe("/qr/[id]");
    expect(normalizeVitalsPath("/tech/")).toBe("/tech");
    expect(normalizeVitalsPath("/")).toBe("/");
  });
});

describe("parseVitalSample", () => {
  it("accepts a real LCP sample and rounds the value", () => {
    expect(parseVitalSample(body())).toEqual({
      metricId: good.id,
      valueMs: 812,
      rating: "good",
      navigationType: "navigate",
      path: "/qr/[id]",
      fromScan: false,
      connectionType: "wifi",
      effectiveType: "4g",
    });
  });

  it("refuses other metrics, impossible values and forged ids", () => {
    expect(parseVitalSample(body({ name: "CLS" }))).toBeNull();
    expect(parseVitalSample(body({ value: 0 }))).toBeNull();
    expect(parseVitalSample(body({ value: 60_001 }))).toBeNull();
    expect(parseVitalSample(body({ value: "800" }))).toBeNull();
    expect(parseVitalSample(body({ id: "anything" }))).toBeNull();
    expect(parseVitalSample(body({ rating: "excellent" }))).toBeNull();
    expect(parseVitalSample(body({ navigationType: "teleport" }))).toBeNull();
  });

  it("refuses pages the app does not have", () => {
    expect(parseVitalSample(body({ path: "/wp-admin" }))).toBeNull();
    expect(parseVitalSample(body({ path: "/api/vitals" }))).toBeNull();
    expect(parseVitalSample(body({ path: "/tech/my-jobs" }))?.path).toBe("/tech/my-jobs");
  });

  it("refuses junk, arrays and oversized bodies", () => {
    expect(parseVitalSample("not json")).toBeNull();
    expect(parseVitalSample("[]")).toBeNull();
    expect(parseVitalSample("")).toBeNull();
    expect(parseVitalSample(body({ pad: "x".repeat(MAX_VITALS_BODY) }))).toBeNull();
  });

  it("keeps unknown connection hints out rather than refusing the sample", () => {
    const s = parseVitalSample(body({ connectionType: "carrier-pigeon", effectiveType: null }));
    expect(s?.connectionType).toBeNull();
    expect(s?.effectiveType).toBeNull();
  });

  it("records the hand-off from the QR page only when it is literally true", () => {
    expect(parseVitalSample(body({ path: "/tech", fromScan: true }))?.fromScan).toBe(true);
    expect(parseVitalSample(body({ path: "/tech", fromScan: "yes" }))?.fromScan).toBe(false);
  });
});

describe("deviceFromUserAgent", () => {
  it("groups every iOS browser together and tells Android from desktop", () => {
    expect(deviceFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X) AppleWebKit/605.1.15 Version/26.2 Mobile/15E148 Safari/604.1")).toBe("ios");
    expect(deviceFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X) AppleWebKit/605.1.15 CriOS/140.0 Mobile/15E148 Safari/604.1")).toBe("ios");
    expect(deviceFromUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/153.0 Mobile Safari/537.36")).toBe("android");
    expect(deviceFromUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153.0 Safari/537.36")).toBe("desktop");
    expect(deviceFromUserAgent(null)).toBe("other");
  });

  it("files iPadOS (which claims to be a Mac) under desktop — the known limitation", () => {
    expect(deviceFromUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.2 Safari/605.1.15")).toBe("desktop");
  });
});

describe("isAutomatedUserAgent", () => {
  it("catches self-announcing automation and lets real browsers through", () => {
    expect(isAutomatedUserAgent("Mozilla/5.0 HeadlessChrome/153.0")).toBe(true);
    expect(isAutomatedUserAgent("Mozilla/5.0 (Linux; Android 11; moto g power) Chrome-Lighthouse")).toBe(true);
    expect(isAutomatedUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/153.0 Mobile Safari/537.36")).toBe(false);
  });
});

describe("WindowCounter", () => {
  it("allows up to the limit per window and resets after it", () => {
    const c = new WindowCounter(3, 1000);
    expect([c.allow("a", 0), c.allow("a", 1), c.allow("a", 2), c.allow("a", 3)]).toEqual([true, true, true, false]);
    expect(c.allow("b", 3)).toBe(true);
    expect(c.allow("a", 1000)).toBe(true);
  });
});
