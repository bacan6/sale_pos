USE `cafe_pos`;

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS `tenants` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(80) NOT NULL UNIQUE,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `phone` VARCHAR(30) NULL,
    `address` VARCHAR(255) NULL,
    `status` ENUM('active', 'suspended', 'trial') NOT NULL DEFAULT 'trial',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_tenant_slug` (`slug`),
    INDEX `idx_tenant_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS `subscriptions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL UNIQUE,
    `plan` ENUM('free', 'starter', 'pro', 'enterprise') NOT NULL DEFAULT 'starter',
    `max_devices` INT NOT NULL DEFAULT 3,
    `status` ENUM('active', 'expired', 'cancelled') NOT NULL DEFAULT 'active',
    `starts_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed Default Tenant (Kopi Senja)
INSERT INTO `tenants` (`id`, `name`, `slug`, `email`, `phone`, `address`, `status`) VALUES
(1, 'Kopi Senja Utama', 'kopi-senja', 'admin@kopisenja.com', '081234567890', 'Jl. Kaliurang KM 5.5, Yogyakarta', 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `subscriptions` (`tenant_id`, `plan`, `max_devices`, `status`, `starts_at`, `expires_at`) VALUES
(1, 'pro', 10, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 365 DAY))
ON DUPLICATE KEY UPDATE `plan` = VALUES(`plan`);

-- 4. Alter Domain Tables to Add tenant_id (if not exists)
SET @dbname = DATABASE();
SET @columnname = 'tenant_id';

-- devices
SET @tablename = 'devices';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD `tenant_id` INT NOT NULL DEFAULT 1 AFTER `id`, ADD INDEX `idx_dev_tenant` (`tenant_id`);')
));
PREPARE alterIfNotExists FROM @preparedStatement; EXECUTE alterIfNotExists; DEALLOCATE PREPARE alterIfNotExists;

-- users
SET @tablename = 'users';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD `tenant_id` INT NOT NULL DEFAULT 1 AFTER `id`, ADD INDEX `idx_user_tenant` (`tenant_id`);')
));
PREPARE alterIfNotExists FROM @preparedStatement; EXECUTE alterIfNotExists; DEALLOCATE PREPARE alterIfNotExists;

-- product_categories
SET @tablename = 'product_categories';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD `tenant_id` INT NOT NULL DEFAULT 1 AFTER `id`, ADD INDEX `idx_pc_tenant` (`tenant_id`);')
));
PREPARE alterIfNotExists FROM @preparedStatement; EXECUTE alterIfNotExists; DEALLOCATE PREPARE alterIfNotExists;

-- room_categories
SET @tablename = 'room_categories';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD `tenant_id` INT NOT NULL DEFAULT 1 AFTER `id`, ADD INDEX `idx_rc_tenant` (`tenant_id`);')
));
PREPARE alterIfNotExists FROM @preparedStatement; EXECUTE alterIfNotExists; DEALLOCATE PREPARE alterIfNotExists;

-- products
SET @tablename = 'products';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD `tenant_id` INT NOT NULL DEFAULT 1 AFTER `id`, ADD INDEX `idx_prod_tenant` (`tenant_id`);')
));
PREPARE alterIfNotExists FROM @preparedStatement; EXECUTE alterIfNotExists; DEALLOCATE PREPARE alterIfNotExists;

-- tables
SET @tablename = 'tables';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD `tenant_id` INT NOT NULL DEFAULT 1 AFTER `id`, ADD INDEX `idx_tbl_tenant` (`tenant_id`);')
));
PREPARE alterIfNotExists FROM @preparedStatement; EXECUTE alterIfNotExists; DEALLOCATE PREPARE alterIfNotExists;

-- orders
SET @tablename = 'orders';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD `tenant_id` INT NOT NULL DEFAULT 1 AFTER `id`, ADD INDEX `idx_order_tenant` (`tenant_id`);')
));
PREPARE alterIfNotExists FROM @preparedStatement; EXECUTE alterIfNotExists; DEALLOCATE PREPARE alterIfNotExists;

-- kitchen_tickets
SET @tablename = 'kitchen_tickets';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD `tenant_id` INT NOT NULL DEFAULT 1 AFTER `id`, ADD INDEX `idx_kt_tenant` (`tenant_id`);')
));
PREPARE alterIfNotExists FROM @preparedStatement; EXECUTE alterIfNotExists; DEALLOCATE PREPARE alterIfNotExists;

-- payments
SET @tablename = 'payments';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD `tenant_id` INT NOT NULL DEFAULT 1 AFTER `id`, ADD INDEX `idx_pay_tenant` (`tenant_id`);')
));
PREPARE alterIfNotExists FROM @preparedStatement; EXECUTE alterIfNotExists; DEALLOCATE PREPARE alterIfNotExists;

-- sync_log
SET @tablename = 'sync_log';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD `tenant_id` INT NOT NULL DEFAULT 1 AFTER `id`, ADD INDEX `idx_sync_tenant` (`tenant_id`);')
));
PREPARE alterIfNotExists FROM @preparedStatement; EXECUTE alterIfNotExists; DEALLOCATE PREPARE alterIfNotExists;
