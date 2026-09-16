import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// See qa/lib.ts: anything written inside the repo makes Next dev reload the page.
const OUT = process.env.QA_OUT ?? path.resolve(__dirname, "..", "..", "ac-maintenance-qa");
// Where the app under test is. Defaults to the dev server's own port; set it
// (with QA_OUT) to sweep a second checkout — the PostgreSQL worktree on :3001
// — while the MariaDB one keeps :3000.
const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./specs",
  outputDir: path.join(OUT, "artifacts"),
  timeout: 180_000, // Next dev compiles on first hit; /admin took >45s cold in this run
  expect: { timeout: 10_000 },
  fullyParallel: false, // shared database — parallel runs create phantom failures
  workers: 1,
  reporter: [["list"], ["json", { outputFile: path.join(OUT, "artifacts", "results.json") }]],
  use: {
    baseURL: BASE_URL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "public", use: { ...devices["Desktop Chrome"] }, testMatch: /public\/.*\.spec\.ts/, dependencies: ["setup"] },
    { name: "admin", use: { ...devices["Desktop Chrome"], storageState: path.join(OUT, "auth", "admin.json") }, dependencies: ["setup"], testMatch: /admin\/.*\.spec\.ts/ },
    // The tech specs claim and close the QA work order that the admin specs
    // create through the forms. Rather than remembering to run those two admin
    // tests by hand first (and not to restore the database in between), the
    // tech project depends on this slice of the admin one. Both tests cope with
    // the rows already being there, so running admin and then tech is fine too.
    // Like setup, a dependency project ignores the command line's --grep.
    {
      name: "admin-seed",
      use: { ...devices["Desktop Chrome"], storageState: path.join(OUT, "auth", "admin.json") },
      dependencies: ["setup"],
      testMatch: /admin\/workflows\.spec\.ts/,
      grep: /assets: create building|work order: create for the QA unit/,
    },
    {
      name: "tech",
      use: {
        ...devices["Pixel 7"],
        storageState: path.join(OUT, "auth", "tech.json"),
        // A synthetic camera, granted without a prompt, so the QR scanner's
        // camera path can run headless (tech/regressions.spec.ts).
        launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
      },
      dependencies: ["setup", "admin-seed"],
      testMatch: /tech\/.*\.spec\.ts/,
    },
  ],
  webServer: {
    // The 6 GB heap Next dev needs for a full sweep is part of the dev script
    // itself (see package.json), so a server someone already started by hand or
    // from the editor is the same server this would start.
    command: "npm run dev",
    url: `${BASE_URL}/login`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
