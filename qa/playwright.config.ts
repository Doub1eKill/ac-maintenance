import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// See qa/lib.ts: anything written inside the repo makes Next dev reload the page.
const OUT = process.env.QA_OUT ?? path.resolve(__dirname, "..", "..", "ac-maintenance-qa");

export default defineConfig({
  testDir: "./specs",
  outputDir: path.join(OUT, "artifacts"),
  timeout: 180_000, // Next dev compiles on first hit; /admin took >45s cold in this run
  expect: { timeout: 10_000 },
  fullyParallel: false, // shared database — parallel runs create phantom failures
  workers: 1,
  reporter: [["list"], ["json", { outputFile: path.join(OUT, "artifacts", "results.json") }]],
  use: {
    baseURL: "http://localhost:3000",
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
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
