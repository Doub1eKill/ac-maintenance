// The database the QA harness reads, writes and restores — never production.
//
// Until 14 Oct 2026 the harness used DATABASE_URL, which was the Aiven database
// production runs on, and lived with that by snapshotting before a sweep and
// restoring after. Production holds real data now, and restore deletes every
// row whose id is past the snapshot, so pointing the harness at it would wipe
// real records. The harness reads QA_DATABASE_URL instead: from the
// environment, or from the repo's .env. The app server Playwright starts is
// given the same URL as its DATABASE_URL (qa/playwright.config.ts).
//
// Refused outright: no URL, a URL on Aiven, or the URL in DATABASE_URL. Never
// logged.
import fs from "node:fs";
import path from "node:path";

// The repo root, found from the working directory rather than import.meta:
// Playwright loads this file through its CommonJS transform (from the config
// and lib.ts), which cannot carry import.meta — psql.mjs avoids it the same way.
function repoRoot() {
  let dir = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(dir, "qa", "target-db.mjs"))) return dir;
    const up = path.dirname(dir);
    if (up === dir) throw new Error("run the QA harness from inside the ac-maintenance repo");
    dir = up;
  }
}

function fromDotEnv(name) {
  try {
    const text = fs.readFileSync(path.join(repoRoot(), ".env"), "utf8");
    return text.match(new RegExp(`^${name}="?(postgres(?:ql)?:\\/\\/[^"\\r\\n]+)"?`, "m"))?.[1] ?? null;
  } catch {
    return null;
  }
}

/** The test database's postgres:// URL. Throws rather than fall back to anything else. */
export function qaDatabaseUrl() {
  const url = process.env.QA_DATABASE_URL || fromDotEnv("QA_DATABASE_URL");
  if (!url) {
    throw new Error("QA_DATABASE_URL is not set (environment or .env) — the harness will not run against production");
  }
  const production = process.env.DATABASE_URL || fromDotEnv("DATABASE_URL");
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("QA_DATABASE_URL is not a valid URL");
  }
  if (/aivencloud\.com$/i.test(host) || url === production) {
    throw new Error("QA_DATABASE_URL points at the production database — refusing");
  }
  return url;
}
