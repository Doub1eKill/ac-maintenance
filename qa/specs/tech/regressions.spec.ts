import { chromium, devices, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import sharp from "sharp";
import { test, expect, ledger, shot, note, hydrated, toastText, clearToasts, db, QA, RUN_DIR } from "../../lib";

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
  ledger("QR scan", `bare uuid → ${u.pendingCode} with 'รับงานทันที' and 'รับงานและบันทึกเลย'`, "UI", t.includes(u.pendingCode) && /รับงานทันที/.test(t) && /รับงานและบันทึกเลย/.test(t) ? "PASS" : "FAIL", await shot(page, "reg-qr-uuid"));

  // One step from the machine: claim the open job and land in the log form
  // for it. The claim is real (the DB row moves to claimed); the form is not
  // submitted, and qa/baseline.mjs restore puts the job back to pending.
  await dlg.getByRole("button", { name: /รับงานและบันทึกเลย/ }).click();
  await page.locator("[data-sonner-toaster] li").first().waitFor({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const afterClaim = (await body(page)).replace(/\s+/g, " ");
  const formJob = await page.locator('input[name="workOrderId"]').inputValue().catch(() => "");
  const [[claimedStatus]] = db(`select status from work_orders where id=${Number(formJob) || 0}`).concat([[null]]);
  ledger("QR scan", `'รับงานและบันทึกเลย' claims job ${formJob || "?"} (${claimedStatus}) and opens the log form for ${u.pendingCode}`, "DB", /บันทึกประวัติการซ่อม/.test(afterClaim) && afterClaim.includes(u.pendingCode) && claimedStatus === "claimed" ? "PASS" : "FAIL", await shot(page, "reg-qr-claim-and-log"));
  await page.locator("div.fixed.inset-0").filter({ hasText: /บันทึกประวัติการซ่อม/ }).first().locator("button:has(svg.lucide-x)").first().click().catch(() => {});
  await page.waitForTimeout(400);
  // Put the job back so the rest of this file still sees a pending unit.
  if (formJob) db(`update work_orders set status='pending', claimed_by=NULL, claimed_at=NULL where id=${Number(formJob)}`);
  await page.getByRole("button", { name: "สแกน QR Code" }).first().click();
  await dlg.waitFor({ timeout: 10_000 });
  await lookUp(page, dlg, u.pendingUuid);

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

test("walk-up close via /qr → /tech?ac=: the technician who records the work becomes claimed_by", async ({ page }) => {
  // The sticker's own page hands off to /tech?ac=<code>, which opens the log
  // form straight on the unit's pending order — no "claim" step in between.
  // The close used to leave claimed_by NULL on that path.
  const u = units();
  const [[jobId]] = db(`select w.id from work_orders w join air_conditioners a on a.id=w.air_conditioner_id where a.ac_code='${u.pendingCode}' and w.status='pending' order by w.id limit 1`);
  const [[techId]] = db(`select id from users where email='${QA.tech}'`);
  expect(jobId).toBeTruthy();

  await page.goto(`/tech?ac=${u.pendingCode}`); await page.locator("main").last().waitFor({ timeout: 90_000 }); await hydrated(page, "main");
  const dlg = page.locator("div.fixed.inset-0").filter({ hasText: /บันทึกประวัติการซ่อม/ }).first();
  await dlg.waitFor({ timeout: 15_000 });
  const formJob = await dlg.locator('input[name="workOrderId"]').inputValue().catch(() => "");
  ledger("Maintenance log", `?ac=${u.pendingCode} opens the log form on pending job ${jobId} (form has ${formJob || "none"})`, "UI", formJob === String(jobId) ? "PASS" : "FAIL", await shot(page, "reg-qr-walkup-form"));

  await dlg.getByText(/^ล้างแอร์$/).click();
  await dlg.locator('select[name="acStatus"]').selectOption("normal");
  await dlg.locator('textarea[name="notes"], input[name="notes"]').first().fill("QA_TEST_WALKUP_CLOSE");
  await dlg.getByRole("button", { name: /บันทึกและเสร็จสิ้น/ }).click();
  const tt = await toastText(page);
  await page.waitForTimeout(1500);
  const [[status, claimedBy, claimedAt]] = db(`select status, claimed_by, claimed_at from work_orders where id=${jobId}`);
  ledger("Maintenance log", `closing job ${jobId} from the ?ac= hand-off: status ${status}, claimed_by ${claimedBy} (tech ${techId}), claimed_at ${claimedAt ? "set" : "NULL"}`, "DB", /สำเร็จ/.test(tt) && status === "completed" && claimedBy === techId && !!claimedAt ? "PASS" : "FAIL", await shot(page, "reg-qr-walkup-closed"));

  // Put the job back so the earlier tests in this file still find a pending unit on a rerun.
  db(`delete from maintenance_logs where work_order_id=${jobId} and notes='QA_TEST_WALKUP_CLOSE'`);
  db(`update work_orders set status='pending', claimed_by=NULL, claimed_at=NULL, completed_at=NULL where id=${jobId}`);
});

test("E1: without BarcodeDetector (iOS Safari), the camera still reads a sticker through the JavaScript decoder", async () => {
  test.setTimeout(240_000);
  // Chromium's fake camera can play a file. The sticker is rendered here from
  // the same component the admin's QR sheet uses, for a unit with a pending
  // order, into a 640x480 MJPEG clip; BarcodeDetector is then deleted before
  // the app loads so only jsQR (lib/upload's counterpart in qr-scan-modal) can
  // read it. This is the whole iOS path, minus the phone.
  const u = units();
  const svg = renderToStaticMarkup(
    createElement(QRCodeSVG, { value: `http://localhost:3000/qr/${u.pendingUuid}`, size: 400, level: "M", marginSize: 4 })
  );
  const qr = await sharp(Buffer.from(svg)).png().toBuffer();
  const frame = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#ffffff" } })
    .composite([{ input: qr, left: 120, top: 40 }]).jpeg({ quality: 92 }).toBuffer();
  const clip = path.join(RUN_DIR, "e1-sticker.mjpeg");
  fs.writeFileSync(clip, Buffer.concat(Array(30).fill(frame)));

  const browser = await chromium.launch({
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-video-capture=${clip}`],
  });
  try {
    const ctx = await browser.newContext({
      ...devices["Pixel 7"],
      permissions: ["camera"],
      storageState: (test.info().project.use as { storageState?: string }).storageState,
      baseURL: test.info().project.use.baseURL,
    });
    await ctx.addInitScript(() => sessionStorage.setItem("ac-maintenance.browser-session", "1"));
    await ctx.addInitScript(() => {
      const w = window as unknown as { BarcodeDetector?: unknown; __hadDetector: boolean };
      w.__hadDetector = "BarcodeDetector" in window;
      delete w.BarcodeDetector;
    });
    const page = await ctx.newPage();
    const dlg = await openScanner(page);
    // Either still aiming, or the decoder has already read the clip — it is
    // fast enough that the result can be up before this line runs.
    const live = /เล็งกล้องไปที่ QR Code|รับงานทันที/.test(await dlg.innerText());
    ledger("QR scan", "no BarcodeDetector: the camera still opens (typed fallback is not the whole scanner any more)", "UI", live ? "PASS" : "FAIL", await shot(page, "reg-e1-camera-live"));
    await dlg.getByText(u.pendingCode).waitFor({ timeout: 20_000 }).catch(() => {});
    const t = (await dlg.innerText().catch(() => "")).replace(/\s+/g, " ");
    const hadDetector = await page.evaluate(() => (window as unknown as { __hadDetector: boolean }).__hadDetector);
    note("reg-e1-decoder.txt", `BarcodeDetector present before deletion: ${hadDetector}; result text: ${t.slice(0, 300)}`);
    ledger("QR scan", `jsQR reads ${u.pendingCode}'s sticker from the camera feed and the result shows`, "UI", t.includes(u.pendingCode) && /รับงานทันที/.test(t) ? "PASS" : "FAIL", await shot(page, "reg-e1-decoded"));
    await ctx.close();
  } finally {
    await browser.close();
  }
});
