USE `cafe_pos`;

-- 1. Laundry Services (Katalog Layanan Kiloan & Satuan)
CREATE TABLE IF NOT EXISTS `laundry_services` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `type` ENUM('kiloan', 'satuan') NOT NULL DEFAULT 'kiloan',
    `unit` VARCHAR(20) NOT NULL DEFAULT 'kg',
    `base_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `duration_hours` INT NOT NULL DEFAULT 48,
    `description` VARCHAR(255) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_lservice_tenant` (`tenant_id`),
    INDEX `idx_lservice_type` (`tenant_id`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Laundry Perfumes (Pilihan Aroma Parfum)
CREATE TABLE IF NOT EXISTS `laundry_perfumes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `price_extra` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_lperfume_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Laundry Racks (Rak Penyimpanan Siap Ambil)
CREATE TABLE IF NOT EXISTS `laundry_racks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `capacity` INT NOT NULL DEFAULT 10,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_lrack_tenant_code` (`tenant_id`, `code`),
    INDEX `idx_lrack_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Laundry Orders (Transaksi Cucian)
CREATE TABLE IF NOT EXISTS `laundry_orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `order_number` VARCHAR(50) NOT NULL,
    `tracking_code` VARCHAR(30) NOT NULL,
    `customer_name` VARCHAR(150) NOT NULL,
    `customer_phone` VARCHAR(50) NULL,
    `service_speed` ENUM('regular', 'express', 'super_express') NOT NULL DEFAULT 'regular',
    `perfume_id` INT NULL,
    `rack_id` INT NULL,
    `total_weight` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `subtotal_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `speed_surcharge` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `perfume_surcharge` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `payment_status` ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'unpaid',
    `status` ENUM('received', 'washing', 'drying', 'ironing', 'ready', 'picked_up', 'cancelled') NOT NULL DEFAULT 'received',
    `hotel_booking_id` INT NULL,
    `estimated_completion_at` DATETIME NULL,
    `completed_at` DATETIME NULL,
    `picked_up_at` DATETIME NULL,
    `notes` TEXT NULL,
    `created_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_lorder_tenant_num` (`tenant_id`, `order_number`),
    UNIQUE KEY `uq_lorder_tracking` (`tracking_code`),
    INDEX `idx_lorder_tenant_status` (`tenant_id`, `status`),
    INDEX `idx_lorder_rack` (`rack_id`),
    INDEX `idx_lorder_hotel_booking` (`hotel_booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Laundry Order Items (Rincian Item / Pakaian)
CREATE TABLE IF NOT EXISTS `laundry_order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `order_id` INT NOT NULL,
    `service_id` INT NULL,
    `item_name` VARCHAR(150) NOT NULL,
    `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    `unit_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `notes` VARCHAR(255) NULL,
    INDEX `idx_litem_order` (`order_id`),
    INDEX `idx_litem_service` (`service_id`),
    FOREIGN KEY (`order_id`) REFERENCES `laundry_orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Laundry Payments (Pembayaran & Billing)
CREATE TABLE IF NOT EXISTS `laundry_payments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `order_id` INT NOT NULL,
    `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `payment_method` ENUM('cash', 'card', 'qris', 'room_charge', 'transfer') NOT NULL DEFAULT 'cash',
    `reference_number` VARCHAR(100) NULL,
    `cashier_id` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_lpay_order` (`order_id`),
    INDEX `idx_lpay_tenant` (`tenant_id`),
    FOREIGN KEY (`order_id`) REFERENCES `laundry_orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Laundry Status Logs (Audit Trail Perubahan Status)
CREATE TABLE IF NOT EXISTS `laundry_status_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `order_id` INT NOT NULL,
    `from_status` VARCHAR(50) NULL,
    `to_status` VARCHAR(50) NOT NULL,
    `changed_by` INT NULL,
    `notes` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_llog_order` (`order_id`),
    FOREIGN KEY (`order_id`) REFERENCES `laundry_orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Alter accounting_settings to add laundry_revenue_account_id if not exists
SET @dbname = DATABASE();
SET @tablename = 'accounting_settings';
SET @columnname = 'laundry_revenue_account_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD `laundry_revenue_account_id` INT NULL AFTER `hotel_service_revenue_account_id`;')
));
PREPARE alterIfNotExists FROM @preparedStatement; EXECUTE alterIfNotExists; DEALLOCATE PREPARE alterIfNotExists;

