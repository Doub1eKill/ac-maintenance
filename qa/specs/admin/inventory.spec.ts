import { test, expect, ledger, shot, note, watchConsole, db } from "../../lib";

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

  test("dashboard donut: slices match the database, hovering one names it in the centre", async ({ page }) => {
    // Drawn as SVG since recharts went (components/admin/maintenance-analytics-donut.tsx).
    const [[completed, claimed, pending, cancelled]] = db("select count(*) filter (where status='completed'), count(*) filter (where status='claimed'), count(*) filter (where status='pending'), count(*) filter (where status='cancelled') from work_orders");
    await page.goto("/admin");
    const donut = page.locator('svg[role="img"][aria-label^="สัดส่วนสถานะใบงาน"]');
    await donut.waitFor({ timeout: 60_000 });
    const label = (await donut.getAttribute("aria-label")) ?? "";
    const agrees = label.includes(`เสร็จสิ้น ${completed}`) && label.includes(`กำลังดำเนินการ ${claimed}`) && label.includes(`รอดำเนินการ ${pending}`) && label.includes(`ยกเลิก ${cancelled}`);
    const centre = donut.locator("text");
    const before = (await centre.textContent()) ?? "";
    const pendingArc = donut.locator('circle[stroke="#f59e0b"]');
    let during = "(no pending slice)";
    if (Number(pending) > 0) {
      // On the ring itself: hover() aims at the middle of the circle's box,
      // which is the hole with the centre text in it.
      const point = await pendingArc.evaluate((el) => {
        const c = el as unknown as SVGCircleElement;
        const svg = c.ownerSVGElement!;
        const box = svg.getBoundingClientRect();
        const scale = box.width / svg.viewBox.baseVal.width;
        const r = c.r.baseVal.value;
        const dash = c.getAttribute("stroke-dasharray")!.split(" ").map(Number);
        const start = -Number(c.getAttribute("stroke-dashoffset"));
        const angle = ((start + dash[0] / 2) / (2 * Math.PI * r)) * 2 * Math.PI - Math.PI / 2;
        return { x: box.x + (c.cx.baseVal.value + r * Math.cos(angle)) * scale, y: box.y + (c.cy.baseVal.value + r * Math.sin(angle)) * scale };
      });
      await page.mouse.move(point.x, point.y);
      await page.waitForTimeout(300);
      during = (await centre.textContent()) ?? "";
    }
    ledger("Dashboard", `donut agrees with the database (${label}); centre "${before}" → hover "${during}"`, "UI", agrees && /%/.test(before) && (Number(pending) === 0 || during.includes(`${pending}รอดำเนินการ`)) ? "PASS" : "FAIL", await shot(page, "admin-donut-hover"));
    expect(agrees, "donut counts match work_orders").toBe(true);
    if (Number(pending) > 0) expect(during).toContain(`${pending}รอดำเนินการ`);
  });

  test("dashboard: units without a photo agree with the database", async ({ page }) => {
    // overview-metrics-grid.tsx, first card. Counted over the same rows as the
    // card's total (asset-tree.ts walks every unit in the building tree).
    const [[total, withoutPhoto]] = db("select count(*), count(*) filter (where photo_url is null) from air_conditioners");
    await page.goto("/admin");
    const row = page.getByTestId("units-without-photo");
    await row.waitFor({ timeout: 60_000 });
    // MotionNumber counts up from zero; wait for it to settle on the figure.
    await expect(row).toContainText(`${withoutPhoto}`, { timeout: 5_000 }).catch(() => {});
    const shown = ((await row.innerText()) ?? "").replace(/\s+/g, " ").trim();
    // The unit sits in its own span with a margin, so innerText has no space before it.
    const figure = new RegExp(`ยังไม่มีรูปเครื่อง ?${withoutPhoto} ?เครื่อง$`);
    const agrees = figure.test(shown);
    ledger("Dashboard", `units without a photo: card "${shown}", database ${withoutPhoto} of ${total}`, "UI", agrees ? "PASS" : "FAIL", await shot(page, "admin-units-without-photo"));
    expect(shown).toMatch(figure);
  });

  test("header omnibox lists no cancelled order as an open one", async ({ page }) => {
    // The index took every order but the completed ones, so a cancelled order
    // showed up as "กำลังดำเนินการ" (lib/admin/pages.ts getAdminSearchIndex).
    // A unit whose only order is cancelled must list as a unit and nothing else.
    const rows = db("select a.ac_code from work_orders w join air_conditioners a on a.id = w.air_conditioner_id where w.status = 'cancelled' and a.deleted_at is null and not exists (select 1 from work_orders o where o.air_conditioner_id = a.id and o.status in ('pending','claimed')) order by w.id limit 1");
    const acCode = rows[0]?.[0];
    if (!acCode) { ledger("Omnibox", "cancelled order not listed as open (no unit with only a cancelled order to try)", "UI", "SKIP"); return; }
    await page.goto("/admin");
    await page.locator("main").last().waitFor({ timeout: 60_000 });
    const box = page.locator("header input[type=text]").first();
    await box.fill(acCode);
    await page.waitForTimeout(1500);
    // The dropdown only: the dashboard behind it has its own "กำลังดำเนินการ"
    // card, which the first run of this test matched.
    const dropdown = page.locator("div.z-50.shadow-2xl").filter({ hasText: /กรองรายการในหน้านี้ด้วย/ }).first();
    await dropdown.waitFor({ timeout: 10_000 });
    const text = await dropdown.innerText();
    const asOpen = /กำลังดำเนินการ|รอรับงาน/.test(text);
    ledger("Omnibox", `${acCode} (only a cancelled order) lists as a unit, not as an open order`, "UI", text.includes(acCode) && !asOpen ? "PASS" : "FAIL", await shot(page, "admin-omnibox-cancelled"));
    expect(asOpen, "cancelled order listed as open").toBe(false);
  });
});
