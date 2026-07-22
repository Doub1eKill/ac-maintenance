-- CreateTable
CREATE TABLE `universities` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `abbreviation` VARCHAR(10) NOT NULL,
    `address` VARCHAR(255) NULL,
    `phone` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `universities_name_unique`(`name`),
    UNIQUE INDEX `universities_abbreviation_unique`(`abbreviation`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `buildings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `university_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `abbreviation` VARCHAR(10) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `buildings_university_id_abbreviation_unique`(`university_id`, `abbreviation`),
    UNIQUE INDEX `buildings_university_id_name_unique`(`university_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `building_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `floor` SMALLINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `rooms_building_id_name_unique`(`building_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `university_id` BIGINT UNSIGNED NULL,
    `role` ENUM('super_admin', 'org_admin', 'technician') NOT NULL DEFAULT 'technician',
    `status` ENUM('pending', 'active', 'suspended') NOT NULL DEFAULT 'pending',
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `email_verified_at` TIMESTAMP(0) NULL,
    `password` VARCHAR(255) NOT NULL,
    `remember_token` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `users_email_unique`(`email`),
    INDEX `users_university_id_role_index`(`university_id`, `role`),
    INDEX `users_university_id_status_index`(`university_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_phones` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `phone_number` VARCHAR(255) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `user_phones_user_id_phone_number_unique`(`user_id`, `phone_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `air_conditioners` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `room_id` BIGINT UNSIGNED NOT NULL,
    `ac_code` VARCHAR(255) NOT NULL,
    `qr_code` CHAR(36) NOT NULL,
    `brand` VARCHAR(255) NOT NULL,
    `model` VARCHAR(255) NULL,
    `btu` INTEGER UNSIGNED NULL,
    `installed_at` DATE NULL,
    `status` ENUM('normal', 'broken', 'needs_cleaning') NOT NULL DEFAULT 'normal',
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `air_conditioners_ac_code_unique`(`ac_code`),
    UNIQUE INDEX `air_conditioners_qr_code_unique`(`qr_code`),
    INDEX `air_conditioners_room_id_index`(`room_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `air_conditioner_id` BIGINT UNSIGNED NOT NULL,
    `work_order_id` BIGINT UNSIGNED NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `action` ENUM('cleaning', 'repair', 'refill_refrigerant') NOT NULL,
    `notes` TEXT NULL,
    `performed_at` DATETIME(0) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `maintenance_logs_air_conditioner_id_performed_at_index`(`air_conditioner_id`, `performed_at`),
    INDEX `maintenance_logs_user_id_index`(`user_id`),
    INDEX `maintenance_logs_work_order_id_index`(`work_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_orders` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `air_conditioner_id` BIGINT UNSIGNED NOT NULL,
    `university_id` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('pending', 'claimed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    `claimed_by` BIGINT UNSIGNED NULL,
    `claimed_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `work_orders_university_id_status_created_at_index`(`university_id`, `status`, `created_at`),
    INDEX `work_orders_air_conditioner_id_status_index`(`air_conditioner_id`, `status`),
    INDEX `work_orders_claimed_by_index`(`claimed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `buildings` ADD CONSTRAINT `buildings_university_id_foreign` FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_building_id_foreign` FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_university_id_foreign` FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `user_phones` ADD CONSTRAINT `user_phones_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `air_conditioners` ADD CONSTRAINT `air_conditioners_room_id_foreign` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `maintenance_logs` ADD CONSTRAINT `maintenance_logs_air_conditioner_id_foreign` FOREIGN KEY (`air_conditioner_id`) REFERENCES `air_conditioners`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `maintenance_logs` ADD CONSTRAINT `maintenance_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `maintenance_logs` ADD CONSTRAINT `maintenance_logs_work_order_id_foreign` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_air_conditioner_id_foreign` FOREIGN KEY (`air_conditioner_id`) REFERENCES `air_conditioners`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_university_id_foreign` FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_claimed_by_foreign` FOREIGN KEY (`claimed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

