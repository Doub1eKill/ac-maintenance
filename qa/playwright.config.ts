import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { qaDatabaseUrl } from "./target-db.mjs";

// See qa/lib.ts: anything written inside the repo makes Next dev reload the page.
const OUT = process.env.QA_OUT ?? path.resolve(__dirname, "..", "..", "ac-maintenance-qa");
// Where the app under test is. Defaults to the dev server's own port; set it
// (with QA_OUT) to sweep a server running somewhere else.
const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3000";
// Pinned here, once, so every worker writes to the same runs/<id> folder (each
// used to stamp its own from the clock when qa/lib.ts loaded), and so the
// traces of a run live under artifacts/<id> where the next run cannot wipe them.
process.env.QA_RUN ??= new Date().toISOString().replace(/[-:T]/g, "").slice(0, 13);
const RUN = process.env.QA_RUN;
// "start" (a production build) or "dev"; read by the specs too, so pinned here.
process.env.QA_SERVER ??= "start";
const QA_SERVER = process.env.QA_SERVER;

export default defineConfig({
  testDir: "./specs",
  outputDir: path.join(OUT, "artifacts", RUN),
  timeout: 180_000, // Next dev compiles on first hit; /admin took >45s cold in this run
  expect: { timeout: 10_000 },
  fullyParallel: false, // shared database — parallel runs create phantom failures
  workers: 1,
  reporter: [["list"], ["json", { outputFile: path.join(OUT, "artifacts", RUN, "results.json") }]],
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
    // A production build by default, not `next dev`. Under dev, once the admin
    // pages had been visited, /tech reloaded itself every half second: its RSC
    // named src/app/admin/error.tsx, which /tech's chunks do not carry, and
    // React Refresh's runtime answers a missing module factory with
    // document.location.reload() (QA full-20261003; traced in HANDOFF.md). That
    // runtime does not exist in a build, and a build is what Vercel serves.
    // QA_SERVER=dev sweeps the dev server instead — which a server someone
    // already started on the port still is, since an existing one is reused.
    //
    // A build lacks two dev-only crutches the setup leaned on: the demo-role
    // login (auth.setup.ts approves the QA admin through SQL there) and the
    // registration MX check being off (lifted by EMAIL_MX_CHECK=off, which only
    // this command sets). AUTH_TRUST_HOST because Auth.js trusts the request's
    // host only in development or on Vercel.
    command: QA_SERVER === "dev" ? "npm run dev" : "npm run build && npm run start",
    url: `${BASE_URL}/login`,
    // Never reuse: a server someone already started on the port reads .env,
    // i.e. production's database and Blob store, while the specs' own SQL goes
    // to the test database. Playwright stops if the port is taken.
    reuseExistingServer: false,
    timeout: QA_SERVER === "dev" ? 180_000 : 900_000,
    // MAIL_SUPPRESS_DOMAINS on both: the QA accounts' domains do not exist,
    // so each code mailed to them bounced into the sending inbox; the specs
    // plant their codes in the database (plantEmailCode) and never read mail.
    env: {
      // The test database, not .env's (qa/target-db.mjs refuses production);
      // set in the environment, which Next does not let .env override. No Blob
      // token either: .env.local's store is production's, so uploads stay in
      // public/uploads, where baseline restore cleans them up. No CA: .env's is
      // Aiven's, and with one set lib/prisma.ts insists on TLS, which a local
      // test database does not speak.
      DATABASE_URL: qaDatabaseUrl(),
      DATABASE_CA_CERT: "",
      BLOB_READ_WRITE_TOKEN: "",
      MAIL_SUPPRESS_DOMAINS: "qa-run.ac.th,example.invalid",
      // Lets public/regressions.spec.ts call the cron route as Vercel would.
      // Local only; the real secret lives in the Vercel project settings.
      CRON_SECRET: "qa-cron-secret",
      ...(QA_SERVER === "dev" ? {} : { AUTH_TRUST_HOST: "true", EMAIL_MX_CHECK: "off" }),
    },
    // Into the sweep's own output, prefixed [WebServer]: a server action that
    // fails reports only a generic toast to the page, and the console.error
    // naming the real cause is otherwise lost with the terminal. (Nothing is
    // captured when an already-running server is reused.)
    stdout: "pipe",
    stderr: "pipe",
  },
});
