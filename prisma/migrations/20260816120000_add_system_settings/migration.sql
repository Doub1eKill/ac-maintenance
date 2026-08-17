-- Installation-wide settings: the default maintenance cycle applied to newly
-- registered units, and the organisation details that replaced the University
-- row removed in F1.
--
-- Exactly one row, pinned to id = 1 and inserted here rather than lazily on
-- first write, so every reader finds a row instead of having to treat
-- "not configured yet" as a case of its own.
-- CreateTable
CREATE TABLE `system_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `default_frequency_value` INTEGER UNSIGNED NOT NULL DEFAULT 6,
    `default_frequency_unit` VARCHAR(20) NOT NULL DEFAULT 'months',
    `organisation_name` VARCHAR(255) NULL,
    `organisation_address` VARCHAR(255) NULL,
    `organisation_phone` VARCHAR(255) NULL,
    `updated_at` TIMESTAMP(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- The single settings row. INSERT IGNORE so re-running this against a
-- database that already has it is a no-op rather than a duplicate-key error.
INSERT IGNORE INTO `system_settings` (`id`, `default_frequency_value`, `default_frequency_unit`, `updated_at`)
VALUES (1, 6, 'months', NOW());
