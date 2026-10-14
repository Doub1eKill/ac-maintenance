import { test, expect, ledger, shot, db, toastText, QA } from "../../lib";

// A technician renames a room and moves it to another floor from their asset
// page (14 Oct 2026: technicians may correct rooms, not buildings). Own
// building, room and unit, made through SQL and deleted at the end; baseline
// restore removes the audit row.

const STAMP = Date.now().toString().slice(-5);
const NAME = `QA_TEST_TECH_ROOM_${STAMP}`;
const ABBR = `QT${STAMP}`;
const ROOM = "QA-T1";
const one = (q: string) => db(q)[0]?.[0] ?? null;

test.describe.configure({ mode: "serial" });

test.describe("technician: edit a room", () => {
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
    unitId = one(
      `insert into air_conditioners (room_id, ac_code, qr_code, brand, model, btu, status, created_at, updated_at)
       values (${roomId}, '${acCode}', gen_random_uuid(), 'QA Brand', 'QA Model', 12000, 'normal', now() at time zone 'utc', now() at time zone 'utc')
       returning id`
    )!;
  });

  test.afterAll(() => {
    if (unitId) db(`delete from air_conditioners where id = ${unitId}`);
    if (buildingId) {
      db(`delete from rooms where building_id = ${buildingId}`);
      db(`delete from buildings where id = ${buildingId}`);
    }
  });

  test("room: renamed and moved floor by a technician; the unit keeps its code; no building edit offered", async ({ page }) => {
    const auditFloor = one("select coalesce(max(id), 0) from system_audit_logs")!;
    await page.goto(`/tech/assets?q=${encodeURIComponent(acCode)}`);
    const pencil = page.getByRole("button", { name: `แก้ไขห้อง ${ROOM}` });
    if (!(await pencil.isVisible({ timeout: 30_000 }).catch(() => false))) {
      await page.getByText(NAME).first().click();
    }
    await pencil.waitFor({ timeout: 30_000 });
    const buildingEdit = await page.getByRole("button", { name: /^แก้ไขอาคาร/ }).count();
    ledger("Tech room edit", `room has an edit button; buildings have none (${buildingEdit})`, "UI", buildingEdit === 0 ? "PASS" : "FAIL", await shot(page, "tech-room-edit-button"));

    await pencil.click();
    const form = page.locator("form").filter({ has: page.locator("#edit-room-name") });
    await form.locator("#edit-room-name").fill(`${ROOM}-R`);
    await form.locator("#edit-room-floor").fill("2");
    await form.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
    const tt = await toastText(page, 15_000);
    ledger("Tech room edit", `room saved ("${tt}")`, "UI", /บันทึกการแก้ไขห้องแล้ว/.test(tt) ? "PASS" : "FAIL", await shot(page, "tech-room-edit-saved"));

    const [row] = db(`select name, floor from rooms where id = ${roomId}`);
    const code = one(`select ac_code from air_conditioners where id = ${unitId}`);
    const by = one(
      `select u.email from system_audit_logs s join users u on u.id = s.user_id
       where s.id > ${auditFloor} and s.action = 'UPDATE_ROOM' and s.entity_id = ${roomId}`
    );
    ledger("Tech room edit", `room now ${row?.[0]} / floor ${row?.[1]}; unit code ${code}; audited as ${by}`, "DB", row?.[0] === `${ROOM}-R` && row?.[1] === "2" && code === acCode && by === QA.tech ? "PASS" : "FAIL");

    expect(row?.[0]).toBe(`${ROOM}-R`);
    expect(row?.[1]).toBe("2");
    expect(code).toBe(acCode);
    expect(by).toBe(QA.tech);
    expect(buildingEdit).toBe(0);
  });
});
