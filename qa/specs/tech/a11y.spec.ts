import { test, expect, ledger, axeAudit } from "../../lib";

// WCAG 2.1 A/AA on the technician pages at 375×812, as in the TTACON 2026
// evaluation of 29 Oct 2026. Fails on any critical or serious violation; the
// full axe result is saved as a11y-<page>.json in the run folder.

const PAGES = ["/tech", "/tech/my-jobs", "/tech/calendar", "/tech/assets", "/tech/profile"];

test.describe("accessibility: technician pages", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const path of PAGES) {
    const name = path.slice(1).replace(/\//g, "-");
    test(`axe: ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "load" });
      await page.locator("main").last().waitFor({ timeout: 120_000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1200);
      const { counts, artifact } = await axeAudit(page, name);
      const bad = counts.critical + counts.serious;
      ledger("Accessibility", `${path}: passes ${counts.passes}, violations ${counts.violations} (critical ${counts.critical}, serious ${counts.serious}) ${counts.rules.join(" ")}`, "UI", bad === 0 ? "PASS" : "FAIL", artifact);
      expect(counts.rules.filter((r) => /\((critical|serious),/.test(r))).toEqual([]);
    });
  }
});
