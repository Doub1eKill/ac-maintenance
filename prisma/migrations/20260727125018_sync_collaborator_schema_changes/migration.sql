-- AlterTable
ALTER TABLE `air_conditioners` ADD COLUMN `ac_brand_id` BIGINT UNSIGNED NULL,
    ADD COLUMN `ac_model_id` BIGINT UNSIGNED NULL,
    ADD COLUMN `deleted_at` TIMESTAMP(0) NULL,
    MODIFY `brand` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `maintenance_logs` ADD COLUMN `after_photo_url` VARCHAR(255) NULL,
    ADD COLUMN `before_photo_url` VARCHAR(255) NULL,
    ADD COLUMN `customer_signature_url` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `deleted_at` TIMESTAMP(0) NULL;

-- AlterTable
ALTER TABLE `work_orders` ADD COLUMN `assigned_at` TIMESTAMP(0) NULL,
    ADD COLUMN `assigned_to_id` BIGINT UNSIGNED NULL,
    ADD COLUMN `completed_at` TIMESTAMP(0) NULL,
    ADD COLUMN `images` JSON NULL,
    ADD COLUMN `issue_description` TEXT NULL,
    ADD COLUMN `priority` VARCHAR(20) NULL DEFAULT 'low',
    ADD COLUMN `reported_by_id` BIGINT UNSIGNED NULL,
    ADD COLUMN `resolution_notes` TEXT NULL;

-- CreateTable
CREATE TABLE `ac_brands` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `ac_brands_name_unique`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ac_models` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `brand_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `default_btu` INTEGER UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `ac_models_brand_id_name_unique`(`brand_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_audit_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `university_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` BIGINT UNSIGNED NOT NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `audit_tenant_entity_idx`(`university_id`, `entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_schedules` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `air_conditioner_id` BIGINT UNSIGNED NOT NULL,
    `frequency_months` SMALLINT UNSIGNED NULL,
    `frequency_value` INTEGER UNSIGNED NOT NULL DEFAULT 6,
    `frequency_unit` VARCHAR(20) NOT NULL DEFAULT 'months',
    `last_performed_at` DATE NULL,
    `next_due_date` DATE NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `schedule_due_date_idx`(`next_due_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ac_models` ADD CONSTRAINT `ac_models_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `ac_brands`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `air_conditioners` ADD CONSTRAINT `airConditioners_ac_brand_id_foreign` FOREIGN KEY (`ac_brand_id`) REFERENCES `ac_brands`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `air_conditioners` ADD CONSTRAINT `airConditioners_ac_model_id_foreign` FOREIGN KEY (`ac_model_id`) REFERENCES `ac_models`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_reported_by_foreign` FOREIGN KEY (`reported_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_assigned_to_foreign` FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `system_audit_logs` ADD CONSTRAINT `audit_university_fk` FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `system_audit_logs` ADD CONSTRAINT `audit_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `maintenance_schedules` ADD CONSTRAINT `schedule_ac_fk` FOREIGN KEY (`air_conditioner_id`) REFERENCES `air_conditioners`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