-- 9. Add Laundry Account to Default COA for Tenant #1 (4-3000 Pendapatan Jasa Laundry)
INSERT INTO `accounting_accounts` (`tenant_id`, `code`, `name`, `type`, `normal_balance`, `parent_id`, `is_active`, `is_system`)
SELECT 1, '4-3000', 'Pendapatan Jasa Laundry', 'revenue', 'credit', NULL, 1, 1
WHERE NOT EXISTS (
    SELECT 1 FROM `accounting_accounts` WHERE `tenant_id` = 1 AND `code` = '4-3000'
);

-- Map laundry_revenue_account_id in accounting_settings
UPDATE `accounting_settings` 
SET `laundry_revenue_account_id` = (
    SELECT `id` FROM `accounting_accounts` WHERE `tenant_id` = 1 AND `code` = '4-3000' LIMIT 1
)
WHERE `tenant_id` = 1;

-- 10. Update default tenant subscription modules to include laundry
UPDATE `subscriptions` 
SET `modules` = 'combo,laundry'
WHERE `tenant_id` = 1;

-- 11. Seed Default Laundry Services
INSERT INTO `laundry_services` (`tenant_id`, `name`, `type`, `unit`, `base_price`, `duration_hours`, `description`, `is_active`) VALUES
(1, 'Cuci Komplit Reguler (Cuci + Kering + Setrika)', 'kiloan', 'kg', 7000.00, 48, 'Layanan cuci kiloan standar selesai dalam 2 hari', 1),
(1, 'Cuci Kering Lipat (Non Setrika)', 'kiloan', 'kg', 5000.00, 24, 'Cuci bersih dan kering rapi dilipat tanpa setrika', 1),
(1, 'Setrika Saja (Kiloan)', 'kiloan', 'kg', 4500.00, 24, 'Penyetrikaan uap rapi per kilogram pakaian', 1),
(1, 'Jas / Blazer (Dry Clean & Press)', 'satuan', 'pcs', 30000.00, 48, 'Perawatan khusus jas/blazer premium', 1),
(1, 'Bed Cover Besar (King/Queen)', 'satuan', 'pcs', 25000.00, 48, 'Pembersihan mendalam bed cover ukuran besar', 1),
(1, 'Kemeja / Blouse Sutra / Batik', 'satuan', 'pcs', 15000.00, 24, 'Perawatan pakaian bahan sensitif & batik tulis', 1),
(1, 'Gaun Pesta / Gamis Panjang', 'satuan', 'pcs', 35000.00, 48, 'Pencucian detail payet gaun & gamis pesta', 1),
(1, 'Sepatu Sneakers / Canvas', 'satuan', 'pcs', 25000.00, 48, 'Deep cleaning sepatu kain/sneakers', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 12. Seed Default Fragrances
INSERT INTO `laundry_perfumes` (`tenant_id`, `name`, `price_extra`, `is_active`) VALUES
(1, 'Ocean Fresh Breeze', 0.00, 1),
(1, 'Sakura Blossom Premium', 1000.00, 1),
(1, 'Lavender Aromatherapy', 1000.00, 1),
(1, 'Vanilla Sweet Dreams', 1500.00, 1),
(1, 'Snappy Floral Exotic', 0.00, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 13. Seed Default Racks
INSERT INTO `laundry_racks` (`tenant_id`, `code`, `name`, `capacity`, `is_active`) VALUES
(1, 'RAK-A1', 'Rak A1 - Reguler Kiloan', 12, 1),
(1, 'RAK-A2', 'Rak A2 - Reguler Kiloan', 12, 1),
(1, 'RAK-B1', 'Rak B1 - Express / Kilat', 10, 1),
(1, 'RAK-C1', 'Rak C1 - Satuan Gantung (Jas/Gaun)', 8, 1),
(1, 'RAK-C2', 'Rak C2 - Bed Cover & Sepatu', 6, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 14. Ensure accounting_journal_entries.reference_type supports laundry_payment
ALTER TABLE `accounting_journal_entries` MODIFY COLUMN `reference_type` VARCHAR(50) NOT NULL DEFAULT 'manual';
