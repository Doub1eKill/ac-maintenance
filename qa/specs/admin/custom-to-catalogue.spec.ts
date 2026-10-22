import type { Page } from "@playwright/test";
import { test, expect, ledger, shot, db, toastText, clearToasts, hydrated, unitPhoto, registerUnitForm, fillCustomBrand } from "../../lib";

// Moving a typed-in ("กำหนดเอง") brand and model into the catalogue (22 Oct
// 2026): the button inside the register form, and the settings-page card that
// links units already saved as text. Uses its own building, room and units,
// made here through SQL, and deletes them again at the end along with the
// catalogue rows it created; baseline restore removes the audit rows.

const STAMP = Date.now().toString().slice(-5);
const NAME = `QA_TEST_CUSTOM_BLDG_${STAMP}`;
const ABBR = `QC${STAMP}`;
const ROOM = "QA-C1";
const FORM_BRAND = `QA_TEST_FORM_BRAND_${STAMP}`;
const FORM_MODEL = `QF-${STAMP}`;
const SAVED_BRAND = `QA_TEST_SAVED_BRAND_${STAMP}`;
const SAVED_MODEL = `QS-${STAMP}`;
const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const one = (q: string) => db(q)[0]?.[0] ?? null;

test.describe.configure({ mode: "serial" });

