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
    {
      name: "tech",
      use: {
        ...devices["Pixel 7"],
        storageState: path.join(OUT, "auth", "tech.json"),
        // A synthetic camera, granted without a prompt, so the QR scanner's
        // camera path can run headless (tech/regressions.spec.ts).
        launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
      },
      dependencies: ["setup"],
      testMatch: /tech\/.*\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev",
    // Next dev restarts itself after any request that finds the heap above 80%
    // of its limit, and a full sweep compiles every route into one long-lived
    // server. On the default ~4 GB limit that restart landed mid-test once
    // (ERR_CONNECTION_REFUSED); a bigger old space keeps it out of the run.
    env: { NODE_OPTIONS: "--max-old-space-size=6144" },
    url: `${BASE_URL}/login`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
