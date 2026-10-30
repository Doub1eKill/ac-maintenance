import { test, expect, expectAxeClean, openTreeRoom, treeRoom } from "../../lib";

// WCAG 2.1 A/AA on the technician pages at 375×812, as in the TTACON 2026
// evaluation of 29 Oct 2026. Fails on any critical or serious violation; the
// full axe result is saved as a11y-<page>.json in the run folder.

const PAGES = ["/tech", "/tech/my-jobs", "/tech/calendar", "/tech/assets", "/tech/profile"];

async function openPage(page: import("@playwright/test").Page, path: string) {
  await page.goto(path, { waitUntil: "load" });
  await page.locator("main").last().waitFor({ timeout: 120_000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1200);
}

test.describe("accessibility: technician pages", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const path of PAGES) {
    const name = path.slice(1).replace(/\//g, "-");
    test(`axe: ${path}`, async ({ page }) => {
      await openPage(page, path);
      await expectAxeClean(page, name, path);
    });
  }

  // The corner badge (รอล้าง / รอซ่อม) is drawn only on a unit with a pending
  // job, inside a room that starts closed — so the audit above never saw the
  // white-on-amber-500 text round 2 measured at 2.13:1 on production.
  test("axe: /tech/assets with a room of overdue units open", async ({ page }) => {
    const room = treeRoom("join work_orders w on w.air_conditioner_id = a.id and w.status = 'pending'");
    await openPage(page, "/tech/assets");
    // Waits on one of the room's own units: .biz-card alone also matches cards
    // outside the tree, which are showing before anything is opened.
    const card = page.locator("main").last().locator(".biz-card").filter({ hasText: room.acCode }).first();
    await openTreeRoom(page, room, card);
    await expect(card.locator("div.absolute").filter({ hasText: /รอล้าง|รอซ่อม/ })).toBeVisible();
    await expectAxeClean(page, "tech-assets-overdue-open", `/tech/assets, room ${room.room} open, overdue badge on ${room.acCode}`);
  });
});
