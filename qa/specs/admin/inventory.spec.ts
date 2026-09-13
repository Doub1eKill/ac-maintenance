import { test, ledger, shot, note, watchConsole } from "../../lib";

const PAGES: Array<[string, string, RegExp]> = [
  ["/admin", "ภาพรวมระบบ", /เครื่องปรับอากาศทั้งหมด/],
  ["/admin/work-orders", "กระดานใบงาน", /ใบงาน/],
  ["/admin/calendar", "ปฏิทินซ่อมบำรุง", /ปฏิทิน/],
  ["/admin/approvals", "อนุมัติผู้ใช้งาน", /อนุมัติ/],
  ["/admin/team", "เจ้าหน้าที่ & ช่าง", /เจ้าหน้าที่|ช่าง/],
  ["/admin/assets", "ระบบสินทรัพย์", /อาคาร/],
  ["/admin/qr-codes", "จัดการ QR Code", /QR Code/],
  ["/admin/profile", "จัดการโปรไฟล์", /โปรไฟล์/],
  ["/admin/settings", "ตั้งค่าระบบ", /ตั้งค่า|ยี่ห้อ/],
];

test.describe("admin inventory", () => {
  for (const [route, label, marker] of PAGES) {
    test(`${route} renders, no console errors`, async ({ page }) => {
      const errors = watchConsole(page);
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      // wait for the shell + page content; Next dev streams the segment in
      await page.locator("main").last().waitFor({ timeout: 60_000 });
      await page.waitForTimeout(2500);
      const text = await page.evaluate(() => document.body.innerText);
      const hasMarker = marker.test(text);
      const onRoute = page.url().includes(route);
      const art = await shot(page, `admin-page${route.replace(/\//g, "-")}`);
      ledger("Admin pages", `${route} (${label}) renders expected content`, "UI", onRoute && hasMarker ? "PASS" : "FAIL", art);
      const real = errors.filter((e) => !/React DevTools|Fast Refresh|\[HMR\]/.test(e));
      ledger("Admin pages", `${route} has no console/page errors`, "UI", real.length === 0 ? "PASS" : "FAIL", note(`admin-console${route.replace(/\//g, "-")}.txt`, real.join("\n") || "(none)"));
    });
  }

  test("sidebar navigation reaches every admin page by label", async ({ page }) => {
    await page.goto("/admin");
    await page.locator("main").last().waitFor({ timeout: 60_000 });
    let ok = true;
    const log: string[] = [];
    for (const [route, label] of PAGES) {
      const link = page.getByRole("link", { name: new RegExp(label.replace(/[&]/g, "&")) }).first();
      if (!(await link.count())) { log.push(`no link for ${label}`); ok = false; continue; }
      await link.click();
      await page.waitForURL((u) => u.pathname === route, { timeout: 60_000 }).catch(() => {});
      const landed = page.url().includes(route);
      ok &&= landed;
      log.push(`${landed ? "OK " : "MISS"} ${label} -> ${page.url()}`);
    }
    ledger("Admin nav", "every sidebar label navigates to its route", "UI", ok ? "PASS" : "FAIL", note("admin-nav.txt", log.join("\n")));
  });

  test("header omnibox finds a unit, a building and a menu entry", async ({ page }) => {
    await page.goto("/admin");
    await page.locator("main").last().waitFor({ timeout: 60_000 });
    const box = page.locator("header input[type=text]").first();
    await box.fill("B467711-1-846367-03");
    await page.waitForTimeout(1500);
    const t1 = await page.evaluate(() => document.body.innerText);
    ledger("Omnibox", "typing an acCode lists that unit", "UI", /B467711-1-846367-03/.test(t1) && /เครื่องแอร์/.test(t1) ? "PASS" : "FAIL", await shot(page, "admin-omnibox-unit"));
    await box.fill("Dormitory");
    await page.waitForTimeout(1200);
    const t2 = await page.evaluate(() => document.body.innerText);
    ledger("Omnibox", "typing a building name lists it under อาคาร", "UI", /Dormitory Building/.test(t2) ? "PASS" : "FAIL", await shot(page, "admin-omnibox-building"));
    await box.fill("QR");
    await page.waitForTimeout(1200);
    const t3 = await page.evaluate(() => document.body.innerText);
    ledger("Omnibox", "typing a menu word lists the menu entry", "UI", /จัดการ QR Code/.test(t3) ? "PASS" : "FAIL", await shot(page, "admin-omnibox-menu"));
  });
});
