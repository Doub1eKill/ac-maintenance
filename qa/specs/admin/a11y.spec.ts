import { test, expect, expectAxeClean, openTreeRoom, treeRoom } from "../../lib";

// WCAG 2.1 A/AA on every admin page at 1280×800, as in the TTACON 2026
// evaluation of 29 Oct 2026. Fails on any critical or serious violation; the
// full axe result is saved as a11y-<page>.json in the run folder.

const PAGES = ["/admin", "/admin/work-orders", "/admin/assets", "/admin/calendar", "/admin/qr-codes", "/admin/approvals", "/admin/team", "/admin/settings", "/admin/profile"];

// The pages round 2 (30 Oct 2026) measured in dark mode, where the -700 text
// colours of round 1 and the dark status tokens fell under 4.5:1.
const DARK_PAGES = ["/admin", "/admin/work-orders", "/admin/assets"];

const PENDING_JOB = "join work_orders w on w.air_conditioner_id = a.id and w.status = 'pending'";

async function openPage(page: import("@playwright/test").Page, path: string) {
  await page.goto(path, { waitUntil: "load" });
  await page.locator("main").last().waitFor({ timeout: 120_000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1200);
}

test.describe("accessibility: admin pages", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const path of PAGES) {
    const name = path.slice(1).replace(/\//g, "-");
    test(`axe: ${path}`, async ({ page }) => {
      await openPage(page, path);
      await expectAxeClean(page, name, path);
    });
  }

  // Rooms start closed, so the audit above never sees the per-unit checkboxes
  // that round 2 found unlabelled (axe label/critical ×10 on production).
  test("axe: /admin/qr-codes with a room's unit table open", async ({ page }) => {
    const room = treeRoom();
    await openPage(page, "/admin/qr-codes");
    const boxes = page.locator("main").last().locator("table tbody input[type=checkbox]");
    await openTreeRoom(page, room, boxes.first());
    // Every row's box is named after its unit, not just present.
    const codes = await page.locator("main").last().locator("table tbody tr td:nth-child(2) .font-mono").allTextContents();
    expect(codes.length).toBeGreaterThan(0);
    for (const code of codes) await expect(page.getByRole("checkbox", { name: `เลือก ${code}`, exact: true })).toHaveCount(1);
    await expectAxeClean(page, "admin-qr-codes-open", `/admin/qr-codes, room ${room.room} open (${codes.length} units)`);
  });
});

test.describe("accessibility: admin pages, dark mode", () => {
  test.use({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });

  for (const path of DARK_PAGES) {
    const name = `${path.slice(1).replace(/\//g, "-")}-dark`;
    test(`axe: ${path} (dark)`, async ({ page }) => {
      await openPage(page, path);
      // next-themes follows the system setting; make sure it did.
      await expect(page.locator("html")).toHaveClass(/\bdark\b/);
      let label = `${path} (dark)`;
      if (path === "/admin/assets") {
        // Production has one building with one room, which opens by itself and
        // shows its units' status badges; the test database has several, all
        // closed. Open a floor holding units with a pending job to match.
        const room = treeRoom(PENDING_JOB);
        await openTreeRoom(page, room, page.locator("main").last().getByText(room.acCode, { exact: true }).first(), { rooms: false });
        label += `, floor of room ${room.room} open`;
      }
      await expectAxeClean(page, name, label);
    });
  }
});
