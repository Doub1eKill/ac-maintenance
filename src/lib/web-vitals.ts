/**
 * Field LCP collection for the TTACON 2026 paper (see Doc/TTACON2026_LCP_
 * Implementation.md and the review that approved it). Temporary: the table,
 * the reporter and /api/vitals come out once the paper is submitted.
 *
 * This module holds the rules, with no Prisma and no Next imports, so both the
 * route and the unit tests use the same code. What it decides:
 * - which page a sample belongs to (ids collapsed, unknown paths refused);
 * - whether a body is a believable LCP sample at all;
 * - which device family sent it, from the User-Agent;
 * - whether one client address has sent too many in a short window.
 */

/** Every page the app serves, with dynamic segments written as in the router. */
export const VITALS_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/pending-approval",
  "/request-password-reset",
  "/reset-password",
  "/qr/[id]",
  "/admin",
  "/admin/approvals",
  "/admin/assets",
  "/admin/calendar",
  "/admin/profile",
  "/admin/qr-codes",
  "/admin/settings",
  "/admin/team",
  "/admin/work-orders",
  "/tech",
  "/tech/assets",
  "/tech/calendar",
  "/tech/catalogue",
  "/tech/history",
  "/tech/my-jobs",
  "/tech/profile",
]);

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** "/qr/2c9…-…" -> "/qr/[id]"; trailing slash dropped. */
export function normalizeVitalsPath(pathname: string): string {
  const p = pathname.replace(UUID, "[id]").replace(/\/+$/, "");
  return p === "" ? "/" : p;
}

const NAVIGATION_TYPES = new Set(["navigate", "reload", "back-forward", "back-forward-cache", "prerender", "restore"]);
const RATINGS = new Set(["good", "needs-improvement", "poor"]);
const CONNECTION_TYPES = new Set(["wifi", "cellular", "ethernet", "bluetooth", "wimax", "other", "none", "unknown", "mixed"]);
const EFFECTIVE_TYPES = new Set(["slow-2g", "2g", "3g", "4g"]);

/** Bodies larger than this are not a single sample. */
export const MAX_VITALS_BODY = 2048;
/** No real page takes a minute to paint its largest element; anything beyond is noise or forged. */
export const MAX_LCP_MS = 60_000;

export interface VitalSample {
  metricId: string;
  valueMs: number;
  rating: string;
  navigationType: string;
  path: string;
  fromScan: boolean;
  connectionType: string | null;
  effectiveType: string | null;
}

/** Parses and checks a body from the reporter. null means "drop it", for any reason. */
export function parseVitalSample(body: string): VitalSample | null {
  if (body.length === 0 || body.length > MAX_VITALS_BODY) return null;
  let raw: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    raw = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  const str = (v: unknown) => (typeof v === "string" ? v : null);

  if (raw.name !== "LCP") return null;
  const value = raw.value;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > MAX_LCP_MS) return null;

  // web-vitals ids look like "v5-1696500000000-1234567890123"; anything else is not from the library.
  const metricId = str(raw.id);
  if (!metricId || metricId.length > 100 || !/^v\d+-[\w.-]+$/.test(metricId)) return null;

  const rating = str(raw.rating);
  if (!rating || !RATINGS.has(rating)) return null;
  const navigationType = str(raw.navigationType);
  if (!navigationType || !NAVIGATION_TYPES.has(navigationType)) return null;

  const pathRaw = str(raw.path);
  if (!pathRaw || pathRaw.length > 200) return null;
  const path = normalizeVitalsPath(pathRaw);
  if (!VITALS_PATHS.has(path)) return null;

  const conn = str(raw.connectionType);
  const eff = str(raw.effectiveType);
  return {
    metricId,
    valueMs: Math.round(value),
    rating,
    navigationType,
    path,
    fromScan: raw.fromScan === true,
    connectionType: conn && CONNECTION_TYPES.has(conn) ? conn : null,
    effectiveType: eff && EFFECTIVE_TYPES.has(eff) ? eff : null,
  };
}

/**
 * Device family from the User-Agent. Every browser on iOS is WebKit, so they
 * are one group. iPadOS reports itself as a Mac and lands in "desktop" — a
 * known limitation, noted in the paper.
 */
export function deviceFromUserAgent(ua: string | null): "ios" | "android" | "desktop" | "other" {
  if (!ua) return "other";
  if (/iPhone|iPod|iPad/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Windows NT|Macintosh|X11|CrOS|Linux x86_64/.test(ua)) return "desktop";
  return "other";
}

/** Automation that announces itself. The reporter already skips navigator.webdriver; this is the second net. */
export function isAutomatedUserAgent(ua: string | null): boolean {
  return !!ua && /HeadlessChrome|Playwright|Puppeteer|Lighthouse|bot\b|spider|crawl/i.test(ua);
}

/** Per-address cap, generous because campus Wi-Fi and mobile CGNAT put many people behind one IP. */
export const VITALS_LIMIT = 300;
export const VITALS_WINDOW_MS = 10 * 60 * 1000;

/**
 * In-memory fixed-window counter. Per server instance only — enough to blunt a
 * flood, not a guarantee; anything odd still shows up in the data by its
 * timestamps. Kept on globalThis by the caller (production builds duplicate
 * modules across bundles).
 */
export class WindowCounter {
  private hits = new Map<string, { start: number; count: number }>();
  constructor(private limit = VITALS_LIMIT, private windowMs = VITALS_WINDOW_MS) {}

  /** true if this hit is allowed. */
  allow(key: string, now = Date.now()): boolean {
    const h = this.hits.get(key);
    if (!h || now - h.start >= this.windowMs) {
      this.hits.set(key, { start: now, count: 1 });
      if (this.hits.size > 10_000) this.prune(now);
      return true;
    }
    h.count += 1;
    return h.count <= this.limit;
  }

  private prune(now: number) {
    for (const [k, h] of this.hits) if (now - h.start >= this.windowMs) this.hits.delete(k);
  }
}
