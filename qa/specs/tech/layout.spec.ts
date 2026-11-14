import { test, expectHeaderFits } from "../../lib";

// The header on a phone: one row, nothing off screen, no sideways scroll, at
// the two widths the README screenshots were taken at (14 Nov 2026).

const PAGES = ["/tech", "/tech/my-jobs", "/tech/assets", "/tech/catalogue", "/tech/calendar", "/tech/profile"];

test.describe("layout: technician header on a phone", () => {
  for (const width of [360, 390]) {
    for (const path of PAGES) {
      test(`header fits: ${path} at ${width}px`, async ({ page }) => {
        await expectHeaderFits(page, path, width);
      });
    }
  }
});
