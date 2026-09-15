// Copy every application table from the MariaDB database into the PostgreSQL
// one, so the QA baseline (users 5 · acs 73 · logs 230 · WO 62 …) exists on
// both engines and the same sweep can run against either.
//
//   node qa/copy-mariadb-to-postgres.mjs
//
// Source: the mysql client and flags qa/baseline.mjs uses (QA_MYSQL to
// override). Target: the PostgreSQL DATABASE_URL in the repo's .env (QA_PSQL
// for the psql binary). Neither URL is printed.
//
// The PostgreSQL tables are truncated first — this replaces, never merges.
// The schema there must already be migrated (`prisma migrate deploy`); this
// copies rows, not tables. Column names are identical on both sides (Prisma's
// @map names), only their order differs, so each table is read from MariaDB
// in PostgreSQL's column order and streamed straight into COPY.
//
// Why this works with no per-value conversion: mysql's batch output escapes
// tab, newline and backslash exactly the way COPY's text format reads them
// (\t \n \\), prints NULL as the word NULL (COPY is told so), 0/1 for
// tinyint booleans (accepted by boolean), and JSON columns as their text.
// Timestamps carry no zone on either side, and Prisma wrote UTC to both.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");

const MYSQL = (process.env.QA_MYSQL ?? "C:\\xampp\\mysql\\bin\\mysql.exe -h 127.0.0.1 -P 3306 -u root ac_maintenance").split(" ");
const PSQL = process.env.QA_PSQL ?? "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe";

function postgresUrl() {
  const env = fs.readFileSync(path.join(repo, ".env"), "utf8");
  const m = env.match(/^DATABASE_URL="?(postgres(?:ql)?:\/\/[^"\r\n]+)"?/m);
  if (!m) throw new Error(".env: DATABASE_URL is not a postgres:// URL — switch it to the PostgreSQL line first");
  return m[1];
}

function mysql(query) {
  const r = spawnSync(MYSQL[0], [...MYSQL.slice(1), "--default-character-set=utf8mb4", "-N", "-B"], { input: query, encoding: "utf8" });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`mysql exited ${r.status}: ${r.stderr}`);
  return r.stdout;
}

function psql(url, script) {
  const r = spawnSync(PSQL, ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", url], {
    input: script,
    encoding: "utf8",
    env: { ...process.env, PGCLIENTENCODING: "UTF8" },
  });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`psql exited ${r.status}: ${r.stderr}`);
  return r.stdout;
}

// Parents before children, so each COPY finds the rows its foreign keys need.
const TABLES = [
  "users",
  "user_phones",
  "buildings",
  "rooms",
  "ac_brands",
  "ac_models",
  "air_conditioners",
  "maintenance_schedules",
  "work_orders",
  "maintenance_logs",
  "system_audit_logs",
  "system_settings",
];

const url = postgresUrl();

const columns = {};
for (const line of psql(url, `select table_name, string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name in (${TABLES.map((t) => `'${t}'`).join(",")}) group by 1;`).split(/\r?\n/)) {
  if (!line) continue;
  const [table, cols] = line.split("|");
  columns[table] = cols.split(",");
}
for (const t of TABLES) if (!columns[t]) throw new Error(`PostgreSQL has no table ${t} — run prisma migrate deploy first`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ac-copy-"));
const script = [`truncate ${TABLES.join(", ")} restart identity cascade;`];
for (const t of TABLES) {
  const cols = columns[t];
  const tsv = mysql(`select ${cols.join(", ")} from ${t}`);
  const file = path.join(tmp, `${t}.tsv`);
  fs.writeFileSync(file, tsv, "utf8");
  // \copy runs client-side, so the file is read by psql from this machine.
  // Forward slashes: psql on Windows takes them, and backslashes would be
  // read as escapes inside the quoted path.
  script.push(`\\copy ${t} (${cols.join(", ")}) from '${file.replace(/\\/g, "/")}' with (format text, null 'NULL')`);
  // Bring the sequence past the copied ids, or the next insert reuses one.
  if (cols.includes("id") && t !== "system_settings") {
    script.push(`do $$ begin perform setval(pg_get_serial_sequence('${t}', 'id'), coalesce((select max(id) from ${t}), 0) + 1, false); end $$;`);
  }
}
script.push(
  `select 'users ' || (select count(*) from users) || ' · phones ' || (select count(*) from user_phones) || ' · buildings ' || (select count(*) from buildings) || ' · rooms ' || (select count(*) from rooms) || ' · acs ' || (select count(*) from air_conditioners) || ' · brands ' || (select count(*) from ac_brands) || ' · models ' || (select count(*) from ac_models) || ' · logs ' || (select count(*) from maintenance_logs) || ' · WO ' || (select count(*) from work_orders) || ' · schedules ' || (select count(*) from maintenance_schedules) || ' · audit max ' || (select max(id) from system_audit_logs) || ' · pending ' || (select count(*) from users where status = 'pending');`
);

try {
  process.stdout.write(psql(url, script.join("\n")));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
