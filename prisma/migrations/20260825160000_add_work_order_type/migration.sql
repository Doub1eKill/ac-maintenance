-- Records what a work order is for, instead of guessing it later from the
-- unit's current condition. That guess was wrong in two directions: a broken
-- unit that came due for cleaning read as a repair, and once a job closed and
-- the unit returned to normal, the type shown against its own history changed
-- with it.
--
-- Added nullable so the rows already in the table can be filled in from what
-- is actually known about each one, strongest evidence first, before the
-- column is closed off as NOT NULL. Each backfill step only touches rows still
-- unset, so the order below is the priority order.
-- AlterTable
ALTER TABLE `work_orders`
  ADD COLUMN `type` ENUM('repair', 'cleaning') NULL AFTER `status`;

-- 1. Raised by the overdue check. This one is not an inference: that code path
--    exists only to schedule a cleaning, and it stamps its own wording on
--    every order it opens.
UPDATE `work_orders`
SET `type` = 'cleaning'
WHERE `type` IS NULL
  AND `issue_description` LIKE 'ครบกำหนดล้างแอร์ตามรอบบำรุงรักษา%';

-- 2. Closed orders, read from what the technician actually recorded against
--    them. A visit that logged any repair counts as a repair job; a visit that
--    only cleaned was a cleaning job.
UPDATE `work_orders` `wo`
JOIN (
  SELECT `work_order_id`, MAX(`action` = 'repair') AS `has_repair`
  FROM `maintenance_logs`
  WHERE `work_order_id` IS NOT NULL
  GROUP BY `work_order_id`
) `l` ON `l`.`work_order_id` = `wo`.`id`
SET `wo`.`type` = IF(`l`.`has_repair`, 'repair', 'cleaning')
WHERE `wo`.`type` IS NULL;

-- 3. Whatever is left has no evidence attached — seeded rows that were never
--    worked and carry no description. Falling back to the unit's condition is
--    the same guess the application used to make on every render; the
--    difference is that it is made once, here, and then stops moving.
UPDATE `work_orders` `wo`
JOIN `air_conditioners` `ac` ON `ac`.`id` = `wo`.`air_conditioner_id`
SET `wo`.`type` = IF(`ac`.`status` = 'broken', 'repair', 'cleaning')
WHERE `wo`.`type` IS NULL;

-- Anything the three passes above missed would be a row whose air conditioner
-- no longer exists, which the foreign key does not allow. Safe to close off.
ALTER TABLE `work_orders`
  MODIFY COLUMN `type` ENUM('repair', 'cleaning') NOT NULL;
