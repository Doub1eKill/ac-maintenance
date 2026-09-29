// Snapshot and restore the database baseline around a QA run.
//
//   node qa/baseline.mjs snapshot   # before a run: record what "clean" looks like
//   node qa/baseline.mjs restore    # after a run: put it back
//   node qa/baseline.mjs check      # print the counts the project rules quote
//
// The rule is that every test that writes to the database leaves it exactly as
// it found it (users 5 · phones 7 · buildings 5 · rooms 32 · acs 73 · brands 5 ·
// models 189 · logs 230 · WO 62 · schedules 73 · audit max 34 · pending 0).
// Run 20260913-1742 did that by hand, table by table, and it took longer than
// the sweep. This does the same thing mechanically:
//
//   - rows the run inserted are recognised by id: every table here has an
//     auto-increment id, so anything above the snapshot's max is the run's;
//   - rows the run changed in place (a unit marked broken by a new order, an
//     avatar replaced, a brand renamed, a schedule advanced by a logged visit)
//     are put back from the snapshot's copy of the few mutable columns;
//   - files the run added under public/uploads are removed — and, when a
//     BLOB_READ_WRITE_TOKEN is in .env.local (the app then stores photos on
//     Vercel Blob instead, see lib/upload.ts), blobs the run added are too.
//
// Nothing here runs the Prisma seed — that wipes the restored data. The
// snapshot lives outside the repo (next to the run output), because a file
// written inside it makes Next dev reload every open page.
//
// Connection: statements go through psql (QA_PSQL for the binary) to the
// postgres:// DATABASE_URL in the repo's .env — since 17 September that is the
// Aiven database production runs on, so a sweep writes into the same rows the
// owner is testing against; snapshot before, restore after, and do not run two
// sweeps at once. The URL is passed to psql as an argument and never printed.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPsql } from "./psql.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const OUT = process.env.QA_OUT ?? path.resolve(repo, "..", "ac-maintenance-qa");
const SNAPSHOT = path.join(OUT, "baseline.json");
const UPLOADS = path.join(repo, "public", "uploads");

// Same rule as the app: a token means uploads went to Vercel Blob. Read from
// the environment or the repo's .env.local, the file the dev server reads it
// from. Never logged.
const BLOB_TOKEN = (() => {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  try {
    return fs.readFileSync(path.join(repo, ".env.local"), "utf8").match(/^BLOB_READ_WRITE_TOKEN="?([^"\r\n]+)"?/m)?.[1] ?? null;
  } catch {
    return null;
  }
})();
const BLOB_PREFIX = "uploads/";

/** Pathnames of every blob the app has stored, or null when there is no token. */
async function listBlobs() {
  if (!BLOB_TOKEN) return null;
  const { list } = await import("@vercel/blob");
  const names = [];
  let cursor;
  do {
    const page = await list({ prefix: BLOB_PREFIX, cursor, token: BLOB_TOKEN });
    for (const b of page.blobs) names.push(b.pathname);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return names;
}

// The postgres:// DATABASE_URL from the repo's .env. Read once; kept in a
// closure, never logged.
const POSTGRES_URL = (() => {
  try {
    return fs.readFileSync(path.join(repo, ".env"), "utf8").match(/^DATABASE_URL="?(postgres(?:ql)?:\/\/[^"\r\n]+)"?/m)?.[1] ?? null;
  } catch {
    return null;
  }
})();
if (!POSTGRES_URL) throw new Error("no postgres:// DATABASE_URL in .env — the harness only knows PostgreSQL now");

// Binary resolution, the spawn and the row parsing all live in psql.mjs now —
// see the note there about the pinned version and the leaked argv.
function sql(query) {
  return runPsql(POSTGRES_URL, query);
}

// Tables the run can only ever add to, deepest child first so the deletes
// below never trip a foreign key. Everything with an auto-increment id.
const GROWTH_TABLES = [
  "system_audit_logs",
  "maintenance_logs",
  "work_orders",
  "maintenance_schedules",
  "air_conditioners",
  "rooms",
  "buildings",
  "user_phones",
  "users",
  "ac_models",
  "ac_brands",
];

// The columns a run changes on rows that already existed. Restored verbatim.
const MUTABLE = {
  air_conditioners: ["status", "btu", "ac_brand_id", "ac_model_id", "brand", "model", "photo_url", "deleted_at"],
  users: ["status", "name", "avatar_url", "password"],
  // user_id is carried too, so a row the run replaced (see REINSERT) can be
  // put back whole.
  user_phones: ["user_id", "phone_number", "is_primary"],
  ac_brands: ["name", "deleted_at"],
  ac_models: ["name", "default_btu", "deleted_at"],
  maintenance_schedules: ["last_performed_at", "next_due_date", "is_active", "frequency_value", "frequency_unit"],
  work_orders: ["status", "claimed_by", "claimed_at", "completed_at", "priority", "resolution_notes", "assigned_to_id", "assigned_at"],
  rooms: ["name", "floor"],
  buildings: ["name", "abbreviation"],
  system_settings: ["default_frequency_value", "default_frequency_unit", "organisation_name", "organisation_address", "organisation_phone"],
};

