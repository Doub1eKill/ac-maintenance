import { test, expect, ledger, shot, db, toastText, hydrated, QA } from "../../lib";

// A technician hands back a job they claimed (25 Oct 2026). Its own building,
// room, unit and work order, made through SQL and claimed in the QA
// technician's name, so the shared QA order the other tech specs claim and
// close is not touched. Deleted again at the end; baseline restore removes the
// audit row.

const STAMP = Date.now().toString().slice(-5);
const ABBR = `QL${STAMP}`;
const CODE = `${ABBR}-QA-L1-01`;
const one = (q: string) => db(q)[0]?.[0] ?? null;

test.describe("technician: give a claimed job back", () => {
  let buildingId = "";
  let workOrderId = "";
  let techId = "";

  test.beforeAll(() => {
    techId = one(`select id from users where email = '${QA.tech}'`)!;
    buildingId = one(
      `insert into buildings (name, abbreviation, created_at, updated_at)
       values ('QA_TEST_RELEASE_BLDG_${STAMP}', '${ABBR}', now() at time zone 'utc', now() at time zone 'utc') returning id`
    )!;
    const roomId = one(
      `insert into rooms (building_id, name, floor, created_at, updated_at)
       values (${buildingId}, 'QA-L1', 1, now() at time zone 'utc', now() at time zone 'utc') returning id`
    )!;
    const unitId = one(
      `insert into air_conditioners (room_id, ac_code, qr_code, brand, model, btu, status, created_at, updated_at)
       values (${roomId}, '${CODE}', gen_random_uuid(), 'QA Brand', 'QA Model', 12000, 'needs_cleaning', now() at time zone 'utc', now() at time zone 'utc')
       returning id`
    )!;
    workOrderId = one(
      `insert into work_orders (air_conditioner_id, status, type, priority, claimed_by, claimed_at, created_at)
       values (${unitId}, 'claimed', 'cleaning', 'low', ${techId}, now() at time zone 'utc', now() at time zone 'utc')
       returning id`
    )!;
  });

  test.afterAll(() => {
    if (!buildingId) return;
    db(`delete from work_orders where air_conditioner_id in (select a.id from air_conditioners a join rooms r on r.id = a.room_id where r.building_id = ${buildingId})`);
    db(`delete from air_conditioners where room_id in (select id from rooms where building_id = ${buildingId})`);
    db(`delete from rooms where building_id = ${buildingId}`);
    db(`delete from buildings where id = ${buildingId}`);
  });

  test("my jobs: คืนงาน asks first, then puts the job back in the pool", async ({ page }) => {
    await page.goto("/tech/my-jobs");
    await page.locator("main").last().waitFor({ timeout: 90_000 });
    await hydrated(page, "main");

    const release = page.getByRole("button", { name: `คืนงาน ${CODE}` });
    // The page opens a building by itself only when it is the only one. If the
    // QA technician holds another job too (whichever tech spec ran first
    // claimed it), the buildings start closed — field-lcp-20261026 failed
    // here for that alone. This building has one floor and one room, so
    // opening it opens all the way down to the card.
    // The heading is there either way; waiting for it first means the cards
    // under an already-open building have rendered too, so the click below
    // never closes the one building that opened by itself.
    // As a heading: the building filter above the list lists the same name.
    const building = page.getByRole("heading", { name: `QA_TEST_RELEASE_BLDG_${STAMP}`, exact: true });
    await building.waitFor({ timeout: 15_000 });
    if (!(await release.isVisible().catch(() => false))) await building.click();
    await release.waitFor({ timeout: 15_000 });
    await release.click();
    // Asked in place; nothing written yet.
    const asked = await page.getByText("คืนงานนี้ให้กลับไปรอรับงาน?").isVisible();
    const stillClaimed = one(`select status from work_orders where id = ${workOrderId}`);
    ledger("Release job", `คืนงาน asks before writing (asked ${asked}, status still ${stillClaimed})`, "UI", asked && stillClaimed === "claimed" ? "PASS" : "FAIL", await shot(page, "release-confirm"));

    await page.getByRole("button", { name: "ยืนยันคืนงาน" }).click();
    const tt = await toastText(page, 15_000);
    const [row] = db(`select status, claimed_by, claimed_at from work_orders where id = ${workOrderId}`);
    const audit = one(
      `select count(*) from system_audit_logs where action = 'RELEASE_WORKORDER' and entity_id = ${workOrderId} and user_id = ${techId}`
    );
    await page.waitForTimeout(1500);
    const gone = (await page.getByRole("button", { name: `คืนงาน ${CODE}` }).count()) === 0;
    ledger("Release job", `released ("${tt}"): status ${row?.[0]}, claimed_by ${row?.[1]}, claimed_at ${row?.[2]}; audit ${audit}; card gone from my jobs ${gone}`, "DB", /คืนงานแล้ว/.test(tt) && row?.[0] === "pending" && row?.[1] === null && row?.[2] === null && audit === "1" && gone ? "PASS" : "FAIL", await shot(page, "release-done"));

    expect(row?.[0]).toBe("pending");
    expect(row?.[1]).toBeNull();
    expect(audit).toBe("1");
  });
});
