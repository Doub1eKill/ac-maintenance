import path from "node:path";
import type { Page } from "@playwright/test";
import { test, OUT_ROOT, ledger, shot, note } from "../../lib";

const ADMIN_PAGES = ["/admin", "/admin/work-orders", "/admin/calendar", "/admin/approvals", "/admin/team", "/admin/assets", "/admin/qr-codes", "/admin/profile", "/admin/settings"];
const TECH_PAGES = ["/tech", "/tech/assets", "/tech/my-jobs", "/tech/history", "/tech/calendar", "/tech/profile"];
const LIVE_QR = "d8df0abf-de82-4a99-97d4-b48c4615fbe2"; // B572921-6-357199-01
const LIVE_CODE = "B572921-6-357199-01";

async function landing(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(800);
  return page.url();
}

test.describe("route protection", () => {
  test("logged out: every /admin and /tech page redirects to /login", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const results: string[] = [];
    let allOk = true;
    for (const p of [...ADMIN_PAGES, ...TECH_PAGES]) {
      const u = await landing(page, p);
      const ok = u.includes("/login");
      allOk &&= ok;
      results.push(`${ok ? "OK " : "LEAK"} ${p} -> ${u}`);
    }
    ledger("Permissions", "logged-out access to 15 protected pages all redirect to /login", "UI", allOk ? "PASS" : "FAIL", note("perm-logged-out.txt", results.join("\n")));
    await ctx.close();
  });

  test("technician session cannot open any /admin page", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: path.join(OUT_ROOT, "auth", "tech.json") });
    await ctx.addInitScript(() => sessionStorage.setItem("ac-maintenance.browser-session", "1"));
    const page = await ctx.newPage();
    const results: string[] = [];
    let allOk = true;
    for (const p of ADMIN_PAGES) {
      const u = await landing(page, p);
      const leaked = u.startsWith("http://localhost:3000/admin");
      allOk &&= !leaked;
      results.push(`${leaked ? "LEAK" : "OK "} ${p} -> ${u}`);
    }
    ledger("Permissions", "technician blocked from all 9 admin pages", "UI", allOk ? "PASS" : "FAIL", note("perm-tech-vs-admin.txt", results.join("\n")));
    await shot(page, "perm-tech-vs-admin-last");
    await ctx.close();
  });

  test("admin session cannot open any /tech page", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: path.join(OUT_ROOT, "auth", "admin.json") });
    await ctx.addInitScript(() => sessionStorage.setItem("ac-maintenance.browser-session", "1"));
    const page = await ctx.newPage();
    const results: string[] = [];
    let allOk = true;
    for (const p of TECH_PAGES) {
      const u = await landing(page, p);
      const leaked = u.startsWith("http://localhost:3000/tech");
      allOk &&= !leaked;
      results.push(`${leaked ? "LEAK" : "OK "} ${p} -> ${u}`);
    }
    ledger("Permissions", "admin blocked from all 6 tech pages", "UI", allOk ? "PASS" : "FAIL", note("perm-admin-vs-tech.txt", results.join("\n")));
    await ctx.close();
  });
});

test.describe("HTTP endpoints with the wrong session", () => {
  for (const [who, file] of [["logged-out", null], ["technician", "tech.json"], ["admin", "admin.json"]] as const) {
    test(`${who}: /api/tech/units and /api/admin/maintenance-schedules`, async ({ browser }) => {
      const ctx = await browser.newContext(file ? { storageState: path.join(OUT_ROOT, "auth", file) } : {});
      const r1 = await ctx.request.get("/api/tech/units");
      const r2 = await ctx.request.get("/api/admin/maintenance-schedules");
      const b1 = (await r1.text()).slice(0, 200);
      const b2 = (await r2.text()).slice(0, 200);
      const art = note(`api-${who}.txt`, `GET /api/tech/units -> ${r1.status()}\n${b1}\n\nGET /api/admin/maintenance-schedules -> ${r2.status()}\n${b2}`);
      // contract: tech units = technician only; schedules = any signed-in role
      const unitsExpected = who === "technician" ? r1.ok() : !r1.ok();
      const schedExpected = who === "logged-out" ? !r2.ok() : r2.ok();
      ledger("API", `${who}: /api/tech/units ${who === "technician" ? "allowed" : "refused"}`, "API", unitsExpected ? "PASS" : "FAIL", art);
      ledger("API", `${who}: /api/admin/maintenance-schedules ${who === "logged-out" ? "refused" : "allowed"}`, "API", schedExpected ? "PASS" : "FAIL", art);
      await ctx.close();
    });
  }
});

test.describe("/qr/[id] — public by design, but only by uuid", () => {
  test("live uuid resolves; ac_code, made-up uuid and junk do not", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const u = await landing(page, `/qr/${LIVE_QR}`);
    const body = await page.evaluate(() => document.body.innerText);
    const liveOk = body.includes(LIVE_CODE);
    ledger("QR", "/qr/<live uuid> shows the unit publicly (intended)", "UI", liveOk ? "PASS" : "FAIL", await shot(page, "qr-live"));
    void u;

    const r = await ctx.request.get(`/qr/${LIVE_CODE}`);
    ledger("QR", "/qr/<ac_code> must not resolve (404)", "API", r.status() === 404 ? "PASS" : "FAIL", note("qr-by-accode.txt", `status ${r.status()}`));

    const r2 = await ctx.request.get(`/qr/00000000-0000-4000-8000-000000000000`);
    ledger("QR", "/qr/<unknown uuid> → 404, not 500", "API", r2.status() === 404 ? "PASS" : "FAIL", note("qr-unknown.txt", `status ${r2.status()}`));

    const r3 = await ctx.request.get(`/qr/%27%20OR%201%3D1--`);
    ledger("QR", "/qr/<injection> → 404, not 500", "API", r3.status() === 404 ? "PASS" : "FAIL", note("qr-injection.txt", `status ${r3.status()}`));

    // recording work from the public page must still need a technician session
    await landing(page, `/qr/${LIVE_QR}`);
    const buttons = await page.getByRole("button").allInnerTexts();
    const links = await page.getByRole("link").allInnerTexts();
    const cta = [...buttons, ...links].filter((t) => /บันทึก|รับงาน|แจ้งซ่อม|เข้าสู่ระบบ/.test(t));
    ledger("QR", "public /qr page offers no mutation without login (CTAs seen: " + (cta.join(" | ") || "none") + ")", "UI", cta.some((t) => /บันทึก(งาน|ผล)|รับงาน/.test(t)) ? "FAIL" : "PASS", await shot(page, "qr-public-ctas"));
    await ctx.close();
  });
});
