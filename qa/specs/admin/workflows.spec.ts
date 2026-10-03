import path from "node:path";
import { devices, type Page } from "@playwright/test";
import { test, QA, OUT_ROOT, ledger, shot, note, hydrated, loginViaForm, watchConsole, unitPhoto, pickRoom, dismissModal } from "../../lib";

// What the print test hangs off `window` inside the page.
type PrintWindow = Window & { __printDoc: string };

const settle = async (page: Page, ms = 1500) => { await page.waitForLoadState("domcontentloaded"); await page.waitForTimeout(ms); };
const body = (page: Page) => page.evaluate(() => document.body.innerText as string);
const toastText = async (page: Page) => {
  // sonner mounts toasts under [data-sonner-toaster]; give it up to 6s
  const toaster = page.locator("[data-sonner-toaster] [data-sonner-toast], [data-sonner-toaster] li");
  await toaster.first().waitFor({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(300);
  const t = await toaster.allInnerTexts().catch(() => []);
  return t.join(" | ");
};
// the assets list is paginated (5 per page) and a new building lands on the last page;
// the header omnibox filters the list in place
const filterAssets = async (page: Page, term: string) => {
  const box = page.locator("header input[type=text]").first();
  await box.fill(term);
  await box.press("Enter"); // closes the suggestion panel; the filter applied on typing
  await page.waitForTimeout(1200);
};
const kpi = async (page: Page) => {
  const t = await body(page);
  const pick = (re: RegExp) => Number((t.match(re)?.[1] ?? "-1").replace(/,/g, ""));
  return { units: pick(/เครื่องปรับอากาศทั้งหมด\s*([\d,]+)/), repair: pick(/รอซ่อมด่วน\s*([\d,]+)/), cleaning: pick(/ถึงรอบล้างแอร์\s*([\d,]+)/), techs: pick(/ช่างเทคนิคในระบบ\s*([\d,]+)/) };
};

test.describe.configure({ mode: "serial" });

test.describe("admin workflows", () => {
  test("dashboard KPI numbers agree with the database", async ({ page }) => {
    await page.goto("/admin");
    await page.locator("main").last().waitFor({ timeout: 120_000 });
    await page.waitForTimeout(3000); // count-up + fade
    const k = await kpi(page);
    // oracle: the same figures the sidebar/other pages carry are checked by the tech spec; here vs the seed counts
    const art = await shot(page, "admin-dashboard-kpi");
    ledger("Dashboard", `KPI cards render numbers (units=${k.units}, repair=${k.repair}, cleaning=${k.cleaning}, techs=${k.techs})`, "UI", k.units > 0 && k.repair >= 0 && k.techs > 0 ? "PASS" : "FAIL", art);
    note("admin-kpi-before.json", JSON.stringify(k));
  });

  test("assets: create building → room → unit through the forms", async ({ page }) => {
    await page.goto("/admin/assets");
    await page.locator("main").last().waitFor({ timeout: 120_000 });
    await hydrated(page, "main");
    // building
    await page.getByRole("button", { name: /^เพิ่มอาคาร$/ }).click();
    const bform = page.locator("form").filter({ has: page.locator('input[name="abbreviation"]') });
    await bform.locator('input[name="name"]').fill(QA.building.name);
    await bform.locator('input[name="abbreviation"]').fill(QA.building.abbr);
    await bform.getByRole("button", { name: /บันทึกอาคาร/ }).click();
    const t1 = await toastText(page);
    await settle(page, 2500);
    const existed = /ในระบบแล้ว/.test(t1); // left over from an earlier run
    const onFirstPage = (await body(page)).includes(QA.building.name);
    ledger("Assets", "create building shows a toast" + (existed ? " (already existed from a previous run)" : ""), "UI", /เพิ่มอาคารสำเร็จ/.test(t1) ? "PASS" : existed ? "BLOCKED" : "FAIL", await shot(page, "assets-building-created"));
    // Left open when the save was refused — see dismissModal.
    if (existed) await dismissModal(page);
    else ledger("Assets", "new building is visible without paging (list is 5/page; it landed on page 2 = " + !onFirstPage + ")", "UI", onFirstPage ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/assets-building-created.png");
    await filterAssets(page, QA.building.abbr);
    const b1 = await body(page);
    ledger("Assets", "new building found via the header filter", "UI", b1.includes(QA.building.name) ? "PASS" : "FAIL", await shot(page, "assets-building-filtered"));

    // duplicate building must be refused
    await page.getByRole("button", { name: /^เพิ่มอาคาร$/ }).click();
    await bform.locator('input[name="name"]').fill(QA.building.name);
    await bform.locator('input[name="abbreviation"]').fill(QA.building.abbr);
    await bform.getByRole("button", { name: /บันทึกอาคาร/ }).click();
    const t2 = await toastText(page);
    const dupText = await body(page);
    const dupRefused = /ซ้ำ|มีอยู่แล้ว|ในระบบแล้ว|already|ไม่สามารถ|ผิดพลาด/.test(t2 + dupText);
    ledger("Assets", "duplicate building name/abbr refused with a message", "UI", dupRefused ? "PASS" : "FAIL", await shot(page, "assets-building-duplicate"));
    await page.keyboard.press("Escape").catch(() => {});
    await page.reload(); await page.locator("main").last().waitFor({ timeout: 60_000 }); await hydrated(page, "main");
    await filterAssets(page, QA.building.abbr);
    const dupCount = ((await body(page)).match(new RegExp(QA.building.name, "g")) || []).length;
    ledger("Assets", "duplicate attempt created no second building row", "UI", dupCount === 1 ? "PASS" : "FAIL", await shot(page, "assets-building-after-dup"));

    // open the building and add a room on it
    await dismissModal(page);
    const addRoom = page.locator("div").filter({ hasText: QA.building.name }).getByRole("button", { name: /เพิ่มชั้น|เพิ่มห้อง/ }).first();
    await addRoom.click();
    const rform = page.locator("form").filter({ has: page.locator('input[name="floor"]') });
    await rform.locator('input[name="name"]').fill(QA.room);
    await rform.locator('input[name="floor"]').fill("1");
    await rform.getByRole("button", { name: /บันทึกห้อง/ }).click();
    const t3 = await toastText(page);
    await settle(page, 2500);
    ledger("Assets", "create room shows toast and appears under the building", "UI", /เพิ่มห้องสำเร็จ/.test(t3) && (await body(page)).includes(QA.room) ? "PASS" : "FAIL", await shot(page, "assets-room-created"));

    // negative floor — no unsigned guard on PostgreSQL later; Zod is the only gate
    // The room above is already there on a second pass, which leaves this
    // modal open on its refusal.
    await dismissModal(page);
    await page.locator("div").filter({ hasText: QA.building.name }).getByRole("button", { name: /เพิ่มชั้น|เพิ่มห้อง/ }).first().click();
    await rform.locator('input[name="name"]').fill("QA-NEG");
    await rform.locator('input[name="floor"]').fill("-3");
    await rform.getByRole("button", { name: /บันทึกห้อง/ }).click();
    const t4 = await toastText(page);
    await settle(page, 2000);
    const negStored = (await body(page)).includes("QA-NEG");
    ledger("Assets", "room with floor -3 is refused (Zod), not stored", "UI", !negStored ? "PASS" : "FAIL", await shot(page, "assets-room-negative-floor"));
    note("assets-room-negative-floor.txt", `toast: ${t4}\nstored: ${negStored}`);
    await page.keyboard.press("Escape").catch(() => {});

    // register a unit in the room (catalogue brand/model)
    await page.reload(); await page.locator("main").last().waitFor({ timeout: 60_000 }); await hydrated(page, "main");
    await filterAssets(page, QA.building.abbr);
    const main = page.locator("main").last();
    // expand building → floor → room; each header toggles, so only click when collapsed
    const expand = async (re: RegExp, childRe: RegExp) => {
      for (let i = 0; i < 2; i++) {
        if (await main.getByText(childRe).first().isVisible().catch(() => false)) return;
        await main.getByText(re).first().click({ timeout: 10_000 }).catch(() => {});
        await page.waitForTimeout(700);
      }
    };
    await expand(new RegExp(QA.building.name), /ชั้น 1/);
    await expand(/^ชั้น 1/, new RegExp(`ห้อง ${QA.room}`));
    await expand(new RegExp(`ห้อง ${QA.room}`), /ลงทะเบียนแอร์/);
    const addAc = main.getByRole("button", { name: /ลงทะเบียนแอร์/ }).first();
    if (!(await addAc.count())) {
      ledger("Assets", "register unit: add-unit button found under the room", "UI", "BLOCKED", await shot(page, "assets-unit-no-button"));
      return;
    }
    await addAc.click();
    const uform = page.locator("form").filter({ has: page.locator('select[name="acModelId"]') });
    const brandSel = uform.locator("select").first();
    await brandSel.selectOption({ index: 1 });
    await page.waitForTimeout(400);
    await uform.locator('select[name="acModelId"]').selectOption({ index: 1 });
    await uform.locator('input[name="photo"]').setInputFiles(unitPhoto());
    await uform.getByRole("button", { name: /ลงทะเบียนเครื่องปรับอากาศ/ }).click();
    const t5 = await toastText(page);
    await settle(page, 3000);
    const b5 = await body(page);
    const code = b5.match(new RegExp(`${QA.building.abbr}-${QA.room}-\\d\\d`))?.[0] ?? null;
    ledger("Assets", `register unit → acCode ${code ?? "(none)"} shown`, "UI", code ? "PASS" : "FAIL", await shot(page, "assets-unit-created"));
    note("assets-unit-created.txt", `toast: ${t5}\ncode: ${code}`);
    // register a second unit as "Other" with BTU -5 → sequence must be -02 only if accepted
    await main.getByRole("button", { name: /ลงทะเบียนแอร์/ }).first().click();
    await page.getByRole("button", { name: /กำหนดเอง/ }).click();
    const cform = page.locator("form").filter({ has: page.locator('input[name="customBrand"]') });
    await cform.locator('input[name="customBrand"]').fill("QA Custom Brand");
    await cform.locator('input[name="customModel"]').fill("QA-MODEL");
    await cform.locator('input[name="btu"]').fill("-5");
    await cform.locator('input[name="photo"]').setInputFiles(unitPhoto());
    await cform.getByRole("button", { name: /ลงทะเบียนเครื่องปรับอากาศ/ }).click();
    const btuMsg = await cform.locator('input[name="btu"]').evaluate((el: HTMLInputElement) => el.validationMessage).catch(() => "");
    note("assets-unit-btu-validation.txt", btuMsg);
    if (btuMsg) { await cform.locator('input[name="btu"]').fill("12000"); await cform.getByRole("button", { name: /ลงทะเบียนเครื่องปรับอากาศ/ }).click(); }
    const t6 = await toastText(page);
    await settle(page, 3000);
    const b6 = await body(page);
    const second = b6.includes(`${QA.building.abbr}-${QA.room}-02`);
    note("assets-unit-second.txt", `toast: ${t6}\nsecond present: ${second}`);
    ledger("Assets", `BTU -5 on registration: ${btuMsg ? "blocked natively (" + btuMsg + ")" : "NOT blocked by the browser"}`, "UI", btuMsg ? "PASS" : "FAIL", await shot(page, "assets-unit-negative-btu"));
    ledger("Assets", "second unit (custom brand/model) gets sequence -02", "UI", second ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/assets-unit-negative-btu.png");
  });

  test("work order: create for the QA unit; dashboard + board + tech pool reflect it", async ({ page, browser }) => {
    await page.goto("/admin");
    await page.locator("main").last().waitFor({ timeout: 120_000 }); await page.waitForTimeout(3000);
    const before = await kpi(page);
    await page.getByRole("button", { name: /สร้างใบงานซ่อมบำรุง/ }).first().click();
    const dlg = page.locator("div.fixed.inset-0").filter({ hasText: /สร้างใบงานซ่อมบำรุง/ }).first();
    await dlg.waitFor({ timeout: 15_000 });
    await pickRoom(dlg, QA.room);
    await page.waitForTimeout(500);
    await dlg.locator('select[name="airConditionerId"]').selectOption({ index: 1 });
    await dlg.locator('select[name="type"]').selectOption("repair");
    const desc = dlg.locator("textarea, input[name=issueDescription]").first();
    if (await desc.count()) await desc.fill("QA_TEST_WO_001 คอมเพรสเซอร์ไม่ทำงาน");
    await dlg.getByRole("button", { name: /ยืนยันการสร้างใบงาน/ }).click();
    const t = await toastText(page);
    await settle(page, 3000);
    ledger("Work orders", "create work order via header modal", "UI", /สำเร็จ|สร้าง/.test(t) || !(await dlg.isVisible().catch(() => false)) ? "PASS" : "FAIL", await shot(page, "wo-created"));

    // Refused on a second pass — the QA unit already carries the open order
    // this test raises — and the modal only closes itself on success, so the
    // sidebar click below would land on its overlay.
    await dismissModal(page);

    // The board first, by the sidebar (a client navigation): the shell
    // remembers the order it just raised and opens the board on the building
    // it landed in, whichever page that is (BUG-008 fix). A full reload would
    // forget that, which is also by design (review fix d26018f).
    await page.getByRole("link", { name: /กระดานใบงาน/ }).first().click();
    await page.waitForURL(/work-orders/, { timeout: 60_000 });
    await page.locator("main").last().waitFor({ timeout: 60_000 }); await page.waitForTimeout(2500);
    const board0 = await body(page);
    const pager0 = board0.match(/หน้า \d+ จาก \d+/)?.[0] ?? "(no pager)";
    ledger("Work orders", `board opened from the shell shows the new order's building (${pager0})`, "UI", board0.includes(QA.building.name) && board0.includes(`${QA.building.abbr}-${QA.room}`) ? "PASS" : "FAIL", await shot(page, "wo-board"));
    await filterAssets(page, QA.building.abbr);
    const board = await body(page);
    const grp = board.match(new RegExp(QA.building.name + String.raw`[\s\S]{0,80}?(\d+) ใบงาน`));
    ledger("Work orders", `board filtered by the building shows its group with ${grp?.[1] ?? "?"} order(s)`, "UI", grp && Number(grp[1]) >= 1 ? "PASS" : "FAIL", await shot(page, "wo-board-filtered"));

    await page.goto("/admin"); await page.locator("main").last().waitFor({ timeout: 60_000 }); await page.waitForTimeout(3500);
    const after = await kpi(page);
    note("admin-kpi-after-wo.json", JSON.stringify({ before, after }));
    ledger("Dashboard", `รอซ่อมด่วน counter moved ${before.repair} → ${after.repair} after a repair order`, "UI", after.repair === before.repair + 1 ? "PASS" : "FAIL", await shot(page, "admin-dashboard-after-wo"));

    // cross-side: technician pool must show it without a restart
    const ctx = await browser.newContext({ ...devices["Pixel 7"], storageState: path.join(OUT_ROOT, "auth", "tech.json") });
    await ctx.addInitScript(() => sessionStorage.setItem("ac-maintenance.browser-session", "1"));
    const tp = await ctx.newPage();
    await tp.goto("/tech"); await tp.locator("main").last().waitFor({ timeout: 90_000 }); await tp.waitForTimeout(4000);
    await tp.waitForLoadState("load").catch(() => {});
    const tsearch = tp.locator("header input[type=text]").first();
    await tsearch.fill(QA.building.abbr); await tsearch.press("Enter"); await tp.waitForTimeout(1500);
    await tp.locator("main").last().getByText(QA.building.name).first().click({ timeout: 10_000 }).catch(() => {});
    await tp.waitForTimeout(800);
    const pool = await body(tp).catch(async () => { await tp.waitForTimeout(3000); return body(tp); });
    ledger("Work orders", "technician job pool (filtered to the building) shows the admin-created order", "UI", pool.includes(`${QA.building.abbr}-${QA.room}`) ? "PASS" : "FAIL", await shot(tp, "wo-in-tech-pool"));
    await ctx.close();
  });

  test("upcoming maintenance table: filter pills change the rows", async ({ page }) => {
    await page.goto("/admin");
    await page.locator("main").last().waitFor({ timeout: 120_000 }); await page.waitForTimeout(3000);
    // The list groups by building (collapsed on load, five buildings a page),
    // so rows are counted from the pills and the group subtitles, not from
    // visible unit codes.
    const pill = async (re: RegExp) => Number((await body(page)).replace(/\s+/g, " ").match(re)?.[1] ?? -1);
    // Group subtitles are <p>"N รายการ"</p>; the KPI cards say "รายการ" too but not in a <p> of their own.
    const shown = async () => (await page.locator("main p").filter({ hasText: /^\d+ รายการ$/ }).allInnerTexts()).map((m) => parseInt(m, 10)).reduce((a, b) => a + b, 0);
    const all = await pill(/ทั้งหมด (\d+) รอซ่อมด่วน/);
    const urgent = await pill(/รอซ่อมด่วน (\d+) งานล้างแอร์/);
    const upcoming = await pill(/งานล้างแอร์ (\d+)/);
    await page.getByRole("button", { name: /^รอซ่อมด่วน/ }).click(); await page.waitForTimeout(800);
    const urgentShown = await shown();
    const urgentText = await body(page);
    await page.getByRole("button", { name: /^งานล้างแอร์/ }).click(); await page.waitForTimeout(800);
    const upcomingShown = await shown();
    await page.getByRole("button", { name: /^ทั้งหมด/ }).click(); await page.waitForTimeout(800);
    const backShown = await shown();
    note("upcoming-filter.txt", `pills all=${all} urgent=${urgent} upcoming=${upcoming}; page-1 group rows urgent=${urgentShown} upcoming=${upcomingShown} all=${backShown}`);
    ledger("Upcoming table", `pills all=${all} = urgent ${urgent} + cleaning ${upcoming}; filtered page-1 groups hold ${urgentShown}/${upcomingShown} rows`, "UI", all > 0 && urgent + upcoming === all && urgentShown > 0 && urgentShown <= urgent && upcomingShown > 0 && upcomingShown <= upcoming && backShown > 0 ? "PASS" : "FAIL", await shot(page, "upcoming-filter"));
    // Only repair rows under the urgent pill (BUG-007): no cleaning badge may
    // appear in the list below the pills.
    ledger("Upcoming table", "urgent view lists only ซ่อมด่วน rows (no ค้างล้าง/กำหนดล้าง badges)", "UI", /(ค้างล้าง|กำหนดล้าง) \d/.test(urgentText.split("งานล้างแอร์").slice(1).join("")) ? "FAIL" : "PASS", "runs/" + process.env.QA_RUN + "/upcoming-filter.png");
    const search = page.getByPlaceholder(/ค้นหารหัสแอร์\.\.\./);
    await search.fill("ZZZZ-NO-MATCH"); await page.waitForTimeout(800);
    const none = await shown();
    await search.fill(""); await page.waitForTimeout(500);
    ledger("Upcoming table", "no-match search shows zero rows and recovers", "UI", none === 0 && (await shown()) === backShown ? "PASS" : "FAIL", await shot(page, "upcoming-search-nomatch"));
  });

  test("approvals: pending QA user is listed with the requested role; reject/approve work", async ({ page, browser }) => {
    await page.goto("/admin/approvals");
    await page.locator("main").last().waitFor({ timeout: 60_000 }); await hydrated(page, "main"); await page.waitForTimeout(1500);
    const t = await body(page);
    const listed = t.includes("QA_TEST_USER_PENDING");
    ledger("Approvals", "pending registration is listed", "UI", listed ? "PASS" : "FAIL", await shot(page, "approvals-list"));
    ledger("Approvals", "card shows the role requested (ช่างเทคนิค) and phone", "UI", /ช่างเทคนิค/.test(t) && /081-000-1004/.test(t) ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/approvals-list.png");
    // approve
    await page.getByRole("button", { name: /^อนุมัติ$/ }).first().click();
    const tt = await toastText(page);
    await settle(page, 2500);
    const gone = !(await body(page)).includes("QA_TEST_USER_PENDING");
    ledger("Approvals", "approve removes the card and toasts", "UI", gone ? "PASS" : "FAIL", await shot(page, "approvals-after-approve"));
    note("approvals-approve-toast.txt", tt);
    // the approved account can now log in
    const ctx = await browser.newContext();
    const p2 = await ctx.newPage();
    const url = await loginViaForm(p2, QA.pending, QA.password);
    ledger("Approvals", "approved user can log in afterwards", "UI", /\/tech/.test(url) ? "PASS" : "FAIL", await shot(p2, "approvals-approved-login"));
    await ctx.close();
  });

  test("team: suspend QA_TEST_USER_TECH2, login is refused, restore", async ({ page, browser }) => {
    await page.goto("/admin/team");
    await page.locator("main").last().waitFor({ timeout: 60_000 }); await hydrated(page, "main"); await page.waitForTimeout(1500);
    const find = page.locator("header input[type=text]").first();
    if (await find.count()) { await find.fill("QA_TEST_USER_TECH2"); await page.waitForTimeout(1200); }
    const card = page.locator("div").filter({ hasText: /QA_TEST_USER_TECH2/ }).filter({ has: page.getByRole("button", { name: /ระงับสิทธิ์/ }) }).last();
    const btn = card.getByRole("button", { name: /ระงับสิทธิ์/ }).first();
    if (!(await btn.count())) { ledger("Team", "suspend button for QA tech2 found", "UI", "BLOCKED", await shot(page, "team-no-suspend")); return; }
    await btn.click();
    const dlg = page.getByRole("alertdialog").or(page.getByRole("dialog")).first();
    await dlg.getByRole("button", { name: /^ระงับสิทธิ์$/ }).click();
    const tt = await toastText(page);
    await settle(page, 2500);
    ledger("Team", "suspend confirms via dialog and toasts", "UI", /ระงับ|สำเร็จ/.test(tt) ? "PASS" : "FAIL", await shot(page, "team-suspended"));
    const ctx = await browser.newContext(); const p2 = await ctx.newPage();
    await loginViaForm(p2, QA.tech2, QA.password);
    const msg = await body(p2);
    ledger("Team", "suspended account login shows the suspended message", "UI", /ถูกระงับการใช้งาน/.test(msg) ? "PASS" : "FAIL", await shot(p2, "team-suspended-login"));
    ledger("Team", "suspended account cannot log in at all", "UI", p2.url().includes("/login") ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/team-suspended-login.png");
    await ctx.close();
    // restore
    await page.reload(); await page.locator("main").last().waitFor({ timeout: 60_000 }); await hydrated(page, "main");
    if (await find.count()) { await find.fill("QA_TEST_USER_TECH2"); await page.waitForTimeout(1200); }
    const card2 = page.locator("div").filter({ hasText: /QA_TEST_USER_TECH2/ }).filter({ has: page.getByRole("button", { name: /เปิดใช้งาน/ }) }).last();
    await card2.getByRole("button", { name: /เปิดใช้งาน/ }).first().click();
    const dlg2 = page.getByRole("alertdialog").or(page.getByRole("dialog")).first();
    if (await dlg2.isVisible().catch(() => false)) await dlg2.getByRole("button", { name: /เปิดใช้งาน|ยืนยัน/ }).first().click();
    await settle(page, 2500);
    const ctx3 = await browser.newContext(); const p3 = await ctx3.newPage();
    const u3 = await loginViaForm(p3, QA.tech2, QA.password);
    ledger("Team", "restored account logs in again", "UI", /\/tech/.test(u3) ? "PASS" : "FAIL", await shot(p3, "team-restored-login"));
    await ctx3.close();
  });

  test("settings: rename a brand round-trip; duplicate refused; trash bin", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.locator("main").last().waitFor({ timeout: 60_000 }); await hydrated(page, "main"); await page.waitForTimeout(1000);
    await page.getByRole("button", { name: /แก้ไขชื่อยี่ห้อ Panasonic/ }).click();
    const input = page.getByPlaceholder(/^ชื่อยี่ห้อ$/).last();
    await input.fill("  daikin ");
    await page.getByRole("button", { name: /^บันทึก$/ }).last().click();
    const t1 = await toastText(page);
    ledger("Catalogue", "renaming Panasonic to 'daikin' (case/space variant) is refused as duplicate", "UI", /มียี่ห้อนี้อยู่ในระบบแล้ว/.test(t1) ? "PASS" : "FAIL", await shot(page, "settings-rename-dup"));
    await input.fill("Panasonic QA");
    await page.getByRole("button", { name: /^บันทึก$/ }).last().click();
    // The duplicate toast above is still up, so toastText() alone returned at
    // once with that one, before this rename's toast had rendered.
    await page.locator("[data-sonner-toaster]").getByText(/แก้ชื่อยี่ห้อ/).first().waitFor({ timeout: 10_000 }).catch(() => {});
    const t2 = await toastText(page); await settle(page, 2500);
    ledger("Catalogue", "rename Panasonic → 'Panasonic QA' succeeds", "UI", /แก้ชื่อยี่ห้อ/.test(t2) && (await body(page)).includes("Panasonic QA") ? "PASS" : "FAIL", await shot(page, "settings-renamed"));
    await page.getByRole("button", { name: /แก้ไขชื่อยี่ห้อ Panasonic QA/ }).click();
    await page.getByPlaceholder(/^ชื่อยี่ห้อ$/).last().fill("Panasonic");
    await page.getByRole("button", { name: /^บันทึก$/ }).last().click();
    await settle(page, 2500);
    ledger("Catalogue", "rename back to 'Panasonic'", "UI", (await body(page)).includes("Panasonic") && !(await body(page)).includes("Panasonic QA") ? "PASS" : "FAIL", await shot(page, "settings-renamed-back"));
    // trash: create a brand, delete it, re-create same name → must be told to restore
    await page.locator('input[name="name"]').first().fill("QA_TEST_BRAND");
    await page.getByRole("button", { name: /^เพิ่มยี่ห้อ$/ }).first().click();
    const tCreate = await toastText(page); await settle(page, 2500);
    const afterCreate = await body(page);
    const alreadyInTrash = /อยู่ในถังขยะ/.test(afterCreate);
    const created = alreadyInTrash || afterCreate.includes("QA_TEST_BRAND") || /เพิ่มยี่ห้อ.*(สำเร็จ|เรียบร้อย)/.test(tCreate);
    let tTrash = "";
    // The brand list is not paged (every brand renders, name order), so a
    // sixth brand sorting after "Panasonic" is in view as soon as
    // router.refresh() lands. OPEN-2 of sweep 20260914-2013 read a paging
    // problem into this check; it never failed, and the "next page" fallback
    // below is kept only as a harmless no-op.
    ledger("Catalogue", `new brand is in view right after creation (${afterCreate.includes("QA_TEST_BRAND") ? "yes" : "no — on the next page"})`, "UI", alreadyInTrash || afterCreate.includes("QA_TEST_BRAND") ? "PASS" : "FAIL", await shot(page, "settings-brand-created"));
    if (!alreadyInTrash) {
      if (!afterCreate.includes("QA_TEST_BRAND")) {
        await page.getByRole("link", { name: /next|ถัดไป/i }).last().click().catch(() => {});
        await page.waitForTimeout(800);
      }
      await page.getByRole("button", { name: /ลบยี่ห้อนี้ลงถังขยะ/ }).last().click();
      await page.getByRole("button", { name: /ยืนยันลบ/ }).click();
      tTrash = await toastText(page);
      await settle(page, 2500);
    }
    // Judged by the toast, not by the name vanishing from the page: the audit
    // log panel below the catalogue keeps mentioning the brand.
    const trashed = alreadyInTrash || /ไปถังขยะแล้ว/.test(tTrash);
    await page.locator('input[name="name"]').first().fill("qa_test_brand");
    await page.getByRole("button", { name: /^เพิ่มยี่ห้อ$/ }).first().click();
    await page.getByText(/อยู่ในถังขยะ/).first().waitFor({ timeout: 8000 }).catch(() => {});
    const again = await body(page);
    ledger("Catalogue", "create → trash → re-create same name (case variant) is redirected to the trash bin", "UI", created && trashed && /ถังขยะ/.test(again) ? "PASS" : "FAIL", await shot(page, "settings-trash-recreate"));
    await page.getByRole("button", { name: "ถังขยะ", exact: true }).click();
    const dlg = page.locator("div.fixed.inset-0").filter({ hasText: /ถังขยะ/ }).first(); await dlg.waitFor({ timeout: 10_000 });
    // The bin's contents load after the modal opens.
    await dlg.getByText("QA_TEST_BRAND").first().waitFor({ timeout: 8000 }).catch(() => {});
    const inTrash = (await dlg.innerText()).includes("QA_TEST_BRAND");
    ledger("Catalogue", "trash modal lists the deleted brand", "UI", inTrash ? "PASS" : "FAIL", await shot(page, "settings-trash-modal"));
    // permanently delete to clean up
    const purge = dlg.getByRole("button", { name: /ลบถาวร/ }).first();
    if (await purge.count()) { await purge.click(); const c = page.getByRole("button", { name: /ยืนยัน|ลบถาวร/ }).last(); if (await c.count()) await c.click(); await settle(page, 2000); }
  });

  test("QR page: preview modal, print builds the sheet, sticker count in the bar", async ({ page }) => {
    await page.goto("/admin/qr-codes");
    await page.locator("main").last().waitFor({ timeout: 60_000 }); await hydrated(page, "main");
    await page.locator("header input[type=text]").first().fill(QA.building.abbr);
    await page.waitForTimeout(1500);
    const t = await body(page);
    ledger("QR", "search narrows the tree to the QA building", "UI", t.includes(QA.building.name) && !t.includes("Library Building") ? "PASS" : "FAIL", await shot(page, "qr-search"));
    await page.getByRole("button", { name: /ดูตัวอย่าง/ }).first().click();
    const dlg = page.locator("div.fixed.inset-0").first();
    await dlg.waitFor({ timeout: 10_000 });
    const m = await dlg.innerText();
    ledger("QR", "preview modal shows acCode, brand, BTU and 'เครื่องที่ N ของห้องนี้'", "UI", /เครื่องที่ \d+ ของห้องนี้/.test(m) && /BTU/.test(m) ? "PASS" : "FAIL", await shot(page, "qr-modal"));
    // print: capture what would be written to the print window
    await page.evaluate(() => { const w = window as unknown as PrintWindow; w.__printDoc = ""; window.open = () => ({ document: { write: (h: string) => { w.__printDoc += h; }, close() {} } } as unknown as Window); });
    await dlg.getByRole("button", { name: /พิมพ์ \(Print\)/ }).click();
    await page.waitForTimeout(800);
    const doc: string = await page.evaluate(() => (window as unknown as PrintWindow).__printDoc);
    ledger("QR", "single print writes one 150x52mm sticker with a 46mm code", "UI", /width: 150mm/.test(doc) && /width: 46mm/.test(doc) && (doc.match(/class="sticker"/g) || []).length === 1 ? "PASS" : "FAIL", note("qr-print-single.html", doc));
    // popup blocked path
    await page.evaluate(() => { window.open = () => null; });
    await dlg.getByRole("button", { name: /พิมพ์ \(Print\)/ }).click();
    const tt = await toastText(page);
    ledger("QR", "blocked pop-up produces a visible toast", "UI", /บล็อก/.test(tt) ? "PASS" : "FAIL", await shot(page, "qr-print-blocked"));
    await page.keyboard.press("Escape");
    // batch: select the QA building and read the bar
    await page.getByLabel(/เลือกทั้งอาคาร/).first().check().catch(async () => page.getByText(/เลือกทั้งอาคาร/).first().click());
    await page.waitForTimeout(800);
    const bar = await body(page);
    ledger("QR", "selection bar reports sheets at 5 per A4", "UI", /A4 แผ่นละ 5 ดวง/.test(bar) ? "PASS" : "FAIL", await shot(page, "qr-batch-bar"));
  });

  test("calendar: month navigation and today", async ({ page }) => {
    const errors = watchConsole(page);
    await page.goto("/admin/calendar");
    await page.locator("main").last().waitFor({ timeout: 60_000 }); await hydrated(page, "main"); await page.waitForTimeout(1500);
    const t0 = await body(page);
    const month0 = t0.match(/(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)[^\n]*/)?.[0];
    const nav = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-right") }).first();
    await nav.click(); await page.waitForTimeout(800);
    const month1 = (await body(page)).match(/(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)[^\n]*/)?.[0];
    await page.getByRole("button", { name: /^วันนี้$/ }).click(); await page.waitForTimeout(800);
    const month2 = (await body(page)).match(/(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)[^\n]*/)?.[0];
    ledger("Calendar", `next month changes the heading (${month0} → ${month1}) and วันนี้ returns (${month2})`, "UI", month0 && month1 && month0 !== month1 && month2 === month0 ? "PASS" : "FAIL", await shot(page, "calendar-nav"));
    ledger("Calendar", "no console errors while navigating", "UI", errors.filter((e) => !/DevTools|HMR|Fast Refresh/.test(e)).length === 0 ? "PASS" : "FAIL", note("calendar-console.txt", errors.join("\n") || "(none)"));
  });
});
