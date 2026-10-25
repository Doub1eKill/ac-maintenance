import { test, expect, ledger, shot, db, toastText, hydrated, QA } from "../../lib";

// An admin takes a claimed job back from its technician (25 Oct 2026). Its own
// building, room, unit and work order, made through SQL and claimed in the QA
// technician's name. Deleted again at the end; baseline restore removes the
// audit row.

const STAMP = Date.now().toString().slice(-5);
const ABBR = `QR${STAMP}`;
const CODE = `${ABBR}-QA-R1-01`;
const one = (q: string) => db(q)[0]?.[0] ?? null;

test.describe("admin: recall a claimed job", () => {
  let buildingId = "";
  let workOrderId = "";
  let techId = "";

  test.beforeAll(() => {
    techId = one(`select id from users where email = '${QA.tech}'`)!;
    buildingId = one(
      `insert into buildings (name, abbreviation, created_at, updated_at)
       values ('QA_TEST_RECALL_BLDG_${STAMP}', '${ABBR}', now() at time zone 'utc', now() at time zone 'utc') returning id`
    )!;
    const roomId = one(
      `insert into rooms (building_id, name, floor, created_at, updated_at)
       values (${buildingId}, 'QA-R1', 1, now() at time zone 'utc', now() at time zone 'utc') returning id`
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

  test("work order detail: เรียกงานคืน asks first, then the job is pending and unclaimed", async ({ page }) => {
    await page.goto("/admin/work-orders");
    await page.locator("main").last().waitFor({ timeout: 120_000 });
    await hydrated(page, "main");
    const box = page.locator("header input[type=text]").first();
    await box.fill(CODE);
    await box.press("Enter");
    await page.waitForTimeout(1500);

    await page.getByRole("row").filter({ hasText: CODE }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 10_000 });
    await dialog.getByRole("button", { name: "เรียกงานคืน" }).click();
    const asked = await dialog.getByText(`เรียกงาน ${CODE} คืนจากช่าง`).isVisible();
    const before = one(`select status from work_orders where id = ${workOrderId}`);
    ledger("Recall job", `เรียกงานคืน asks before writing (asked ${asked}, status still ${before})`, "UI", asked && before === "claimed" ? "PASS" : "FAIL", await shot(page, "recall-confirm"));

    await dialog.getByRole("button", { name: "ยืนยันเรียกคืน" }).click();
    const tt = await toastText(page, 15_000);
    const [row] = db(`select status, claimed_by, claimed_at from work_orders where id = ${workOrderId}`);
    const [audit] = db(
      `select count(*), max(old_values->>'claimedBy') from system_audit_logs where action = 'RECALL_WORKORDER' and entity_id = ${workOrderId}`
    );
    ledger("Recall job", `recalled ("${tt}"): status ${row?.[0]}, claimed_by ${row?.[1]}; audit ${audit?.[0]} (was held by ${audit?.[1]}, QA tech ${techId})`, "DB", /เรียกงานคืนแล้ว/.test(tt) && row?.[0] === "pending" && row?.[1] === null && row?.[2] === null && audit?.[0] === "1" && audit?.[1] === techId ? "PASS" : "FAIL", await shot(page, "recall-done"));

    // A pending order offers no recall: there is nobody to take it from.
    await page.getByRole("row").filter({ hasText: CODE }).first().click();
    await dialog.waitFor({ timeout: 10_000 });
    const offered = await dialog.getByRole("button", { name: "เรียกงานคืน" }).count();
    ledger("Recall job", `a pending order shows no เรียกงานคืน (${offered} buttons)`, "UI", offered === 0 ? "PASS" : "FAIL");

    expect(row?.[0]).toBe("pending");
    expect(row?.[1]).toBeNull();
    expect(audit?.[0]).toBe("1");
    expect(offered).toBe(0);
  });
});
