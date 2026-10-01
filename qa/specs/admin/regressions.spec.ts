import type { Page } from "@playwright/test";
import { test, expect, ledger, shot, note, hydrated, toastText, clearToasts, db, unitPhoto, pickRoom } from "../../lib";

// Regressions for the admin-side findings of run 20260913-1742. These write
// to the database on purpose; qa/baseline.mjs restore puts it back.
//
// Everything here works on rows that exist in the baseline (the first
// building, its first room, its first units) rather than on the QA_TEST_*
// rows the workflow spec creates, so the file runs on its own.

const body = (page: Page) => page.evaluate(() => document.body.innerText as string);
const pageLabel = (t: string) => t.match(/หน้า \d+ จาก \d+/)?.[0] ?? "(no pager)";

async function openAssets(page: Page) {
  await page.goto("/admin/assets");
  await page.locator("main").last().waitFor({ timeout: 120_000 });
  await hydrated(page, "main");
  await page.waitForTimeout(1200);
  return page.locator("main").last();
}

// The asset tree opens one level per click; each header toggles, so only
// click when the child is not already showing.
async function expand(page: Page, main: ReturnType<Page["locator"]>, re: RegExp, childRe: RegExp) {
  for (let i = 0; i < 2; i++) {
    if (await main.getByText(childRe).first().isVisible().catch(() => false)) return;
    await main.getByText(re).first().click({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(700);
  }
}

// The first baseline building/room, and the catalogue model with the highest
// default BTU so the copied value is unmistakable.
function fixture() {
  const [[buildingId, buildingName]] = db("select id, name from buildings order by name limit 1");
  const [[roomId, roomName, floor]] = db(`select id, name, floor from rooms where building_id=${buildingId} and floor is not null order by name limit 1`);
  const [[modelId, modelName, brandName, defaultBtu]] = db(
    "select m.id, m.name, b.name, m.default_btu from ac_models m join ac_brands b on b.id=m.brand_id where m.deleted_at is null and b.deleted_at is null and m.default_btu is not null order by m.default_btu desc, m.id limit 1"
  );
  return { buildingId, buildingName: buildingName!, roomId, roomName: roomName!, floor, modelId, modelName: modelName!, brandName: brandName!, defaultBtu: Number(defaultBtu) };
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function expandToRoom(page: Page, f: ReturnType<typeof fixture>) {
  const main = await openAssets(page);
  await expand(page, main, new RegExp(esc(f.buildingName)), new RegExp(`ชั้น ${f.floor}`));
  await expand(page, main, new RegExp(`^ชั้น ${f.floor}`), new RegExp(`ห้อง ${esc(f.roomName)}`));
  await expand(page, main, new RegExp(`ห้อง ${esc(f.roomName)}`), /ลงทะเบียนแอร์/);
  return main;
}

async function openRegisterUnit(page: Page, f: ReturnType<typeof fixture>) {
  const main = await expandToRoom(page, f);
  await main.getByRole("button", { name: /ลงทะเบียนแอร์/ }).first().click();
  await page.waitForTimeout(500);
}

test.describe.serial("assets", () => {
  test("BUG-005: a unit registered from the catalogue takes the model's default BTU", async ({ page }) => {
    const f = fixture();
    await openRegisterUnit(page, f);
    const form = page.locator("form").filter({ has: page.locator('select[name="acModelId"]') });
    await form.locator("select").first().selectOption({ label: f.brandName });
    await page.waitForTimeout(400);
    await form.locator('select[name="acModelId"]').selectOption(String(f.modelId));
    const hasBtuField = await form.locator('input[name="btu"]').count();
    await form.locator('input[name="photo"]').setInputFiles(unitPhoto());
    await form.getByRole("button", { name: /ลงทะเบียนเครื่องปรับอากาศ/ }).click();
    const tt = await toastText(page);
    await page.waitForTimeout(1500);
    const [row] = db(`select ac_code, btu from air_conditioners where ac_model_id=${f.modelId} order by id desc limit 1`);
    note("reg-catalogue-btu.txt", `model ${f.modelName} default ${f.defaultBtu}; form had btu field: ${hasBtuField}; toast: ${tt}; row: ${row?.join(" / ")}`);
    ledger("Assets", `catalogue model ${f.modelName} (${f.defaultBtu}) → stored btu ${row?.[1]}`, "DB", /สำเร็จ/.test(tt) && Number(row?.[1]) === f.defaultBtu ? "PASS" : "FAIL", await shot(page, "reg-catalogue-btu"));

    // Saving the edit form without touching anything must keep it (the
    // catalogue branch of that form has no BTU field).
    const code = row?.[0] ?? "";
    const main = await expandToRoom(page, f);
    await main.getByText(code).first().locator("xpath=ancestor::*[.//button[contains(.,'แก้ไข')]][1]").getByRole("button", { name: /แก้ไข/ }).first().click();
    const dlg = page.locator("div.fixed.inset-0").filter({ hasText: "แก้ไขข้อมูลเครื่องปรับอากาศ" }).last();
    await dlg.waitFor({ timeout: 10_000 });
    await clearToasts(page);
    await dlg.getByRole("button", { name: /บันทึกการแก้ไข/ }).click();
    const tt2 = await toastText(page);
    await page.waitForTimeout(1200);
    const [[btuAfter]] = db(`select btu from air_conditioners where ac_code='${code}'`);
    ledger("Assets", `edit-and-save keeps btu ${btuAfter} (used to null it)`, "DB", /สำเร็จ/.test(tt2) && Number(btuAfter) === f.defaultBtu ? "PASS" : "FAIL", await shot(page, "reg-catalogue-btu-edit"));
  });

  test("BUG-006 / BUG-010: a negative or fractional BTU is refused, in Thai, by the browser and by the server", async ({ page }) => {
    const f = fixture();
    await openRegisterUnit(page, f);
    await page.getByRole("button", { name: /กำหนดเอง/ }).click();
    const form = page.locator("form").filter({ has: page.locator('input[name="customBrand"]') });
    await form.locator('input[name="customBrand"]').fill("QA_TEST_BRAND_NEG");
    const btu = form.locator('input[name="btu"]');
    const submit = form.getByRole("button", { name: /ลงทะเบียนเครื่องปรับอากาศ/ });
    await form.locator('input[name="photo"]').setInputFiles(unitPhoto());

    await btu.fill("-5");
    await submit.click();
    await page.waitForTimeout(300);
    const m1 = await btu.evaluate((el: HTMLInputElement) => el.validationMessage);
    ledger("Assets", `BTU -5: browser says "${m1}"`, "UI", /ขนาด BTU ต้องมากกว่า 0/.test(m1) ? "PASS" : "FAIL", await shot(page, "reg-btu-negative"));

    await btu.fill("1.5");
    await submit.click();
    await page.waitForTimeout(300);
    const m2 = await btu.evaluate((el: HTMLInputElement) => el.validationMessage);
    ledger("Assets", `BTU 1.5: browser says "${m2}"`, "UI", /จำนวนเต็ม/.test(m2) ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/reg-btu-negative.png");

    // Strip the attributes to reach the server rule.
    await btu.fill("-5");
    await btu.evaluate((el) => { el.removeAttribute("min"); el.removeAttribute("step"); });
    await clearToasts(page);
    await submit.click();
    const tt = await toastText(page);
    await page.waitForTimeout(800);
    const [[stored]] = db("select count(*) from air_conditioners where brand='QA_TEST_BRAND_NEG'");
    ledger("Assets", `server refuses -5: "${tt}", rows stored ${stored}`, "DB", /ขนาด BTU ต้องเป็นจำนวนเต็มมากกว่า 0/.test(tt) && stored === "0" ? "PASS" : "FAIL", await shot(page, "reg-btu-server"));
  });

  test("BUG-010: the room floor field explains itself in Thai", async ({ page }) => {
    const f = fixture();
    const main = await openAssets(page);
    await expand(page, main, new RegExp(esc(f.buildingName)), new RegExp(`ชั้น ${f.floor}`));
    await main.getByRole("button", { name: /เพิ่มชั้น/ }).first().click();
    await page.waitForTimeout(400);
    const form = page.locator("form").filter({ has: page.locator('input[name="floor"]') });
    const floor = form.locator('input[name="floor"]');
    const submit = form.getByRole("button", { name: /บันทึก|เพิ่ม/ }).last();
    await form.locator('input[name="name"]').fill("QA_TEST_ROOM_NEG");
    await floor.fill("-3");
    await submit.click();
    await page.waitForTimeout(300);
    const m1 = await floor.evaluate((el: HTMLInputElement) => el.validationMessage);
    await floor.fill("");
    await submit.click();
    await page.waitForTimeout(300);
    const m2 = await floor.evaluate((el: HTMLInputElement) => el.validationMessage);
    ledger("Assets", `floor -3 → "${m1}", blank → "${m2}"`, "UI", /ชั้นต้องเป็น 0 ขึ้นไป/.test(m1) && /กรุณาระบุชั้น/.test(m2) ? "PASS" : "FAIL", await shot(page, "reg-floor-thai"));
  });
});

test.describe.serial("work orders", () => {
  async function createOrder(page: Page, buildingName: string, roomName: string, acCode: string, type: "repair" | "cleaning") {
    await page.goto("/admin");
    await page.locator("main").last().waitFor({ timeout: 120_000 });
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: /สร้างใบงานซ่อมบำรุง/ }).first().click();
    const dlg = page.locator("div.fixed.inset-0").filter({ hasText: /สร้างใบงานซ่อมบำรุง/ }).first();
    await dlg.waitFor({ timeout: 15_000 });
    // buildingName is implied by the room — the picker's search sets all three
    // steps at once — but it stays in the signature so the call sites still
    // read as "this unit, in this room, in this building".
    void buildingName;
    await pickRoom(dlg, roomName);
    await page.waitForTimeout(400);
    const units = await dlg.locator('select[name="airConditionerId"] option').allInnerTexts();
    await dlg.locator('select[name="airConditionerId"]').selectOption({ index: units.findIndex((o) => o.includes(acCode)) });
    await dlg.locator('select[name="type"]').selectOption(type);
    await clearToasts(page);
    await dlg.getByRole("button", { name: /ยืนยันการสร้างใบงาน/ }).click();
    const tt = await toastText(page);
    await page.waitForTimeout(1200);
    return tt;
  }

  test("BUG-004: a second open order of the same kind for a unit is refused; a different kind is not", async ({ page }) => {
    // A unit with no open order at all, in the first building.
    const [[acCode, roomName, buildingName]] = db(
      "select a.ac_code, r.name, b.name from air_conditioners a join rooms r on r.id=a.room_id join buildings b on b.id=r.building_id where not exists (select 1 from work_orders w where w.air_conditioner_id=a.id and w.status in ('pending','claimed')) order by b.name, a.id limit 1"
    );
    expect(acCode).toBeTruthy();
    const t1 = await createOrder(page, buildingName!, roomName!, acCode!, "repair");
    ledger("Work orders", `first repair order for ${acCode}: "${t1}"`, "UI", /เรียบร้อย/.test(t1) ? "PASS" : "FAIL", await shot(page, "reg-wo-first"));
    const t2 = await createOrder(page, buildingName!, roomName!, acCode!, "repair");
    ledger("Work orders", `second repair order: "${t2}"`, "UI", /มีใบงานซ่อมที่ยังเปิดอยู่/.test(t2) ? "PASS" : "FAIL", await shot(page, "reg-wo-duplicate"));
    const t3 = await createOrder(page, buildingName!, roomName!, acCode!, "cleaning");
    ledger("Work orders", `a cleaning order alongside the open repair: "${t3}"`, "UI", /เรียบร้อย/.test(t3) ? "PASS" : "FAIL", await shot(page, "reg-wo-other-kind"));
    const [[open]] = db(`select count(*) from work_orders w join air_conditioners a on a.id=w.air_conditioner_id where a.ac_code='${acCode}' and w.status in ('pending','claimed')`);
    ledger("Work orders", `open orders on ${acCode} after the three attempts: ${open} (expect 2)`, "DB", open === "2" ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/reg-wo-other-kind.png");
  });

  test("BUG-007: the dashboard's urgent figures agree with each other", async ({ page }) => {
    await page.goto("/admin");
    await page.locator("main").last().waitFor({ timeout: 120_000 });
    // The KPI and analytics numbers count up (MotionNumber, spring); read
    // the page only once two reads a second apart agree.
    let t = "";
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      const next = (await body(page)).replace(/\s+/g, " ");
      if (next === t) break;
      t = next;
    }
    const n = (re: RegExp) => Number(t.match(re)?.[1] ?? -1);
    const kpiRepair = n(/รอซ่อมด่วน\s*(\d+)\s*รายการ/);
    const kpiCleaning = n(/ถึงรอบล้างแอร์\s*(\d+)\s*รายการ/);
    const pillRepair = n(/รอซ่อมด่วน\s*(\d+)\s*งานล้างแอร์/);
    const sub = t.match(/ทั้งหมด (\d+) รายการ \(ซ่อมด่วน (\d+) • ค้างล้าง (\d+) • กำหนดล้าง (\d+)\)/);
    const [total, subRepair, overdue, scheduled] = sub ? sub.slice(1).map(Number) : [-1, -1, -1, -1];
    note("reg-dashboard-figures.txt", JSON.stringify({ kpiRepair, kpiCleaning, pillRepair, total, subRepair, overdue, scheduled }));
    ledger("Dashboard", `KPI รอซ่อมด่วน ${kpiRepair} = pill ${pillRepair} = subtitle ${subRepair}`, "UI", kpiRepair >= 0 && kpiRepair === pillRepair && pillRepair === subRepair ? "PASS" : "FAIL", await shot(page, "reg-dashboard-figures"));
    ledger("Dashboard", `KPI ถึงรอบล้างแอร์ ${kpiCleaning} = ค้างล้าง ${overdue}`, "UI", kpiCleaning >= 0 && kpiCleaning === overdue ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/reg-dashboard-figures.png");
    ledger("Dashboard", `subtitle ${subRepair} + ${overdue} + ${scheduled} = ${total}`, "UI", total > 0 && subRepair + overdue + scheduled === total ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/reg-dashboard-figures.png");
    const donut = t.match(/ใบงานความสำคัญสูง\/วิกฤต ที่เปิดอยู่:\s*(\d+)\s*ใบ/);
    const [[dbUrgent]] = db("select count(*) from work_orders where priority in ('high','critical') and status in ('pending','claimed')");
    ledger("Dashboard", `analytics footer ${donut?.[1] ?? "(missing)"} open high/critical orders = DB ${dbUrgent}`, "DB", donut && donut[1] === dbUrgent ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/reg-dashboard-figures.png");

    // The donut counts every order, not the board's first fifty (plan B1).
    const donutTotal = t.match(/รวมทั้งหมด:\s*(\d+)\s*ใบงาน/)?.[1];
    const pendingCard = t.match(/รอดำเนินการ\s*(\d+)\s*\d+%\s*รอการมอบหมาย/)?.[1];
    const [[dbTotal, dbPending]] = db("select count(*), sum(case when status='pending' then 1 else 0 end) from work_orders");
    const badge = t.match(/กระดานใบงาน\s*(\d+)/)?.[1];
    ledger("Dashboard", `analytics total ${donutTotal} = DB ${dbTotal}; pending card ${pendingCard} = DB ${dbPending} = sidebar badge ${badge}`, "DB", donutTotal === dbTotal && pendingCard === dbPending && badge === dbPending ? "PASS" : "FAIL", "runs/" + process.env.QA_RUN + "/reg-dashboard-figures.png");
  });

  test("BUG-008: a building that sorts last is shown, expanded, on the page it lands on", async ({ page }) => {
    const main = await openAssets(page);
    const before = pageLabel(await body(page));
    await main.getByRole("button", { name: /เพิ่มอาคาร/ }).first().click();
    const form = page.locator("form").filter({ has: page.locator('input[name="abbreviation"]') });
    await form.locator('input[name="name"]').fill("ZZZ_QA_TEST_FOCUS");
    await form.locator('input[name="abbreviation"]').fill("ZZQAF");
    await form.getByRole("button", { name: /บันทึก|เพิ่ม/ }).last().click();
    const tt = await toastText(page);
    await page.waitForTimeout(3000);
    const t = await body(page);
    const visible = /ZZZ_QA_TEST_FOCUS/.test(t);
    const expanded = /เพิ่มชั้น/.test(t);
    ledger("Assets", `new building: "${tt}"; pager ${before} → ${pageLabel(t)}; visible ${visible}; expanded ${expanded}`, "UI", /สำเร็จ/.test(tt) && visible && expanded ? "PASS" : "FAIL", await shot(page, "reg-focus-building"));

    // The board: an order for a unit in that building opens the board on its page.
    await main.getByRole("button", { name: /เพิ่มชั้น/ }).first().click();
    await page.waitForTimeout(400);
    const rform = page.locator("form").filter({ has: page.locator('input[name="floor"]') });
    await rform.locator('input[name="name"]').fill("QA-F1");
    if (!(await rform.locator('input[name="floor"]').evaluate((el: HTMLInputElement) => el.readOnly))) await rform.locator('input[name="floor"]').fill("1");
    await clearToasts(page);
    await rform.getByRole("button", { name: /บันทึก|เพิ่ม/ }).last().click();
    await toastText(page);
    await page.waitForTimeout(2500);
    await expand(page, main, /^ชั้น 1/, /ห้อง QA-F1/);
    await expand(page, main, /ห้อง QA-F1/, /ลงทะเบียนแอร์/);
    await main.getByRole("button", { name: /ลงทะเบียนแอร์/ }).first().click();
    await page.getByRole("button", { name: /กำหนดเอง/ }).click();
    const uform = page.locator("form").filter({ has: page.locator('input[name="customBrand"]') });
    await uform.locator('input[name="customBrand"]').fill("QA_TEST_BRAND_FOCUS");
    await uform.locator('input[name="photo"]').setInputFiles(unitPhoto());
    await clearToasts(page);
    await uform.getByRole("button", { name: /ลงทะเบียนเครื่องปรับอากาศ/ }).click();
    await toastText(page);
    await page.waitForTimeout(2000);
    const [[acCode]] = db("select ac_code from air_conditioners where brand='QA_TEST_BRAND_FOCUS' order by id desc limit 1");
    expect(acCode).toBeTruthy();

    const created = await createOrder(page, "ZZZ_QA_TEST_FOCUS", "QA-F1", acCode!, "repair");
    await page.getByRole("link", { name: /กระดานใบงาน/ }).first().click();
    await page.waitForURL(/work-orders/, { timeout: 60_000 });
    await page.locator("main").last().waitFor({ timeout: 60_000 });
    await page.waitForTimeout(3000);
    const bt = await body(page);
    ledger("Work orders", `after "${created}": board opens on ${pageLabel(bt)} with ${acCode} visible ${/ZZZ_QA_TEST_FOCUS/.test(bt) && bt.includes(acCode!)}`, "UI", /ZZZ_QA_TEST_FOCUS/.test(bt) && bt.includes(acCode!) ? "PASS" : "FAIL", await shot(page, "reg-focus-board"));

    // Leaving and coming back must not re-apply the focus (review fix d26018f).
    await page.getByRole("link", { name: /ภาพรวมระบบ/ }).first().click();
    await page.waitForURL(/\/admin$/, { timeout: 60_000 });
    await page.waitForTimeout(1500);
    await page.getByRole("link", { name: /กระดานใบงาน/ }).first().click();
    await page.waitForURL(/work-orders/, { timeout: 60_000 });
    await page.locator("main").last().waitFor({ timeout: 60_000 });
    await page.waitForTimeout(2500);
    const bt2 = await body(page);
    ledger("Work orders", `second visit opens on ${pageLabel(bt2)} (focus forgotten: ${!/ZZZ_QA_TEST_FOCUS/.test(bt2)})`, "UI", /หน้า 1 จาก/.test(pageLabel(bt2)) && !/ZZZ_QA_TEST_FOCUS/.test(bt2) ? "PASS" : "FAIL", await shot(page, "reg-focus-board-revisit"));
  });
});

test("BUG-011: admin pages carry exactly one <main>", async ({ page }) => {
  for (const path of ["/admin", "/admin/work-orders", "/admin/assets"]) {
    await page.goto(path);
    await page.locator("main").last().waitFor({ timeout: 120_000 });
    await page.waitForTimeout(800);
    const mains = await page.locator("main").count();
    ledger("A11y", `${path}: ${mains} <main> landmark(s)`, "UI", mains === 1 ? "PASS" : "FAIL", "—");
  }
});
