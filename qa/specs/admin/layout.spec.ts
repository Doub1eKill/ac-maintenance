import { test, expect, db, ledger, shot, expectHeaderFits, openTreeRoom, treeRoom } from "../../lib";

// The header on a phone: the admin pages share it with the technician's, and
// their button ("สร้างใบงานซ่อมบำรุง") is the longer one (14 Nov 2026).

const PAGES = ["/admin", "/admin/work-orders", "/admin/assets", "/admin/calendar", "/admin/qr-codes", "/admin/approvals", "/admin/team", "/admin/settings", "/admin/profile"];

test.describe("layout: admin header on a phone", () => {
  for (const width of [360, 390]) {
    for (const path of PAGES) {
      test(`header fits: ${path} at ${width}px`, async ({ page }) => {
        await expectHeaderFits(page, path, width);
      });
    }
  }

  test("header keeps its full button on a desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/admin", { waitUntil: "load" });
    await page.locator("main").last().waitFor({ timeout: 120_000 });
    await expect(page.locator("header").getByText("สร้างใบงานซ่อมบำรุง", { exact: true })).toBeVisible();
  });
});

// The unit cards printed the raw enum (normal / needs_cleaning / broken), all
// in the success colours. Each status now has its Thai name and its own tone.
test("assets: unit status badges are in Thai, one colour per status", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  // A floor holding units in more than one status, on page 1 of the list.
  const room = treeRoom("join air_conditioners a2 on a2.room_id = r.id and a2.deleted_at is null and a2.status <> a.status");
  await page.goto("/admin/assets", { waitUntil: "load" });
  await page.locator("main").last().waitFor({ timeout: 120_000 });
  const main = page.locator("main").last();
  await openTreeRoom(page, room, main.getByText(room.acCode, { exact: true }).first(), { rooms: false });

  const statuses = Object.fromEntries(db(`select a.ac_code, a.status from air_conditioners a join rooms r on r.id = a.room_id join buildings b on b.id = r.building_id where b.name = '${room.building.replace(/'/g, "''")}' and r.floor ${room.floor === null ? "is null" : `= ${room.floor}`} and a.deleted_at is null`).map(([c, s]) => [c!, s!]));
  const label = { normal: "ปกติ", needs_cleaning: "รอล้าง", broken: "รอซ่อม" } as Record<string, string>;
  const toneOf = new Map<string, string>();
  for (const [code, status] of Object.entries(statuses)) {
    const badge = main.getByText(code, { exact: true }).locator("xpath=ancestor::div[contains(@class, 'justify-between')][1]").locator("span.rounded-md.border");
    await expect(badge).toHaveText(label[status]);
    toneOf.set(status, (await badge.getAttribute("class"))!.split(" ").filter((c) => /^(bg|text)-/.test(c)).sort().join(" "));
  }
  const tones = new Set(toneOf.values());
  ledger("Assets", `status badges on floor of ${room.room}: ${[...toneOf].map(([s, t]) => `${s}→${label[s]} (${t})`).join("; ")}`, "UI", tones.size === toneOf.size ? "PASS" : "FAIL", await shot(page, "assets-status-badges"));
  expect(toneOf.size).toBeGreaterThan(1);
  expect(tones.size).toBe(toneOf.size);
});
