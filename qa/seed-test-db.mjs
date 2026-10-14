// Build the QA test database from a JSON backup of production.
//
//   node qa/seed-test-db.mjs <backup.json>
//
// The specs were written against the seed data production carried until it
// went live on 14 Oct 2026 (Dormitory Building, Craig Yost, the 73 units...).
// That data was saved before it was cleared, as one JSON array per table
// (C:\Project\ac-maintenance-qa\backup-before-go-live-20261014.json, made with
// jsonb_agg — not in the repo, it holds real people's details). This puts it
// into QA_DATABASE_URL:
//
//   1. prisma migrate deploy against the test database;
//   2. empty every app table and load the backup's rows, parents first;
//   3. move each id sequence past the loaded rows;
//   4. strip what points outside: every account that was not seed data gets a
//      made-up name, email and phone, and photo/avatar URLs on the production
//      Blob store are cleared (those files are gone, and the server under test
//      has no token for that store anyway).
//
// Only ever the test database: qa/target-db.mjs refuses production. Then take
// a fresh snapshot (node qa/baseline.mjs snapshot) before the first sweep.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPsql } from "./psql.mjs";
import { qaDatabaseUrl } from "./target-db.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2];
if (!file) throw new Error("usage: node qa/seed-test-db.mjs <backup.json>");
const backup = JSON.parse(fs.readFileSync(file, "utf8"));
const url = qaDatabaseUrl();

// Parents before children (foreign keys). _prisma_migrations comes from step 1;
// tables the backup has and this schema does not (a branch's) are skipped.
const ORDER = [
  "users", "user_phones", "buildings", "rooms", "ac_brands", "ac_models",
  "air_conditioners", "maintenance_schedules", "work_orders", "maintenance_logs",
  "system_audit_logs", "system_settings", "email_verification_codes", "login_failures",
];

// The accounts the seed made: @example.* addresses and the seeded admin's
// .test domain. Anyone else signed up for real.
const SEEDED_EMAIL = "(email like '%@example.%' or email like '%.test')";

// 1. Schema.
const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: repo,
  env: { ...process.env, DATABASE_URL: url },
  encoding: "utf8",
  shell: true,
});
if (migrate.status !== 0) throw new Error(`prisma migrate deploy failed:\n${migrate.stdout}\n${migrate.stderr}`);
console.log("migrations applied");

// 2. Data.
const present = new Set(runPsql(url, "select table_name from information_schema.tables where table_schema = 'public'").map((r) => r[0]));
const tables = ORDER.filter((t) => present.has(t));
runPsql(url, `truncate ${tables.join(", ")} restart identity cascade`);
for (const t of tables) {
  const rows = backup.tables[t] ?? [];
  if (!rows.length) continue;
  const json = JSON.stringify(rows);
  if (json.includes("$qa$")) throw new Error(`${t}: backup contains the quoting delimiter`);
  runPsql(url, `insert into ${t} select * from jsonb_populate_recordset(null::${t}, $qa$${json}$qa$)`);
}

// 3. Sequences.
for (const t of tables) {
  const [[seq]] = runPsql(url, `select pg_get_serial_sequence('${t}', 'id')`);
  if (seq) runPsql(url, `select setval('${seq}', greatest((select coalesce(max(id), 0) from ${t}), 1))`);
}

// 4. Nothing real, nothing on the production Blob store.
runPsql(url, `
  update users set name = 'บัญชีทดสอบ ' || id, email = 'user-' || id || '@example.invalid', avatar_url = null
    where not ${SEEDED_EMAIL};
  update user_phones set phone_number = '080-000-' || lpad(id::text, 4, '0')
    where user_id in (select id from users where email like 'user-%@example.invalid');
  update users set avatar_url = null where avatar_url like '%vercel-storage.com%';
  update air_conditioners set photo_url = null where photo_url like '%vercel-storage.com%';
  update maintenance_logs set before_photo_url = null where before_photo_url like '%vercel-storage.com%';
  update maintenance_logs set after_photo_url = null where after_photo_url like '%vercel-storage.com%';
  update system_settings set overdue_sync_at = null;
`);

for (const t of tables) console.log(t, runPsql(url, `select count(*) from ${t}`)[0][0]);
