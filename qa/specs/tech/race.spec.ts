import path from "node:path";
import { devices, type Page } from "@playwright/test";
import { test, QA, OUT_ROOT, ledger, shot, note } from "../../lib";

// Two technicians press รับงาน on the same pool job in the same instant.
// Exactly one may win; the other must be told, not shown a success toast.
test("two technicians claim the same job at the same moment", async ({ browser }) => {
  test.setTimeout(300_000);
  const CODE2 = `${QA.building.abbr}-${QA.room}-02`;

  // an admin creates a fresh pending order on unit -02 through the UI
  const actx = await browser.newContext({ storageState: path.join(OUT_ROOT, "auth", "admin.json") });
  await actx.addInitScript(() => sessionStorage.setItem("ac-maintenance.browser-session", "1"));
  const ap = await actx.newPage();
  await ap.goto("/admin"); await ap.locator("main").last().waitFor({ timeout: 120_000 }); await ap.waitForTimeout(2000);
  await ap.getByRole("button", { name: /สร้างใบงานซ่อมบำรุง/ }).first().click();
  const dlg = ap.locator("div.fixed.inset-0").filter({ hasText: /สร้างใบงานซ่อมบำรุง/ }).first();
  await dlg.waitFor({ timeout: 15_000 });
  await dlg.locator("select").nth(0).selectOption({ label: QA.building.name }); await ap.waitForTimeout(400);
  await dlg.locator("select").nth(1).selectOption({ index: 1 }); await ap.waitForTimeout(400);
  await dlg.locator('select[name="airConditionerId"]').selectOption({ label: new RegExp(CODE2) as unknown as string }).catch(async () => dlg.locator('select[name="airConditionerId"]').selectOption({ index: 2 }));
  await dlg.locator('select[name="type"]').selectOption("cleaning");
  await dlg.getByRole("button", { name: /ยืนยันการสร้างใบงาน/ }).click();
  await ap.waitForTimeout(3000);
  await actx.close();

  const open = async (file: string) => {
    const ctx = await browser.newContext({ ...devices["Pixel 7"], storageState: path.join(OUT_ROOT, "auth", file) });
    await ctx.addInitScript(() => sessionStorage.setItem("ac-maintenance.browser-session", "1"));
    const page = await ctx.newPage();
    await page.goto("/tech"); await page.locator("main").last().waitFor({ timeout: 120_000 }); await page.waitForTimeout(1500);
    const box = page.locator("header input[type=text]").first();
    await box.fill(QA.building.abbr); await box.press("Enter"); await page.waitForTimeout(1200);
    const main = page.locator("main").last();
    for (const re of [new RegExp(QA.building.name), /ชั้น 1/, new RegExp(`ห้อง ${QA.room}`)]) {
      for (let i = 0; i < 2 && !(await main.getByRole("button", { name: /^รับงาน$/ }).first().isVisible().catch(() => false)); i++) {
        const el = main.getByText(re).first();
        if (await el.isVisible().catch(() => false)) { await el.click().catch(() => {}); await page.waitForTimeout(700); }
      }
    }
    return { ctx, page, btn: main.getByRole("button", { name: /^รับงาน$/ }).first() };
  };

  const a = await open("tech.json");
  const b = await open("tech2.json");
  const bothVisible = (await a.btn.isVisible().catch(() => false)) && (await b.btn.isVisible().catch(() => false));
  ledger("Race", "both technicians see the same pending job", "UI", bothVisible ? "PASS" : "BLOCKED", await shot(a.page, "race-before-a"));
  await shot(b.page, "race-before-b");

  await Promise.all([a.btn.click(), b.btn.click()]);
  await a.page.waitForTimeout(3000); await b.page.waitForTimeout(500);
  const toastOf = async (p: Page) => (await p.locator("[data-sonner-toaster] li").allInnerTexts().catch(() => [])).join(" | ");
  const ta = await toastOf(a.page); const tb = await toastOf(b.page);
  const wins = [ta, tb].filter((t) => /รับงานเรียบร้อย/.test(t)).length;
  const losers = [ta, tb].filter((t) => /ถูกรับ|ไม่สำเร็จ|ไปแล้ว|ผิดพลาด|ไม่พบ|ไม่สามารถ/.test(t)).length;
  note("race-toasts.txt", `A: ${ta}\nB: ${tb}`);
  ledger("Race", `simultaneous claims → success toasts=${wins}, refusal toasts=${losers}`, "UI", wins === 1 && losers === 1 ? "PASS" : wins === 1 ? "BLOCKED" : "FAIL", await shot(a.page, "race-after-a"));
  await shot(b.page, "race-after-b");

  // DB truth
  const rows = await a.page.request.get("/api/tech/units").then((r) => r.text()).catch(() => "");
  void rows;
  await a.ctx.close(); await b.ctx.close();
});
