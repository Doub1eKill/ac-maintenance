// Finding the psql binary, and running a query through it.
//
// Both callers — qa/baseline.mjs (plain node) and qa/lib.ts (Playwright's TS)
// — had their own copy of the path and the spawn. The path was pinned to
// PostgreSQL 16, which is not what every machine has: on a box with 17
// installed the whole harness stopped at "spawnSync ENOENT" before a single
// query ran. Shared here so the next version bump is one edit rather than two
// that can drift apart.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const WINDOWS_ROOT = "C:\\Program Files\\PostgreSQL";

/**
 * The psql to use: QA_PSQL if set, else the newest version the Windows
 * installer has put down, else whatever is on PATH.
 *
 * Newest first rather than a pinned version — the client is backwards
 * compatible with older servers, so a newer psql than Aiven's server is fine,
 * and pinning is what broke this in the first place.
 */
export function resolvePsql() {
  if (process.env.QA_PSQL) return process.env.QA_PSQL;

  try {
    const versions = fs
      .readdirSync(WINDOWS_ROOT)
      .map((name) => Number(name))
      .filter((n) => Number.isInteger(n) && n > 0)
      .sort((a, b) => b - a);

    for (const version of versions) {
      const candidate = path.join(WINDOWS_ROOT, String(version), "bin", "psql.exe");
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch {
    // No such directory — not a Windows installer layout. Fall through to PATH.
  }

  return "psql";
}

/**
 * Runs one query and returns its rows as arrays of strings, NULL as null.
 *
 * Fed on stdin rather than -e: a restore is a few hundred UPDATEs, well past
 * what a Windows command line can carry. No headers, one row per line,
 * tab-separated, NULL spelt out (psql prints it as an empty string unless
 * told otherwise).
 *
 * Never logs the query or the URL — including when the spawn itself fails.
 * Node puts the entire argv on a spawn error, and the argv holds the
 * connection string, password and all; letting that one through printed the
 * Aiven credentials to the console the first time psql was missing. The error
 * raised here names the binary it tried and nothing else.
 */
export function runPsql(url, query) {
  const bin = resolvePsql();

  const result = spawnSync(
    bin,
    ["-X", "-q", "-At", "-F", "\t", "-P", "null=NULL", "-v", "ON_ERROR_STOP=1", "-d", url],
    { input: query, encoding: "utf8", env: { ...process.env, PGCLIENTENCODING: "UTF8" } }
  );

  if (result.error) {
    const code = /** @type {NodeJS.ErrnoException} */ (result.error).code;
    throw new Error(
      code === "ENOENT"
        ? `psql not found at ${bin} — install the PostgreSQL client tools, or set QA_PSQL to the full path of psql.exe`
        : `could not run psql at ${bin} (${code ?? "unknown error"})`
    );
  }
  if (result.status !== 0) {
    throw new Error(`psql exited ${result.status}: ${result.stderr || result.stdout}`);
  }

  return result.stdout
    .split(/\r?\n/)
    .filter((line) => line.length)
    .map((line) => line.split("\t").map((value) => (value === "NULL" ? null : value)));
}
