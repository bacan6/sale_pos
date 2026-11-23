USE `cafe_pos`;

-- 1. Raw Materials / Ingredients Catalog
CREATE TABLE IF NOT EXISTS `pos_ingredients` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `unit` VARCHAR(30) NOT NULL DEFAULT 'pcs',
    `stock` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `cost_per_unit` INT NOT NULL DEFAULT 0,
    `min_stock_alert` DECIMAL(12, 3) NOT NULL DEFAULT 10.000,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    INDEX `idx_pi_tenant` (`tenant_id`),
    INDEX `idx_pi_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Recipe Bill of Materials (BOM) per Product
CREATE TABLE IF NOT EXISTS `pos_product_recipes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `ingredient_id` INT NOT NULL,
    `quantity_needed` DECIMAL(12, 3) NOT NULL DEFAULT 1.000,
    `unit` VARCHAR(30) NOT NULL DEFAULT 'pcs',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`ingredient_id`) REFERENCES `pos_ingredients`(`id`) ON DELETE CASCADE,
    INDEX `idx_ppr_tenant` (`tenant_id`),
    INDEX `idx_ppr_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Inventory Stock Movement & Opname Audit Logs
CREATE TABLE IF NOT EXISTS `pos_inventory_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `ingredient_id` INT NOT NULL,
    `type` ENUM('in_purchase', 'out_order', 'waste', 'opname_adjustment') NOT NULL DEFAULT 'opname_adjustment',
    `quantity` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `balance_after` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `reference_id` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `user_id` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`ingredient_id`) REFERENCES `pos_ingredients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_pil_tenant` (`tenant_id`),
    INDEX `idx_pil_ingr` (`ingredient_id`),
    INDEX `idx_pil_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Cashier Shifts
CREATE TABLE IF NOT EXISTS `pos_shifts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `device_id` VARCHAR(64) NULL,
    `opened_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `closed_at` DATETIME NULL,
    `opening_cash` INT NOT NULL DEFAULT 0,
    `closing_cash_system` INT NOT NULL DEFAULT 0,
    `closing_cash_actual` INT NOT NULL DEFAULT 0,
    `cash_discrepancy` INT NOT NULL DEFAULT 0,
    `total_cash_sales` INT NOT NULL DEFAULT 0,
    `total_non_cash_sales` INT NOT NULL DEFAULT 0,
    `total_cash_in` INT NOT NULL DEFAULT 0,
    `total_cash_out` INT NOT NULL DEFAULT 0,
    `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
    INDEX `idx_ps_tenant` (`tenant_id`),
    INDEX `idx_ps_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Shift Cash Movements (Petty cash in / out)
CREATE TABLE IF NOT EXISTS `pos_shift_movements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `shift_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `type` ENUM('cash_in', 'cash_out') NOT NULL DEFAULT 'cash_in',
    `amount` INT NOT NULL DEFAULT 0,
    `reason` VARCHAR(255) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`shift_id`) REFERENCES `pos_shifts`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
    INDEX `idx_psm_shift` (`shift_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table Transfers (Move / Merge audit log)
CREATE TABLE IF NOT EXISTS `pos_table_transfers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `from_table_id` INT NOT NULL,
    `to_table_id` INT NOT NULL,
    `order_id` INT NOT NULL,
    `action_type` ENUM('move', 'merge') NOT NULL DEFAULT 'move',
    `transferred_by_user_id` INT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`from_table_id`) REFERENCES `tables`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`to_table_id`) REFERENCES `tables`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`transferred_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_ptt_tenant` (`tenant_id`),
    INDEX `idx_ptt_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Add shift_id column to payments table if not exists
SET @dbname = DATABASE();
SET @tablename = 'payments';
SET @columnname = 'shift_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD `shift_id` INT NULL AFTER `user_id`, ADD INDEX `idx_pay_shift` (`shift_id`);')
));
PREPARE alterPay FROM @preparedStatement; EXECUTE alterPay; DEALLOCATE PREPARE alterPay;

-- 8. Add parent_order_id and is_split columns to orders table if not exists
SET @tablename = 'orders';
SET @columnname = 'parent_order_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD `parent_order_id` INT NULL AFTER `table_id`, ADD `is_split` TINYINT(1) NOT NULL DEFAULT 0 AFTER `parent_order_id`, ADD INDEX `idx_order_parent` (`parent_order_id`);')
));
PREPARE alterOrd FROM @preparedStatement; EXECUTE alterOrd; DEALLOCATE PREPARE alterOrd;
