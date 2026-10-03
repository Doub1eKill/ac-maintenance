-- When the daily overdue-maintenance cron last ran (see SystemSettings in
-- schema.prisma). Additive and nullable: existing rows read NULL, which the
-- dashboards treat as "no scheduled run yet" and keep raising orders themselves.
ALTER TABLE "system_settings" ADD COLUMN "overdue_sync_at" TIMESTAMP(0);
