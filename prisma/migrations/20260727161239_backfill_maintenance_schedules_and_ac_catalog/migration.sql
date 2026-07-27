-- Data migration (no schema change). Backfills two tables that were left
-- empty by earlier migrations, so anyone applying this on a DB that already
-- has air_conditioners/maintenance_logs data will get the same derived
-- state Claude's session produced locally. Safe to re-run (idempotent).

-- 1) maintenance_schedules: one active row per air conditioner, 3-month
--    cycle, seeded from each unit's most recent maintenance_logs entry
--    (falling back to installed_at / created_at / now if it was never
--    serviced). Needed for the maintenance-calendar + overdue auto-check
--    features -- this table was previously 0 rows.
INSERT INTO maintenance_schedules (air_conditioner_id, frequency_value, frequency_unit, last_performed_at, next_due_date, is_active)
SELECT
  ac.id,
  3,
  'months',
  latest.last_performed,
  DATE_ADD(COALESCE(latest.last_performed, ac.installed_at, ac.created_at, NOW()), INTERVAL 3 MONTH),
  1
FROM air_conditioners ac
LEFT JOIN (
  SELECT air_conditioner_id, MAX(performed_at) AS last_performed
  FROM maintenance_logs
  GROUP BY air_conditioner_id
) latest ON latest.air_conditioner_id = ac.id
WHERE ac.deleted_at IS NULL
AND NOT EXISTS (
  SELECT 1 FROM maintenance_schedules ms WHERE ms.air_conditioner_id = ac.id AND ms.is_active = 1
);

-- 2) ac_brands / ac_models: normalized catalog rows derived from the
--    legacy free-text air_conditioners.brand / air_conditioners.model
--    columns, then air_conditioners.ac_brand_id / ac_model_id linked back.
--    Root cause of the "Master Data page shows nothing" bug -- these
--    tables existed in the schema but nothing had ever populated them.
INSERT INTO ac_brands (name, created_at, updated_at)
SELECT DISTINCT brand, NOW(), NOW() FROM air_conditioners WHERE brand IS NOT NULL
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO ac_models (brand_id, name, default_btu, created_at, updated_at)
SELECT DISTINCT b.id, ac.model, ac.btu, NOW(), NOW()
FROM air_conditioners ac
JOIN ac_brands b ON b.name = ac.brand
WHERE ac.model IS NOT NULL
ON DUPLICATE KEY UPDATE default_btu = VALUES(default_btu);

UPDATE air_conditioners ac
JOIN ac_brands b ON b.name = ac.brand
JOIN ac_models m ON m.brand_id = b.id AND m.name = ac.model
SET ac.ac_brand_id = b.id, ac.ac_model_id = m.id
WHERE ac.ac_model_id IS NULL;
