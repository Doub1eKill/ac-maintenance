-- Removes the multi-tenant layer: the system now serves a single institution,
-- so University, every university_id column, and the super_admin role all go.
--
-- The data step below is NOT optional and has to run first. Two things in the
-- schema step would fail against a database that still holds several tenants:
-- buildings.name/abbreviation become globally unique (they were only unique
-- per tenant, so cross-tenant duplicates would collide), and the users.role
-- enum loses 'super_admin' (an existing row with that value has no valid
-- target). Data belonging to every tenant except the surviving one is deleted
-- outright — it was faker-generated seed data, not real records.
--
-- The surviving tenant is the lowest university id rather than a hardcoded
-- value, so this picks the same row on every copy of the seeded database.

-- 1) Data: keep one tenant, drop the rest.
SET @keep := (SELECT MIN(id) FROM universities);

-- Collected up front into temporary tables: MySQL refuses a DELETE whose
-- subquery reads the table being deleted from.
CREATE TEMPORARY TABLE _f1_del_ac AS
  SELECT ac.id FROM air_conditioners ac
  JOIN rooms r ON r.id = ac.room_id
  JOIN buildings b ON b.id = r.building_id
  WHERE b.university_id <> @keep;

CREATE TEMPORARY TABLE _f1_del_user AS
  SELECT id FROM users
  WHERE (university_id IS NOT NULL AND university_id <> @keep)
     OR role = 'super_admin';

DELETE FROM maintenance_logs
 WHERE air_conditioner_id IN (SELECT id FROM _f1_del_ac)
    OR user_id IN (SELECT id FROM _f1_del_user);

DELETE FROM work_orders
 WHERE university_id <> @keep
    OR air_conditioner_id IN (SELECT id FROM _f1_del_ac);

DELETE FROM maintenance_schedules WHERE air_conditioner_id IN (SELECT id FROM _f1_del_ac);

DELETE FROM air_conditioners WHERE id IN (SELECT id FROM _f1_del_ac);

DELETE FROM rooms WHERE building_id IN (SELECT id FROM buildings WHERE university_id <> @keep);
DELETE FROM buildings WHERE university_id <> @keep;

DELETE FROM system_audit_logs
 WHERE university_id <> @keep OR user_id IN (SELECT id FROM _f1_del_user);

DELETE FROM user_phones WHERE user_id IN (SELECT id FROM _f1_del_user);
DELETE FROM users WHERE id IN (SELECT id FROM _f1_del_user);

DELETE FROM universities WHERE id <> @keep;

DROP TEMPORARY TABLE _f1_del_ac;
DROP TEMPORARY TABLE _f1_del_user;

-- 2) ac_code drops its leading university segment: [UNI]-[BLDG]-[ROOM]-[NN]
--    becomes [BLDG]-[ROOM]-[NN]. Guarded by the LIKE so a code that somehow
--    lacks the prefix is left alone rather than truncated.
UPDATE air_conditioners ac
  JOIN rooms r ON r.id = ac.room_id
  JOIN buildings b ON b.id = r.building_id
  JOIN universities u ON u.id = b.university_id
  SET ac.ac_code = SUBSTRING(ac.ac_code, CHAR_LENGTH(u.abbreviation) + 2)
  WHERE ac.ac_code LIKE CONCAT(u.abbreviation, '-%');

-- 3) Schema.
-- DropForeignKey
ALTER TABLE `buildings` DROP FOREIGN KEY `buildings_university_id_foreign`;

-- DropForeignKey
ALTER TABLE `system_audit_logs` DROP FOREIGN KEY `audit_university_fk`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_university_id_foreign`;

-- DropForeignKey
ALTER TABLE `work_orders` DROP FOREIGN KEY `work_orders_university_id_foreign`;

-- DropIndex
DROP INDEX `buildings_university_id_abbreviation_unique` ON `buildings`;

-- DropIndex
DROP INDEX `buildings_university_id_name_unique` ON `buildings`;

-- DropIndex
DROP INDEX `audit_tenant_entity_idx` ON `system_audit_logs`;

-- DropIndex
DROP INDEX `users_university_id_role_index` ON `users`;

-- DropIndex
DROP INDEX `users_university_id_status_index` ON `users`;

-- DropIndex
DROP INDEX `work_orders_university_id_status_created_at_index` ON `work_orders`;

-- AlterTable
ALTER TABLE `buildings` DROP COLUMN `university_id`;

-- AlterTable
ALTER TABLE `system_audit_logs` DROP COLUMN `university_id`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `university_id`,
    MODIFY `role` ENUM('org_admin', 'technician') NOT NULL DEFAULT 'technician';

-- AlterTable
ALTER TABLE `work_orders` DROP COLUMN `university_id`;

-- DropTable
DROP TABLE `universities`;

-- CreateIndex
CREATE UNIQUE INDEX `buildings_name_unique` ON `buildings`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `buildings_abbreviation_unique` ON `buildings`(`abbreviation`);

-- CreateIndex
CREATE INDEX `audit_entity_idx` ON `system_audit_logs`(`entity_type`, `entity_id`);

-- CreateIndex
CREATE INDEX `users_role_status_index` ON `users`(`role`, `status`);

-- CreateIndex
CREATE INDEX `work_orders_status_created_at_index` ON `work_orders`(`status`, `created_at`);

