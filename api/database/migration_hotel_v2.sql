USE `cafe_pos`;

-- 1. Extend hotel_guests table with CRM, VIP tier, and Blacklist columns
SET @dbname = DATABASE();
SET @tablename = 'hotel_guests';

SET @col1 = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'vip_tier') > 0, 'SELECT 1', 'ALTER TABLE `hotel_guests` ADD `vip_tier` ENUM("regular", "silver", "gold", "platinum") NOT NULL DEFAULT "regular" AFTER `address`;'));
PREPARE stmt1 FROM @col1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

SET @col2 = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'is_blacklisted') > 0, 'SELECT 1', 'ALTER TABLE `hotel_guests` ADD `is_blacklisted` TINYINT(1) NOT NULL DEFAULT 0 AFTER `vip_tier`;'));
PREPARE stmt2 FROM @col2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

SET @col3 = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'blacklist_reason') > 0, 'SELECT 1', 'ALTER TABLE `hotel_guests` ADD `blacklist_reason` TEXT NULL AFTER `is_blacklisted`;'));
PREPARE stmt3 FROM @col3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

SET @col4 = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'total_stays') > 0, 'SELECT 1', 'ALTER TABLE `hotel_guests` ADD `total_stays` INT NOT NULL DEFAULT 0 AFTER `blacklist_reason`;'));
PREPARE stmt4 FROM @col4; EXECUTE stmt4; DEALLOCATE PREPARE stmt4;

SET @col5 = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'total_spent') > 0, 'SELECT 1', 'ALTER TABLE `hotel_guests` ADD `total_spent` BIGINT NOT NULL DEFAULT 0 AFTER `total_stays`;'));
PREPARE stmt5 FROM @col5; EXECUTE stmt5; DEALLOCATE PREPARE stmt5;

SET @col6 = (SELECT IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'preferences') > 0, 'SELECT 1', 'ALTER TABLE `hotel_guests` ADD `preferences` TEXT NULL AFTER `total_spent`;'));
PREPARE stmt6 FROM @col6; EXECUTE stmt6; DEALLOCATE PREPARE stmt6;

-- 2. Dedicated Hotel Services & Add-on Catalog
CREATE TABLE IF NOT EXISTS `hotel_services` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `category` ENUM('extra_bed', 'laundry', 'minibar', 'breakfast', 'transport', 'amenity', 'penalty', 'other') NOT NULL DEFAULT 'other',
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `price` INT NOT NULL DEFAULT 0,
    `unit` VARCHAR(30) NOT NULL DEFAULT 'pcs',
    `description` TEXT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    INDEX `idx_hs_tenant` (`tenant_id`),
    INDEX `idx_hs_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Room Transfers Audit Log (Pindah Kamar)
CREATE TABLE IF NOT EXISTS `hotel_room_transfers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `booking_id` INT NOT NULL,
    `from_room_id` INT NOT NULL,
    `to_room_id` INT NOT NULL,
    `transfer_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `reason` VARCHAR(255) NOT NULL,
    `rate_adjusted` TINYINT(1) NOT NULL DEFAULT 0,
    `old_rate` INT NOT NULL DEFAULT 0,
    `new_rate` INT NOT NULL DEFAULT 0,
    `transferred_by_user_id` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`booking_id`) REFERENCES `hotel_bookings`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`from_room_id`) REFERENCES `hotel_rooms`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`to_room_id`) REFERENCES `hotel_rooms`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`transferred_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_hrt_tenant` (`tenant_id`),
    INDEX `idx_hrt_booking` (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Lost and Found Items Registry
CREATE TABLE IF NOT EXISTS `hotel_lost_and_found` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `room_id` INT NOT NULL,
    `item_name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `storage_location` VARCHAR(100) NOT NULL DEFAULT 'Front Desk Safe',
    `status` ENUM('stored', 'claimed', 'disposed') NOT NULL DEFAULT 'stored',
    `found_date` DATE NOT NULL,
    `found_by_user_id` INT NULL,
    `claimed_by_name` VARCHAR(150) NULL,
    `claimed_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`room_id`) REFERENCES `hotel_rooms`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`found_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_hlf_tenant` (`tenant_id`),
    INDEX `idx_hlf_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Front Desk Shift Handover & Cashier Settlement
CREATE TABLE IF NOT EXISTS `hotel_shift_handovers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `shift_date` DATE NOT NULL,
    `shift_type` ENUM('morning', 'evening', 'night') NOT NULL DEFAULT 'morning',
    `user_id` INT NOT NULL,
    `cash_opening` INT NOT NULL DEFAULT 0,
    `cash_closing` INT NOT NULL DEFAULT 0,
    `cash_collected` INT NOT NULL DEFAULT 0,
    `pending_checkouts` INT NOT NULL DEFAULT 0,
    `pending_checkins` INT NOT NULL DEFAULT 0,
    `handover_notes` TEXT NULL,
    `status` ENUM('open', 'submitted') NOT NULL DEFAULT 'open',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_hsh_tenant` (`tenant_id`),
    INDEX `idx_hsh_date` (`shift_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Seed Default Hotel Services for Tenant 1
INSERT IGNORE INTO `hotel_services` (`id`, `tenant_id`, `category`, `code`, `name`, `price`, `unit`, `description`, `is_active`) VALUES
(1, 1, 'extra_bed', 'SRV-EXB-01', 'Extra Bed Springbed + Bantal', 150000, 'malam', 'Tambahan ranjang single beserta bantal dan selimut', 1),
(2, 1, 'breakfast', 'SRV-BFT-01', 'Buffet Breakfast Dewasa', 75000, 'pax', 'Sarapan prasmanan all you can eat di resto hotel', 1),
(3, 1, 'breakfast', 'SRV-BFT-02', 'Buffet Breakfast Anak', 40000, 'pax', 'Sarapan prasmanan anak usia 5-11 tahun', 1),
(4, 1, 'laundry', 'SRV-LND-01', 'Laundry Express Cuci & Setrika', 35000, 'kg', 'Layanan cuci pakaian kilat selesai 4 jam', 1),
(5, 1, 'laundry', 'SRV-LND-02', 'Dry Cleaning Jas / Gaun', 50000, 'pcs', 'Layanan dry clean pakaian formal', 1),
(6, 1, 'transport', 'SRV-TRN-01', 'Airport Shuttle Bandara Drop/Pick', 175000, 'trip', 'Antar atau jemput bandara dengan mobil eksekutif', 1),
(7, 1, 'minibar', 'SRV-MNB-01', 'Minibar Snack & Softdrink Pack', 45000, 'paket', 'Paket minuman dingin dan snack premium dalam kamar', 1),
(8, 1, 'penalty', 'SRV-PNL-01', 'Late Check-out Surcharge (s/d 16:00)', 100000, 'sesi', 'Biaya keterlambatan check-out siang hari', 1),
(9, 1, 'penalty', 'SRV-PNL-02', 'Early Check-in Surcharge (sebelum 12:00)', 100000, 'sesi', 'Biaya masuk kamar lebih awal', 1);
