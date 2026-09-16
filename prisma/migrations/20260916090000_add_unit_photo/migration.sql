-- The unit's own picture (see AirConditioner.photoUrl in schema.prisma).
-- Nullable: units registered before this have none.
--
-- PostgreSQL wording of the migration master carries for MariaDB — same
-- folder name on both engines, so _prisma_migrations agrees about what has
-- been applied whichever database a checkout is pointed at.
ALTER TABLE "air_conditioners" ADD COLUMN "photo_url" VARCHAR(255);