test.describe("catalogue: typed-in brand and model moved into the catalogue", () => {
  let buildingId = "";
  let roomId = "";
  const savedUnits: string[] = [];

  test.beforeAll(() => {
    buildingId = one(
      `insert into buildings (name, abbreviation, created_at, updated_at)
       values ('${NAME}', '${ABBR}', now() at time zone 'utc', now() at time zone 'utc') returning id`
    )!;
    roomId = one(
      `insert into rooms (building_id, name, floor, created_at, updated_at)
       values (${buildingId}, '${ROOM}', 1, now() at time zone 'utc', now() at time zone 'utc') returning id`
    )!;
    // Three spellings of one model, the way three technicians would type it.
    const spellings: [string, string, string][] = [
      [SAVED_BRAND, SAVED_MODEL, "12000"],
      [` ${SAVED_BRAND.toLowerCase()}  `, SAVED_MODEL.toLowerCase(), "null"],
      [SAVED_BRAND, `${SAVED_MODEL}  `, "18000"],
    ];
    spellings.forEach(([brand, model, btu], i) => {
      savedUnits.push(
        one(
          `insert into air_conditioners (room_id, ac_code, qr_code, brand, model, btu, photo_url, status, created_at, updated_at)
           values (${roomId}, '${ABBR}-${ROOM}-0${i + 1}', gen_random_uuid(), '${brand}', '${model}', ${btu}, '${PHOTO}', 'normal', now() at time zone 'utc', now() at time zone 'utc')
           returning id`
        )!
      );
    });
  });

  test.afterAll(() => {
    if (buildingId) {
      db(`delete from air_conditioners where room_id in (select id from rooms where building_id = ${buildingId})`);
      db(`delete from rooms where building_id = ${buildingId}`);
      db(`delete from buildings where id = ${buildingId}`);
    }
    db(`delete from ac_models where brand_id in (select id from ac_brands where name in ('${FORM_BRAND}', '${SAVED_BRAND}'))`);
    db(`delete from ac_brands where name in ('${FORM_BRAND}', '${SAVED_BRAND}')`);
  });

  async function openRegisterForm(page: Page) {
    await page.goto("/admin/assets");
    await page.locator("main").last().waitFor({ timeout: 120_000 });
    await hydrated(page, "main");
    const box = page.locator("header input[type=text]").first();
    await box.fill(ABBR);
    await box.press("Enter");
    await page.waitForTimeout(1200);
    const register = page.getByRole("button", { name: /ลงทะเบียนแอร์/ }).first();
    if (!(await register.isVisible().catch(() => false))) {
      await page.getByRole("heading", { name: NAME }).first().click();
      const floor = page.getByText(/^ชั้น \d+$/).first();
      await floor.waitFor({ timeout: 10_000 });
      if (!(await register.isVisible().catch(() => false))) await floor.click();
    }
    await register.click();
    const form = registerUnitForm(page);
    await form.waitFor({ timeout: 10_000 });
    return form;
  }

  test("register form: the typed brand and model are added and selected, and not twice", async ({ page }) => {
    const form = await openRegisterForm(page);
    await form.locator('input[name="btu"]').fill("9000");
    await fillCustomBrand(form, FORM_BRAND, FORM_MODEL);
    const add = form.getByRole("button", { name: "เพิ่มยี่ห้อและรุ่นนี้เข้าระบบ" });
    await add.click();
    const added = await toastText(page, 15_000);
    const [model] = db(
      `select m.id, m.default_btu from ac_models m join ac_brands b on b.id = m.brand_id
       where b.name = '${FORM_BRAND}' and m.name = '${FORM_MODEL}' and m.deleted_at is null`
    );
    const selected = await form.getByRole("button", { name: FORM_MODEL }).count();
    ledger("Custom to catalogue", `form button adds "${FORM_BRAND} ${FORM_MODEL}" ("${added}"); model row ${model?.[0] ?? "none"} default BTU ${model?.[1]}; selected in the picker ${selected > 0}`, "UI", /เข้าระบบแล้ว/.test(added) && !!model && model[1] === "9000" && selected > 0 ? "PASS" : "FAIL", await shot(page, "custom-form-added"));
    await clearToasts(page);

    // Same names, other case and spacing: picks the existing entry.
    await fillCustomBrand(form, `${FORM_BRAND.toLowerCase()}  `, FORM_MODEL.toLowerCase());
    await add.click();
    const again = await toastText(page, 15_000);
    const brands = one(`select count(*) from ac_brands where lower(name) = lower('${FORM_BRAND}')`);
    const models = one(`select count(*) from ac_models where lower(name) = lower('${FORM_MODEL}')`);
    ledger("Custom to catalogue", `the same names again select the existing entry ("${again}"); brands ${brands}, models ${models}`, "UI", /มีอยู่ในระบบแล้ว/.test(again) && brands === "1" && models === "1" ? "PASS" : "FAIL", await shot(page, "custom-form-existing"));
    await clearToasts(page);

    await form.locator('input[name="photo"]').setInputFiles(unitPhoto());
    await form.getByRole("button", { name: /ลงทะเบียนเครื่องปรับอากาศ/ }).click();
    const tt = await toastText(page, 15_000);
    const [unit] = db(`select ac_model_id, brand from air_conditioners where room_id = ${roomId} and ac_model_id is not null`);
    ledger("Custom to catalogue", `unit registered against the catalogue model, no free text ("${tt}")`, "DB", /ลงทะเบียนแอร์สำเร็จ/.test(tt) && unit?.[0] === model?.[0] && unit?.[1] === null ? "PASS" : "FAIL", await shot(page, "custom-form-registered"));

    expect(model).toBeTruthy();
    expect(brands).toBe("1");
    expect(models).toBe("1");
    expect(unit?.[0]).toBe(model?.[0]);
  });

  test("settings: units saved as text are grouped and linked to a new catalogue model", async ({ page }) => {
    const auditFloor = one("select coalesce(max(id), 0) from system_audit_logs")!;
    await page.goto("/admin/settings");
    await page.locator("main").last().waitFor({ timeout: 120_000 });
    await hydrated(page, "main");
    const card = page.locator(".biz-card").filter({ has: page.getByRole("heading", { name: "แอร์ที่ใช้ยี่ห้อ/รุ่นกำหนดเอง" }) }).last();
    const row = card.locator("div.divide-y > div").filter({ hasText: SAVED_BRAND });
    await row.waitFor({ timeout: 15_000 });
    const rows = await row.count();
    const text = await row.first().innerText();
    ledger("Custom to catalogue", `three spellings show as one group (${rows} row: "${text.split("\n").join(" / ")}")`, "UI", rows === 1 && /3 เครื่อง/.test(text) ? "PASS" : "FAIL", await shot(page, "custom-settings-group"));

    await row.getByRole("button", { name: "เพิ่มเข้าระบบ" }).click();
    const inputs = await row.locator("input").evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    ledger("Custom to catalogue", `link panel pre-filled ${JSON.stringify(inputs)}`, "UI", inputs[0] === SAVED_BRAND && inputs[1] === SAVED_MODEL && inputs[2] === "12000" ? "PASS" : "FAIL");
    await row.getByRole("button", { name: "ยืนยัน ผูก 3 เครื่อง" }).click();
    const tt = await toastText(page, 15_000);

    const linked = db(
      `select a.id, a.brand, a.model, a.btu, m.name from air_conditioners a left join ac_models m on m.id = a.ac_model_id
       where a.id in (${savedUnits.join(",")}) order by a.id`
    );
    const ok =
      linked.length === 3 &&
      linked.every((r) => r[1] === null && r[2] === null && r[4] === SAVED_MODEL) &&
      linked.map((r) => r[3]).join(",") === "12000,12000,18000";
    const audited = one(`select count(*) from system_audit_logs where id > ${auditFloor} and action = 'LINK_CUSTOM_UNITS_TO_AC_MODEL'`);
    ledger("Custom to catalogue", `three units linked ("${tt}"); text cleared, BTU ${linked.map((r) => r[3]).join(",")}; audit ${audited}`, "DB", /ผูกแอร์ 3 เครื่องแล้ว/.test(tt) && ok && audited === "1" ? "PASS" : "FAIL", await shot(page, "custom-settings-linked"));

    await page.waitForTimeout(1500);
    const left = await card.locator("div.divide-y > div").filter({ hasText: SAVED_BRAND }).count();
    ledger("Custom to catalogue", `the group is gone from the card (${left} left)`, "UI", left === 0 ? "PASS" : "FAIL");

    expect(ok).toBe(true);
    expect(audited).toBe("1");
    expect(left).toBe(0);
  });
});
