-- Corrects the timezone of the created_at values written by
-- 20260901160000_backfill_and_default_work_order_created_at.
--
-- That backfill used COALESCE(claimed_at, assigned_at, completed_at,
-- updated_at, NOW()). The four column fallbacks are fine: those columns hold
-- UTC instants written by the application, and copying one keeps it UTC. The
-- final NOW() is not. MySQL's NOW() returns the *server's local* time, which
-- here is Asia/Bangkok, while every timestamp the application writes and reads
-- is UTC -- so every row that fell through to NOW() ended up 7 hours ahead of
-- what it claims to be.
--
-- Measured on this database before the fix, two work orders created six
-- minutes apart:
--
--   #122  backfilled via NOW()   2026-09-03 12:46:37   -> displayed 19:46
--   #123  inserted by Prisma     2026-09-03 05:52:42   -> displayed 12:52
--
-- The older row reads as nearly seven hours *later* than the newer one, and a
-- backfill that runs after 17:00 local pushes its rows onto the wrong day
-- entirely.
--
-- Only the NOW() rows are touched. They are identifiable because the backfill
-- was a single UPDATE: every row it filled from NOW() carries the exact same
-- second, and those rows are precisely the ones that had no other timestamp to
-- copy -- which is still true of them now, since a row that has since been
-- claimed or completed would no longer match. Rows written by the application
-- after the backfill also have those columns NULL, but each carries its own
-- timestamp, so requiring more than one row at the same second separates them.
-- (On this database that split is 21 rows at one second versus 1 written by
-- Prisma.)
--
-- The shift is read from the server rather than hardcoded as 7 hours, so this
-- corrects itself on a machine in another timezone, and does nothing at all on
-- one already running UTC. Prisma applies each migration once per database, so
-- this is not written to be re-runnable by hand -- running it twice would shift
-- the same rows twice.

SET @backfill_batch := (
  SELECT created_at
  FROM work_orders
  WHERE claimed_at IS NULL
    AND assigned_at IS NULL
    AND completed_at IS NULL
    AND updated_at IS NULL
  GROUP BY created_at
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC, created_at ASC
  LIMIT 1
);

SET @local_offset_seconds := TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW());

UPDATE work_orders
SET created_at = created_at - INTERVAL @local_offset_seconds SECOND
WHERE @backfill_batch IS NOT NULL
  AND @local_offset_seconds <> 0
  AND created_at = @backfill_batch
  AND claimed_at IS NULL
  AND assigned_at IS NULL
  AND completed_at IS NULL
  AND updated_at IS NULL;

-- The column keeps DEFAULT CURRENT_TIMESTAMP from the previous migration, and
-- that default has the same local-time problem. It is left in place because
-- nothing reaches it today: WorkOrder.createdAt is @default(now()) in the
-- Prisma schema, so the client always sends its own UTC value, and the seed
-- script goes through Prisma too. It matters only for an INSERT written in raw
-- SQL that omits the column -- which would want an explicit UTC_TIMESTAMP().
