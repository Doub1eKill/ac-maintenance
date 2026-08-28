-- Retiring a brand or a model without destroying what points at it. The
-- catalogue could not be pruned at all before this: every one of the five
-- brands has units on it, and `air_conditioners.ac_brand_id` /
-- `ac_model_id` are ON DELETE RESTRICT, so a hard DELETE was refused on all
-- of them. 117 of the 189 models are used by nothing and were just as stuck,
-- because deleting the brand above them cascades into models that other units
-- still hold.
--
-- Same column and same shape as `air_conditioners.deleted_at`, which has
-- carried this pattern since the Laravel schema: the row stays, the name it
-- provides keeps resolving, and the maintenance history of a unit built on a
-- discontinued model stays readable. RESTRICT is not weakened here — it still
-- applies, but only where a permanent delete is asked for, which is a separate
-- action behind the trash bin.
--
-- Nullable with no backfill: NULL means live, and every existing row is live.
-- AlterTable
ALTER TABLE `ac_brands`
  ADD COLUMN `deleted_at` TIMESTAMP(0) NULL AFTER `updated_at`;

-- AlterTable
ALTER TABLE `ac_models`
  ADD COLUMN `deleted_at` TIMESTAMP(0) NULL AFTER `updated_at`;
