-- Records what a repair actually fixed, separately from the visit's general
-- notes, so repair work can be reported on without parsing free text.
-- Nullable and only populated on rows whose action is 'repair'; existing
-- rows keep NULL, which reads correctly as "not recorded".
-- AlterTable
ALTER TABLE `maintenance_logs` ADD COLUMN `repair_detail` TEXT NULL;

