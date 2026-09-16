-- The unit's own picture (see AirConditioner.photoUrl in schema.prisma).
-- Nullable: units registered before this have none.
ALTER TABLE `air_conditioners` ADD COLUMN `photo_url` VARCHAR(255) NULL AFTER `installed_at`;
