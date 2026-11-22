USE `cafe_pos`;

-- 1. Personal Access Tokens
CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `tenant_id` INT NOT NULL,
    `name` VARCHAR(100) NOT NULL DEFAULT 'web_token',
    `token_hash` VARCHAR(64) NOT NULL UNIQUE,
    `last_used_at` DATETIME NULL,
    `expires_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    INDEX `idx_pat_user` (`user_id`),
    INDEX `idx_pat_tenant` (`tenant_id`),
    INDEX `idx_pat_hash` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Subscription Invoices (Audit Trail for Billing / Simulating Payments)
CREATE TABLE IF NOT EXISTS `subscription_invoices` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
    `tenant_id` INT NOT NULL,
    `type` ENUM('activation', 'recurring', 'upgrade') NOT NULL DEFAULT 'recurring',
    `plan` VARCHAR(50) NOT NULL DEFAULT 'starter',
    `amount` INT NOT NULL DEFAULT 0,
    `status` ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'paid',
    `payment_method` VARCHAR(50) NOT NULL DEFAULT 'simulation',
    `paid_at` DATETIME NULL,
    `period_start` DATETIME NOT NULL,
    `period_end` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    INDEX `idx_inv_tenant` (`tenant_id`),
    INDEX `idx_inv_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Update tenants.status ENUM
-- Map existing statuses first
UPDATE `tenants` SET `status` = 'active' WHERE `status` = 'trial';
UPDATE `tenants` SET `status` = 'suspended' WHERE `status` = 'suspended';

ALTER TABLE `tenants` 
MODIFY COLUMN `status` ENUM('waiting_activation', 'active', 'on_hold', 'terminated') NOT NULL DEFAULT 'active';
