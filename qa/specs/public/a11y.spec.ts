import { test, expect, ledger, db, axeAudit } from "../../lib";

// WCAG 2.1 A/AA on the public pages, on a phone-sized viewport (375×812) as in
// the TTACON 2026 evaluation of 29 Oct 2026. Fails on any critical or serious
// violation; the full axe result is saved as a11y-<page>.json in the run folder.

const qrCode = () => db("select qr_code from air_conditioners where deleted_at is null order by id limit 1")[0]?.[0];

const PAGES: Array<[string, () => string, string]> = [
  ["login", () => "/login", "form"],
  ["register", () => "/register", "form"],
  ["qr", () => `/qr/${qrCode()}`, "body"],
];

test.describe("accessibility: public pages", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const [name, path, ready] of PAGES) {
    test(`axe: ${name}`, async ({ page }) => {
      await page.goto(path(), { waitUntil: "load" });
      await page.locator(ready).first().waitFor({ timeout: 90_000 });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(800);
      const { counts, artifact } = await axeAudit(page, `public-${name}`);
      const bad = counts.critical + counts.serious;
      ledger("Accessibility", `${name}: passes ${counts.passes}, violations ${counts.violations} (critical ${counts.critical}, serious ${counts.serious}) ${counts.rules.join(" ")}`, "UI", bad === 0 ? "PASS" : "FAIL", artifact);
      expect(counts.rules.filter((r) => /\((critical|serious),/.test(r))).toEqual([]);
    });
  }
});
