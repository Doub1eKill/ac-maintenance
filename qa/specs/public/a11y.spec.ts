import { test, expect, db, expectAxeClean } from "../../lib";

// WCAG 2.1 A/AA on the public pages, on a phone-sized viewport (375×812) as in
// the TTACON 2026 evaluation of 29 Oct 2026. Fails on any critical or serious
// violation; the full axe result is saved as a11y-<page>.json in the run folder.

const qrCode = () => db("select qr_code from air_conditioners where deleted_at is null order by id limit 1")[0]?.[0];

const PAGES: Array<[string, () => string, string]> = [
  ["login", () => "/login", "form"],
  ["register", () => "/register", "form"],
  ["qr", () => `/qr/${qrCode()}`, "body"],
];

async function openPage(page: import("@playwright/test").Page, path: string, ready: string) {
  await page.goto(path, { waitUntil: "load" });
  await page.locator(ready).first().waitFor({ timeout: 90_000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(800);
}

test.describe("accessibility: public pages", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const [name, path, ready] of PAGES) {
    test(`axe: ${name}`, async ({ page }) => {
      await openPage(page, path(), ready);
      await expectAxeClean(page, `public-${name}`, name);
    });
  }
});

// The auth pages' left-hand panel is `hidden lg:flex`: a phone never shows it,
// so the audit above cannot see the grey text round 2 found at 4.23:1 there
// (and that held Lighthouse's desktop accessibility score at 96).
test.describe("accessibility: auth pages on a desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const [name, path] of [["login", "/login"], ["register", "/register"]] as const) {
    test(`axe: ${name} at 1280×800`, async ({ page }) => {
      await openPage(page, path, "form");
      await expect(page.getByText("Enterprise Utility Platform")).toBeVisible();
      await expectAxeClean(page, `public-${name}-1280`, `${name} at 1280×800`);
    });
  }
});