// Tables where a run can make a baseline row vanish rather than change it:
// saving a profile deletes the primary phone row and inserts a fresh one
// (lib/admin/profile.ts), and the fresh one has a new id, which the delete
// step below then removes. Restored by re-inserting the snapshot's row under
// its original id when that id is gone. Only listed for tables whose snapshot
// columns are enough to rebuild the row.
const REINSERT = ["user_phones"];

const COUNTS = `select
  (select count(*) from users),(select count(*) from user_phones),(select count(*) from buildings),
  (select count(*) from rooms),(select count(*) from air_conditioners),(select count(*) from ac_brands),
  (select count(*) from ac_models),(select count(*) from maintenance_logs),(select count(*) from work_orders),
  (select count(*) from maintenance_schedules),(select max(id) from system_audit_logs),
  (select count(*) from users where status='pending')`;
const COUNT_LABELS = ["users", "phones", "buildings", "rooms", "acs", "brands", "models", "logs", "WO", "schedules", "audit max", "pending"];

function check() {
  const [row] = sql(COUNTS);
  console.log(COUNT_LABELS.map((l, i) => `${l} ${row[i]}`).join(" · "));
  return row;
}

async function snapshot() {
  const maxIds = Object.fromEntries(GROWTH_TABLES.map((t) => [t, Number(sql(`select coalesce(max(id),0) from ${t}`)[0][0])]));
  const rows = {};
  for (const [table, cols] of Object.entries(MUTABLE)) {
    rows[table] = sql(`select id, ${cols.join(", ")} from ${table}`);
  }
  const uploads = fs.existsSync(UPLOADS) ? fs.readdirSync(UPLOADS) : [];
  const blobs = await listBlobs();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(SNAPSHOT, JSON.stringify({ takenAt: new Date().toISOString(), maxIds, rows, uploads, blobs }, null, 1));
  console.log(`snapshot → ${SNAPSHOT}`);
  check();
}

function quote(v) {
  if (v === null) return "NULL";
  // PostgreSQL (standard_conforming_strings, the default) takes a backslash
  // literally and only doubles the quote.
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function restore() {
  if (!fs.existsSync(SNAPSHOT)) throw new Error(`no snapshot at ${SNAPSHOT} — run "snapshot" before the sweep`);
  const snap = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));

  // Changed rows are put back before the added rows are deleted, in that
  // order on purpose: a baseline row can still point at a run's row (a work
  // order claimed by a QA technician, a unit moved onto a QA brand), and the
  // foreign keys on those columns are RESTRICT. Restoring first takes the
  // reference away, so the delete never meets it. PostgreSQL has no session
  // switch for foreign keys and Prisma's constraints are not deferrable.
  const statements = [];

  // 1. Rows the run changed. One UPDATE per row; the tables are small.
  for (const [table, cols] of Object.entries(MUTABLE)) {
    for (const row of snap.rows[table]) {
      const [id, ...values] = row;
      const sets = cols.map((c, i) => `${c} = ${quote(values[i])}`).join(", ");
      statements.push(`update ${table} set ${sets} where id = ${id}`);
    }
  }

  // 2. Rows the run added, deepest child first.
  for (const t of GROWTH_TABLES) statements.push(`delete from ${t} where id > ${snap.maxIds[t]}`);

  // 3. Baseline rows the run replaced with new ones (now deleted above).
  for (const table of REINSERT) {
    const cols = MUTABLE[table];
    for (const row of snap.rows[table]) {
      const [id, ...values] = row;
      const names = ["id", ...cols].join(", ");
      const vals = [id, ...values.map(quote)].join(", ");
      statements.push(
        `insert into ${table} (${names}) select ${vals} where not exists (select 1 from ${table} where id = ${id})`
      );
    }
  }

  sql(statements.join(";\n") + ";");

  // 4. Files the run added.
  let removed = 0;
  if (fs.existsSync(UPLOADS)) {
    const keep = new Set(snap.uploads);
    for (const f of fs.readdirSync(UPLOADS)) {
      if (!keep.has(f)) {
        fs.rmSync(path.join(UPLOADS, f));
        removed += 1;
      }
    }
  }

  // 5. Blobs the run added. Only when the token is present now; a snapshot
  // taken without one (blobs: null) has nothing to compare against, and the
  // store is left alone rather than emptied.
  let removedBlobs = 0;
  if (BLOB_TOKEN && Array.isArray(snap.blobs)) {
    const keep = new Set(snap.blobs);
    const extra = (await listBlobs()).filter((name) => !keep.has(name));
    if (extra.length) {
      const { del } = await import("@vercel/blob");
      // del takes URLs or pathnames; pathnames are what the snapshot holds.
      await del(extra, { token: BLOB_TOKEN });
      removedBlobs = extra.length;
    }
  }
  console.log(`restored from ${snap.takenAt}; removed ${removed} upload(s), ${removedBlobs} blob(s)`);
  check();
}

const cmd = process.argv[2];
if (cmd === "snapshot") await snapshot();
else if (cmd === "restore") await restore();
else if (cmd === "check") check();
else {
  console.error("usage: node qa/baseline.mjs snapshot | restore | check");
  process.exit(2);
}
