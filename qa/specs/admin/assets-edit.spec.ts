import type { Page } from "@playwright/test";
import { test, expect, ledger, shot, db, toastText, hydrated, dismissModal, unitPhoto, registerUnitForm } from "../../lib";

// Editing a building and a room on the asset page, opening a unit's picture
// full size, and adding a model from inside the register form (14 Oct 2026). Uses its own building, room and unit, made
// here through SQL, so the shared QA building the other specs and the tech
// project rely on keeps its name. Deleted again at the end; baseline restore
// removes the audit rows.
//
// The picture is a 1x1 PNG data URL: the server under test has no Blob store,
// and next/image passes data: URLs straight through.

const STAMP = Date.now().toString().slice(-5);
const NAME = `QA_TEST_EDIT_BLDG_${STAMP}`;
const ABBR = `QE${STAMP}`;
const ROOM = "QA-E1";
const OTHER_ROOM = "QA-E2";
const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const one = (q: string) => db(q)[0]?.[0] ?? null;

test.describe.configure({ mode: "serial" });

test.describe("assets: edit building and room, open a unit's picture", () => {
  let buildingId = "";
  let roomId = "";
  let unitId = "";
  const acCode = `${ABBR}-${ROOM}-01`;

  test.beforeAll(() => {
    buildingId = one(
      `insert into buildings (name, abbreviation, created_at, updated_at)
       values ('${NAME}', '${ABBR}', now() at time zone 'utc', now() at time zone 'utc') returning id`
    )!;
    roomId = one(
      `insert into rooms (building_id, name, floor, created_at, updated_at)
       values (${buildingId}, '${ROOM}', 1, now() at time zone 'utc', now() at time zone 'utc') returning id`
    )!;
    db(`insert into rooms (building_id, name, floor, created_at, updated_at)
        values (${buildingId}, '${OTHER_ROOM}', 1, now() at time zone 'utc', now() at time zone 'utc')`);
    unitId = one(
      `insert into air_conditioners (room_id, ac_code, qr_code, brand, model, btu, photo_url, status, created_at, updated_at)
       values (${roomId}, '${acCode}', gen_random_uuid(), 'QA Brand', 'QA Model', 12000, '${PHOTO}', 'normal', now() at time zone 'utc', now() at time zone 'utc')
       returning id`
    )!;
  });

  test.afterAll(() => {
    // Every unit in the building: the register test below adds one of its own.
    if (buildingId) db(`delete from air_conditioners where room_id in (select id from rooms where building_id = ${buildingId})`);
    if (buildingId) {
      db(`delete from rooms where building_id = ${buildingId}`);
      db(`delete from buildings where id = ${buildingId}`);
    }
  });

  /** The asset page filtered to this spec's building, opened. */
  async function openBuilding(page: Page, abbr: string, name: string) {
    await page.goto("/admin/assets");
    await page.locator("main").last().waitFor({ timeout: 120_000 });
    await hydrated(page, "main");
    const box = page.locator("header input[type=text]").first();
    await box.fill(abbr);
    await box.press("Enter");
    await page.waitForTimeout(1200);
    // A room shows once its building and its floor are open. One floor opens
    // by itself; after the room test moves a room, there are two and neither
    // does — and clicking an already-open building would close it.
    const roomHeader = page.getByText(`ห้อง ${ROOM}`, { exact: false }).first();
    if (await roomHeader.isVisible().catch(() => false)) return;
    const floors = page.getByText(/^ชั้น \d+$/);
    if (!(await floors.first().isVisible().catch(() => false))) {
      await page.getByRole("heading", { name }).first().click();
      await floors.first().waitFor({ timeout: 10_000 });
    }
    for (let i = 0; i < (await floors.count()); i++) {
      if (await roomHeader.isVisible().catch(() => false)) return;
      await floors.nth(i).click();
      await page.waitForTimeout(300);
    }
  }

  test("building: rename and new abbreviation; existing unit keeps its code", async ({ page }) => {
    const auditFloor = one("select coalesce(max(id), 0) from system_audit_logs")!;
    await openBuilding(page, ABBR, NAME);
    await page.getByRole("button", { name: `แก้ไขอาคาร ${NAME}` }).click();
    const form = page.locator("form").filter({ has: page.locator("#edit-building-name") });
    const note = await form.innerText();
    ledger("Assets edit", "edit-building dialog says registered units keep their codes", "UI", /ใช้รหัสเดิม/.test(note) ? "PASS" : "FAIL", await shot(page, "assets-edit-building-dialog"));

    const newName = `${NAME}_R`;
    const newAbbr = `QR${STAMP}`;
    await form.locator("#edit-building-name").fill(newName);
    await form.locator("#edit-building-abbreviation").fill(newAbbr);
    await form.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
    const tt = await toastText(page, 15_000);
    ledger("Assets edit", `building saved ("${tt}")`, "UI", /บันทึกการแก้ไขอาคารแล้ว/.test(tt) ? "PASS" : "FAIL", await shot(page, "assets-edit-building-saved"));

    const [row] = db(`select name, abbreviation from buildings where id = ${buildingId}`);
    const code = one(`select ac_code from air_conditioners where id = ${unitId}`);
    const audited = one(`select count(*) from system_audit_logs where id > ${auditFloor} and action = 'UPDATE_BUILDING' and entity_id = ${buildingId}`);
    ledger("Assets edit", `building row now ${row?.[0]} / ${row?.[1]}; unit code still ${code}; audit ${audited}`, "DB", row?.[0] === newName && row?.[1] === newAbbr && code === acCode && audited === "1" ? "PASS" : "FAIL");

    // Another building's name is refused.
    const taken = one("select name from buildings where id <> " + buildingId + " order by id limit 1")!;
    await page.getByRole("button", { name: `แก้ไขอาคาร ${newName}` }).click();
    await form.locator("#edit-building-name").fill(taken);
    await form.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
    const dup = await toastText(page, 15_000);
    const still = one(`select name from buildings where id = ${buildingId}`);
    ledger("Assets edit", `renaming onto another building's name is refused ("${dup}")`, "UI", /ในระบบแล้ว/.test(dup) && still === newName ? "PASS" : "FAIL", await shot(page, "assets-edit-building-duplicate"));
    await dismissModal(page);

    expect(row?.[0]).toBe(newName);
    expect(code).toBe(acCode);
    expect(still).toBe(newName);
  });

  test("room: rename and move floor; duplicate name refused; unit keeps its code", async ({ page }) => {
    const [[name, abbr]] = db(`select name, abbreviation from buildings where id = ${buildingId}`) as string[][];
    const auditFloor = one("select coalesce(max(id), 0) from system_audit_logs")!;
    await openBuilding(page, abbr, name);

    await page.getByRole("button", { name: `แก้ไขห้อง ${ROOM}` }).click();
    const form = page.locator("form").filter({ has: page.locator("#edit-room-name") });
    await form.locator("#edit-room-name").fill(OTHER_ROOM);
    await form.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
    const dup = await toastText(page, 15_000);
    ledger("Assets edit", `renaming a room onto a sibling's name is refused ("${dup}")`, "UI", /มีห้องนี้อยู่ในอาคารแล้ว/.test(dup) ? "PASS" : "FAIL", await shot(page, "assets-edit-room-duplicate"));

    await form.locator("#edit-room-name").fill(`${ROOM}-R`);
    await form.locator("#edit-room-floor").fill("3");
    await form.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
    const tt = await toastText(page, 15_000);
    ledger("Assets edit", `room saved ("${tt}")`, "UI", /บันทึกการแก้ไขห้องแล้ว/.test(tt) ? "PASS" : "FAIL", await shot(page, "assets-edit-room-saved"));

    const [row] = db(`select name, floor from rooms where id = ${roomId}`);
    const code = one(`select ac_code from air_conditioners where id = ${unitId}`);
    const audited = one(`select count(*) from system_audit_logs where id > ${auditFloor} and action = 'UPDATE_ROOM' and entity_id = ${roomId}`);
    ledger("Assets edit", `room row now ${row?.[0]} / floor ${row?.[1]}; unit code still ${code}; audit ${audited}`, "DB", row?.[0] === `${ROOM}-R` && row?.[1] === "3" && code === acCode && audited === "1" ? "PASS" : "FAIL");

    expect(row?.[0]).toBe(`${ROOM}-R`);
    expect(row?.[1]).toBe("3");
    expect(code).toBe(acCode);
  });

  test("unit picture: the thumbnail opens it full size, Escape closes it", async ({ page }) => {
    const [[name]] = db(`select name from buildings where id = ${buildingId}`) as string[][];
    // Filtered by the unit's own code: the building's abbreviation changed
    // above and the unit kept the old one, so filtering by the new one hides it.
    await openBuilding(page, acCode, name);
    const thumb = page.getByRole("button", { name: `ดูรูปเครื่อง ${acCode}` });
    await thumb.click();
    const dialog = page.getByRole("dialog", { name: `รูปเครื่อง ${acCode}` });
    const opened = await dialog.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
    const img = opened ? await dialog.locator("img").count() : 0;
    ledger("Assets edit", `thumbnail opens the picture (dialog ${opened}, ${img} img)`, "UI", opened && img > 0 ? "PASS" : "FAIL", await shot(page, "assets-unit-photo-open"));
    await page.keyboard.press("Escape");
    const closed = await dialog.waitFor({ state: "hidden", timeout: 5_000 }).then(() => true).catch(() => false);
    ledger("Assets edit", "Escape closes the picture", "UI", closed ? "PASS" : "FAIL");
    expect(opened).toBe(true);
    expect(closed).toBe(true);
  });

  test("register form: a model missing from the catalogue is added there and used", async ({ page }) => {
    const [[name, abbr]] = db(`select name, abbreviation from buildings where id = ${buildingId}`) as string[][];
    const [[brandId, brandName]] = db("select id, name from ac_brands where deleted_at is null order by name limit 1") as string[][];
    const modelName = `QA_TEST_MODEL_${STAMP}`;
    await openBuilding(page, abbr, name);
    await page.getByRole("button", { name: /ลงทะเบียนแอร์/ }).first().click();
    const form = registerUnitForm(page);
    await form.waitFor({ timeout: 10_000 });

    await form.getByRole("button", { name: "เลือกยี่ห้อ", exact: true }).click();
    await form.getByPlaceholder("พิมพ์ชื่อยี่ห้อ...").fill(brandName);
    await form.getByText(brandName, { exact: true }).first().click();
    await form.locator('input[name="btu"]').fill("9000");
    await form.getByRole("button", { name: "เลือกรุ่น", exact: true }).click();
    await form.getByPlaceholder("พิมพ์ชื่อรุ่น...").fill(modelName);
    await form.getByRole("button", { name: `เพิ่มรุ่น "${modelName}" ในยี่ห้อนี้` }).click();
    const added = await toastText(page, 15_000);
    const [model] = db(`select id, default_btu from ac_models where brand_id = ${brandId} and name = '${modelName}' and deleted_at is null`);
    const shown = await form.getByRole("button", { name: modelName }).count();
    ledger("Assets edit", `model added from the register form ("${added}"); row ${model?.[0] ?? "none"} default BTU ${model?.[1]}; picker shows it ${shown > 0}`, "UI", /เพิ่มรุ่น/.test(added) && !!model && model[1] === "9000" && shown > 0 ? "PASS" : "FAIL", await shot(page, "assets-register-add-model"));

    await form.locator('input[name="photo"]').setInputFiles(unitPhoto());
    await form.getByRole("button", { name: /ลงทะเบียนเครื่องปรับอากาศ/ }).click();
    const tt = await toastText(page, 15_000);
    const used = one(`select count(*) from air_conditioners where ac_model_id = ${model?.[0] ?? 0}`);
    ledger("Assets edit", `unit registered with the new model ("${tt}", ${used} unit)`, "DB", /ลงทะเบียนแอร์สำเร็จ/.test(tt) && used === "1" ? "PASS" : "FAIL", await shot(page, "assets-register-with-new-model"));
    expect(model).toBeTruthy();
    expect(used).toBe("1");
  });
});
