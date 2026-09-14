import type { Page } from "@playwright/test";
import { test, expect, ledger, shot, note, hydrated, toastText, clearToasts, db } from "../../lib";

// Regressions for the technician-side findings of run 20260913-1742 — the QR
// scanner above all (BUG-002), which was a typed-code mock until fb801a5.
// Nothing here writes to the database: the scanner only reads, and the log
// form it hands off to is opened but never submitted.

const body = (page: Page) => page.evaluate(() => document.body.innerText as string);

async function openScanner(page: Page) {
  await page.goto("/tech");
  await page.locator("main").last().waitFor({ timeout: 120_000 });
  await hydrated(page, "main");
  await page.getByRole("button", { name: "สแกน QR Code" }).first().click();
  const dlg = page.locator("div.fixed.inset-0").filter({ hasText: /สแกนรหัส QR เครื่องปรับอากาศ/ }).first();
  await dlg.waitFor({ timeout: 10_000 });
  await page.waitForTimeout(600);
  return dlg;
}

async function lookUp(page: Page, dlg: ReturnType<Page["locator"]>, value: string) {
  await clearToasts(page);
  await dlg.locator("#qr-typed-code").fill(value);
  await dlg.getByRole("button", { name: "ค้นหา" }).click();
  await page.waitForTimeout(2500);
  return (await dlg.innerText().catch(() => "")).replace(/\s+/g, " ");
}

function units() {
  const [[pendingCode, pendingUuid]] = db(
    "select a.ac_code, a.qr_code from air_conditioners a where exists (select 1 from work_orders w where w.air_conditioner_id=a.id and w.status='pending') order by a.id limit 1"
  );
  const [[freeCode, freeUuid]] = db(
    "select a.ac_code, a.qr_code from air_conditioners a where not exists (select 1 from work_orders w where w.air_conditioner_id=a.id and w.status in ('pending','claimed')) order by a.id limit 1"
  );
  return { pendingCode: pendingCode!, pendingUuid: pendingUuid!, freeCode: freeCode!, freeUuid: freeUuid! };
}

