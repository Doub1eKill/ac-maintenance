import path from "node:path";
import type { Page } from "@playwright/test";
import { test, QA, OUT_ROOT, ledger, shot, note, hydrated, watchConsole, pngBuffer } from "../../lib";

const CODE1 = `${QA.building.abbr}-${QA.room}-01`;
const body = (page: Page) => page.evaluate(() => document.body.innerText as string);
const toast = async (page: Page) => {
  const t = page.locator("[data-sonner-toaster] li");
  await t.first().waitFor({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(300);
  return (await t.allInnerTexts().catch(() => [])).join(" | ");
};
const search = async (page: Page, term: string) => {
  const box = page.locator("header input[type=text]").first();
  await box.fill(term); await box.press("Enter"); await page.waitForTimeout(1200);
};

test.describe.configure({ mode: "serial" });

test.describe("technician on a phone", () => {
  test("every tech page renders on Pixel 7 with no console errors; bottom nav present", async ({ page }) => {
    const pages: Array<[string, RegExp]> = [["/tech", /งานซ่อมบำรุงที่รอรับ|งานทั้งหมด/], ["/tech/assets", /เครื่องปรับอากาศ/], ["/tech/my-jobs", /งานของฉัน/], ["/tech/history", /ประวัติ/], ["/tech/calendar", /ปฏิทิน/], ["/tech/catalogue", /ยี่ห้อ/], ["/tech/profile", /โปรไฟล์/]];
    for (const [route, marker] of pages) {
      const errors = watchConsole(page);
      await page.goto(route); await page.locator("main").last().waitFor({ timeout: 90_000 }); await page.waitForTimeout(2500);
      const t = await body(page);
      const art = await shot(page, `tech-page${route.replace(/\//g, "-")}`);
      ledger("Tech pages", `${route} renders on mobile`, "UI", marker.test(t) ? "PASS" : "FAIL", art);
      const real = errors.filter((e) => !/DevTools|HMR|Fast Refresh/.test(e));
      ledger("Tech pages", `${route} no console errors`, "UI", real.length === 0 ? "PASS" : "FAIL", note(`tech-console${route.replace(/\//g, "-")}.txt`, real.join("\n") || "(none)"));
    }
    await page.goto("/tech"); await page.locator("main").last().waitFor({ timeout: 60_000 }); await page.waitForTimeout(1500);
    const nav = page.getByRole("navigation", { name: /เมนูนำทางสำหรับอุปกรณ์พกพา/ });
    const navOk = await nav.isVisible().catch(() => false);
    ledger("Bottom nav", "mobile bottom navigation is rendered", "UI", navOk ? "PASS" : "FAIL", await shot(page, "tech-bottom-nav"));
    // overlap check: does the user avatar/sidebar trigger sit on top of the first nav item?
    const overlap = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="เมนูนำทางสำหรับอุปกรณ์พกพา"]');
      if (!nav) return "no-nav";
      const first = nav.querySelector("a");
      if (!first) return "no-link";
      const r = first.getBoundingClientRect();
      // Next's dev-tools badge (<nextjs-portal>) floats over that corner in
      // development only; look past it to whatever the app itself put there.
      const el = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find((e) => e.tagName !== "NEXTJS-PORTAL") ?? null;
      return el && (first.contains(el) || el === first) ? "clear" : `covered by <${el?.tagName.toLowerCase()} class="${(el as HTMLElement)?.className?.toString().slice(0, 60)}">`;
    });
    ledger("Bottom nav", `first nav item hit-test at its centre: ${overlap}`, "UI", overlap === "clear" ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/tech-bottom-nav.png");
    // navigate via the bottom nav
    await nav.getByRole("link", { name: /งานของฉัน/ }).click().catch(() => {});
    await page.waitForURL(/\/tech\/my-jobs/, { timeout: 30_000 }).catch(() => {});
    ledger("Bottom nav", "tapping งานของฉัน navigates", "UI", page.url().includes("/tech/my-jobs") ? "PASS" : "FAIL", await shot(page, "tech-bottom-nav-myjobs"));
  });

  test("job pool: claim the QA order once; double-click and re-click cannot claim twice", async ({ page }) => {
    await page.goto("/tech"); await page.locator("main").last().waitFor({ timeout: 90_000 }); await hydrated(page, "main");
    await search(page, QA.building.abbr);
    const main = page.locator("main").last();
    await main.getByText(QA.building.name).first().click({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(800);
    // expand floor + room if needed
    for (const re of [/ชั้น 1/, new RegExp(`ห้อง ${QA.room}`)]) {
      for (let i = 0; i < 2 && !(await main.getByRole("button", { name: /^รับงาน$/ }).first().isVisible().catch(() => false)); i++) {
        const el = main.getByText(re).first();
        if (await el.isVisible().catch(() => false)) { await el.click().catch(() => {}); await page.waitForTimeout(700); }
      }
    }
    const t0 = await body(page);
    ledger("Job pool", "QA order visible in the pool after filtering", "UI", t0.includes(CODE1) ? "PASS" : "FAIL", await shot(page, "pool-filtered"));
    const claimBtn = main.getByRole("button", { name: /^รับงาน$/ }).first();
    // count claim POSTs
    let posts = 0; page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/tech")) posts++; });
    await claimBtn.dblclick();
    const tt = await toast(page);
    await page.waitForTimeout(2500);
    ledger("Job pool", `double-click รับงาน → toasts: ${tt.slice(0, 80)}`, "UI", /รับงานเรียบร้อย/.test(tt) ? "PASS" : "FAIL", await shot(page, "pool-claimed"));
    note("pool-claim-posts.txt", `POSTs during double-click: ${posts}`);
    await page.goto("/tech/my-jobs"); await page.locator("main").last().waitFor({ timeout: 60_000 }); await page.waitForTimeout(2500);
    const mj = await body(page);
    const mine = (mj.match(new RegExp(CODE1, "g")) || []).length;
    ledger("Job pool", `งานของฉัน lists the claimed order exactly once (found ${mine})`, "UI", mine === 1 ? "PASS" : "FAIL", await shot(page, "myjobs-after-claim"));
    // back to pool: it must be gone
    await page.goto("/tech"); await page.locator("main").last().waitFor({ timeout: 60_000 }); await hydrated(page, "main");
    await search(page, QA.building.abbr);
    const t1 = await body(page);
    ledger("Job pool", "claimed order no longer in the pool", "UI", !t1.includes(CODE1) ? "PASS" : "FAIL", await shot(page, "pool-after-claim"));
  });

  test("header scan button is reachable by name on Pixel 7", async ({ page }) => {
    // The scanner itself is covered by tech/regressions.spec.ts (BUG-002):
    // the typed-code mock this test used to describe is gone since fb801a5.
    await page.goto("/tech"); await page.locator("main").last().waitFor({ timeout: 90_000 }); await hydrated(page, "main");
    const headerScan = page.getByRole("button", { name: "สแกน QR Code" }).first();
    ledger("A11y", "header scan button has an accessible name on Pixel 7", "UI", (await headerScan.count()) ? "PASS" : "FAIL", await shot(page, "tech-header-scan-button"));
  });

  test("record work with before/after photos on the claimed order; history + admin see it", async ({ page, browser }) => {
    await page.goto("/tech/my-jobs"); await page.locator("main").last().waitFor({ timeout: 90_000 }); await hydrated(page, "main");
    const card = page.locator("main").last().locator("div").filter({ hasText: CODE1 }).filter({ has: page.getByRole("button", { name: /บันทึกและปิดงาน/ }) }).last();
    await card.getByRole("button", { name: /บันทึกและปิดงาน/ }).first().click();
    const dlg = page.locator("div.fixed.inset-0").filter({ hasText: /บันทึกประวัติการซ่อม/ }).first();
    await dlg.waitFor({ timeout: 10_000 });
    await dlg.getByText(/^ซ่อมแซม$/).click();
    await dlg.locator('textarea[name="repairDetail"], input[name="repairDetail"]').first().fill("QA_TEST: เปลี่ยนคาปาซิเตอร์");
    // By name: on a touch device each field also has a nameless camera input
    // (capture="environment"), so counting file inputs no longer finds them.
    await dlg.locator('input[name="beforePhoto"]').setInputFiles({ name: "before.png", mimeType: "image/png", buffer: pngBuffer([200, 60, 60], 96) });
    await dlg.locator('input[name="afterPhoto"]').setInputFiles({ name: "after.png", mimeType: "image/png", buffer: pngBuffer([60, 200, 60], 96) });
    await page.waitForTimeout(800);
    await dlg.locator('select[name="acStatus"]').selectOption("normal");
    await dlg.locator('textarea[name="notes"], input[name="notes"]').first().fill("QA_TEST_LOG_001");
    let posts = 0; page.on("request", (r) => { if (r.method() === "POST") posts++; });
    const submit = dlg.getByRole("button", { name: /บันทึกและเสร็จสิ้น/ });
    await submit.click();
    const tt = await toast(page);
    await page.waitForTimeout(3000);
    ledger("Maintenance log", "submit with two photos toasts success and closes the order", "UI", /บันทึกประวัติ.*สำเร็จ/.test(tt) ? "PASS" : "FAIL", await shot(page, "log-submitted"));
    note("log-submit-posts.txt", `POSTs on submit: ${posts}`);
    await page.goto("/tech/history"); await page.locator("main").last().waitFor({ timeout: 60_000 }); await page.waitForTimeout(2500);
    await search(page, QA.building.abbr);
    const h = await body(page);
    ledger("Maintenance log", "history lists the closed order", "UI", h.includes(CODE1) ? "PASS" : "FAIL", await shot(page, "history-after-log"));
    // admin side: unit history shows the log with photos
    const ctx = await browser.newContext({ storageState: path.join(OUT_ROOT, "auth", "admin.json") });
    await ctx.addInitScript(() => sessionStorage.setItem("ac-maintenance.browser-session", "1"));
    const ap = await ctx.newPage();
    await ap.goto("/admin/work-orders"); await ap.locator("main").last().waitFor({ timeout: 90_000 }); await ap.waitForTimeout(2000);
    const abox = ap.locator("header input[type=text]").first(); await abox.fill(QA.building.abbr); await abox.press("Enter"); await ap.waitForTimeout(1500);
    const at = await body(ap);
    ledger("Maintenance log", "admin board shows the order as completed (เสร็จสิ้น)", "UI", /เสร็จสิ้น/.test(at) && at.includes(CODE1) ? "PASS" : "FAIL", await shot(ap, "admin-board-after-log"));
    await ctx.close();
  });

  test("catalogue: technician can rename a model and back", async ({ page }) => {
    await page.goto("/tech/catalogue"); await page.locator("main").last().waitFor({ timeout: 90_000 }); await hydrated(page, "main");
    const main = page.locator("main").last();
    await main.getByRole("button", { name: /แก้ไขชื่อยี่ห้อ LG/ }).click();
    await main.getByPlaceholder(/^ชื่อยี่ห้อ$/).last().fill("LG QA");
    await main.getByRole("button", { name: /^บันทึก$/ }).last().click();
    const t1 = await toast(page); await page.waitForTimeout(2500);
    ledger("Catalogue (tech)", "technician renames LG → 'LG QA'", "UI", /แก้ชื่อยี่ห้อ/.test(t1) && (await body(page)).includes("LG QA") ? "PASS" : "FAIL", await shot(page, "tech-catalogue-renamed"));
    await main.getByRole("button", { name: /แก้ไขชื่อยี่ห้อ LG QA/ }).click();
    await main.getByPlaceholder(/^ชื่อยี่ห้อ$/).last().fill("LG");
    await main.getByRole("button", { name: /^บันทึก$/ }).last().click();
    await page.waitForTimeout(2500);
    ledger("Catalogue (tech)", "rename back to 'LG'", "UI", !(await body(page)).includes("LG QA") ? "PASS" : "FAIL", await shot(page, "tech-catalogue-renamed-back"));
    const del = await main.getByRole("button", { name: /ลบ/ }).count();
    ledger("Catalogue (tech)", "no delete/trash controls offered to a technician", "UI", del === 0 ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/tech-catalogue-renamed-back.png");
  });

  test("/qr/<uuid> while logged in as technician offers บันทึกงานซ่อมบำรุง", async ({ page }) => {
    await page.goto("/qr/d8df0abf-de82-4a99-97d4-b48c4615fbe2"); await page.waitForTimeout(3000);
    const t = await body(page);
    ledger("QR page", "technician sees 'บันทึกงานซ่อมบำรุง' link on the public unit page", "UI", /บันทึกงานซ่อมบำรุง/.test(t) ? "PASS" : "FAIL", await shot(page, "qr-page-tech"));
  });
});
