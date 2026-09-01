-- work_orders.created_at was nullable with no default, and nothing that
-- inserted a row ever set it -- every existing row has created_at = NULL,
-- which is why "วันที่แจ้ง" showed blank for every work order on the board
-- and in the detail dialog.
--
-- 1) Backfill: there is no recorded report time for these rows, so this
--    approximates it from the earliest other timestamp the row does carry
--    (claimed_at is set at creation time itself when a work order is opened
--    pre-assigned, so it's often exact; assigned_at/completed_at/updated_at
--    are fallbacks in roughly chronological order; NOW() only if none exist).
--    Safe to re-run -- it only touches rows still NULL.
UPDATE work_orders
SET created_at = COALESCE(claimed_at, assigned_at, completed_at, updated_at, NOW())
WHERE created_at IS NULL;

-- 2) Close it off at the schema level so this can't recur: every future
--    insert gets a timestamp even if the application code forgets to set one.
ALTER TABLE work_orders
  MODIFY COLUMN created_at TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP;