test("BUG-002: the scanner is real — no mock label, sticker uuid and URL resolve, no placeholder PM button", async ({ page }) => {
  const u = units();
  const dlg = await openScanner(page);
  const first = await dlg.innerText();
  ledger("QR scan", "modal carries no 'จำลอง' wording", "UI", /จำลอง/.test(first) ? "FAIL" : "PASS", await shot(page, "reg-qr-modal"));
  // Desktop Chromium on Windows/Linux has no usable BarcodeDetector, so the
  // typed field is the whole scanner here and the modal must say so.
  ledger("QR scan", "without a usable camera the modal explains and offers the typed field", "UI", /พิมพ์รหัสเครื่อง|วางลิงก์จากสติกเกอร์/.test(first) && (await dlg.locator("#qr-typed-code").count()) ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/reg-qr-modal.png");

  let t = await lookUp(page, dlg, u.pendingUuid);
  ledger("QR scan", `bare uuid → ${u.pendingCode} with 'รับงานทันที'`, "UI", t.includes(u.pendingCode) && /รับงานทันที/.test(t) ? "PASS" : "FAIL", await shot(page, "reg-qr-uuid"));

  await dlg.getByRole("button", { name: "สแกนเครื่องใหม่" }).click();
  await page.waitForTimeout(400);
  t = await lookUp(page, dlg, `http://localhost:3000/qr/${u.freeUuid}`);
  const offersLog = /บันทึกงานซ่อมบำรุงเครื่องนี้/.test(t);
  ledger("QR scan", `sticker URL → ${u.freeCode}; no open job → offers the real log form, not 'สร้างใบงาน PM ใหม่'`, "UI", t.includes(u.freeCode) && offersLog && !/สร้างใบงาน PM/.test(t) ? "PASS" : "FAIL", await shot(page, "reg-qr-url"));

  await dlg.getByRole("button", { name: /บันทึกงานซ่อมบำรุงเครื่องนี้/ }).click();
  await page.waitForTimeout(1200);
  const after = (await body(page)).replace(/\s+/g, " ");
  const logOpen = /บันทึกประวัติการซ่อม/.test(after) && after.includes(u.freeCode);
  ledger("QR scan", "hand-off opens the log form for that unit and closes the scanner", "UI", logOpen && !/สแกนรหัส QR เครื่องปรับอากาศ/.test(after) ? "PASS" : "FAIL", await shot(page, "reg-qr-handoff"));
  // Not submitted: that would write a visit. Close it.
  await page.locator("div.fixed.inset-0").filter({ hasText: /บันทึกประวัติการซ่อม/ }).first().locator("button:has(svg.lucide-x)").first().click().catch(() => {});
  await page.waitForTimeout(400);

  const dlg2 = await openScanner(page);
  t = await lookUp(page, dlg2, u.pendingCode);
  ledger("QR scan", `typed acCode ${u.pendingCode} still resolves`, "UI", t.includes(u.pendingCode) ? "PASS" : "FAIL", await shot(page, "reg-qr-accode"));

  // The result offers the unit's history (added after the handset test: the
  // technician at the machine wanted to see what was done last time).
  await dlg2.getByRole("button", { name: /ดูประวัติเครื่องนี้/ }).click();
  await page.waitForTimeout(2500);
  const hist = (await body(page)).replace(/\s+/g, " ");
  ledger("QR scan", "'ดูประวัติเครื่องนี้' closes the scanner and opens the unit's history modal", "UI", /ประวัติการซ่อมบำรุง/.test(hist) && hist.includes(u.pendingCode) && !/สแกนรหัส QR เครื่องปรับอากาศ/.test(hist) ? "PASS" : "FAIL", await shot(page, "reg-qr-history"));
  await page.locator("div.fixed.inset-0").filter({ hasText: /ประวัติการซ่อมบำรุง/ }).first().locator("button:has(svg.lucide-x)").first().click().catch(() => {});
  await page.waitForTimeout(400);

  const dlg3 = await openScanner(page);
  await lookUp(page, dlg3, "QA-NOT-A-REAL-CODE");
  const tt = await toastText(page, 3000);
  ledger("QR scan", `unknown code → "${tt}"`, "UI", /ไม่พบข้อมูลเครื่องปรับอากาศ/.test(tt) ? "PASS" : "FAIL", await shot(page, "reg-qr-unknown"));
});

test("BUG-002: with a camera, a sticker in view resolves by itself; an unknown code toasts once, not per frame", async ({ browser }) => {
  const u = units();
  // Chromium's fake camera plus a BarcodeDetector stub that "sees" whatever
  // window.__qr holds. The detector API itself only exists on Android/macOS
  // Chrome; this exercises the modal's camera path, not the platform decoder.
  const ctx = await browser.newContext({
    permissions: ["camera"],
    storageState: (test.info().project.use as { storageState?: string }).storageState,
  });
  await ctx.addInitScript(() => sessionStorage.setItem("ac-maintenance.browser-session", "1"));
  await ctx.addInitScript(() => {
    const w = window as unknown as { __qr: string; __detects: number; BarcodeDetector: unknown };
    w.__qr = "";
    w.__detects = 0;
    w.BarcodeDetector = class {
      static async getSupportedFormats() { return ["qr_code"]; }
      async detect() { w.__detects += 1; return w.__qr ? [{ rawValue: w.__qr, format: "qr_code" }] : []; }
    };
  });
  const page = await ctx.newPage();
  const dlg = await openScanner(page);
  const scanning = /เล็งกล้องไปที่ QR Code/.test(await dlg.innerText());
  ledger("QR scan", "camera path: stream starts and the modal says to aim at the sticker", "UI", scanning ? "PASS" : "FAIL", await shot(page, "reg-qr-camera-live"));

  // Unknown code held in view for three seconds: one lookup, one toast.
  const posts: number[] = [];
  page.on("request", (r) => { if (r.method() === "POST" && r.headers()["next-action"]) posts.push(Date.now()); });
  await page.evaluate(() => { (window as unknown as { __qr: string }).__qr = "http://localhost:3000/qr/00000000-0000-4000-8000-000000000000"; });
  await page.waitForTimeout(3000);
  const toasts = await page.locator("[data-sonner-toaster] li").count();
  note("reg-qr-camera-unknown.txt", `lookups in 3s: ${posts.length}; toasts: ${toasts}; detects: ${await page.evaluate(() => (window as unknown as { __detects: number }).__detects)}`);
  ledger("QR scan", `unknown code in view for 3s → ${posts.length} lookup(s), ${toasts} toast(s)`, "UI", posts.length === 1 && toasts === 1 ? "PASS" : "FAIL", await shot(page, "reg-qr-camera-unknown"));

  // Then a real sticker: the result appears without typing.
  await page.evaluate((url) => { (window as unknown as { __qr: string }).__qr = url; }, `http://localhost:3000/qr/${u.pendingUuid}`);
  await dlg.getByText(u.pendingCode).waitFor({ timeout: 10_000 }).catch(() => {});
  const t = (await dlg.innerText().catch(() => "")).replace(/\s+/g, " ");
  ledger("QR scan", `camera read of ${u.pendingCode}'s sticker resolves without typing`, "UI", t.includes(u.pendingCode) && /รับงานทันที/.test(t) ? "PASS" : "FAIL", await shot(page, "reg-qr-camera-result"));
  await ctx.close();
});

test("BUG-011: technician pages carry exactly one <main>", async ({ page }) => {
  for (const path of ["/tech", "/tech/assets", "/tech/profile"]) {
    await page.goto(path);
    await page.locator("main").last().waitFor({ timeout: 120_000 });
    await page.waitForTimeout(800);
    const mains = await page.locator("main").count();
    ledger("A11y", `${path}: ${mains} <main> landmark(s)`, "UI", mains === 1 ? "PASS" : "FAIL", "—");
  }
});

// Keep TypeScript honest about the helper we do not use in every test.
void expect;
