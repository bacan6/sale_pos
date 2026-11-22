USE `cafe_pos`;

-- 1. Alter Subscriptions to add modules if not exists
SET @dbname = DATABASE();
SET @tablename = 'subscriptions';
SET @columnname = 'modules';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD `modules` VARCHAR(50) NOT NULL DEFAULT "pos" AFTER `plan`;')
));
PREPARE alterIfNotExists FROM @preparedStatement; EXECUTE alterIfNotExists; DEALLOCATE PREPARE alterIfNotExists;

-- Ensure default tenant #1 has combo (POS + Hotel)
UPDATE `subscriptions` SET `modules` = 'combo' WHERE `tenant_id` = 1;

-- 2. Alter users table to support Hotel roles
ALTER TABLE `users` 
MODIFY COLUMN `role` ENUM('admin', 'cashier', 'waitstaff', 'kitchen', 'hotel_manager', 'front_desk', 'housekeeping', 'maintenance') NOT NULL DEFAULT 'cashier';

-- 3. Hotel Room Types
CREATE TABLE IF NOT EXISTS `hotel_room_types` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `base_price` INT NOT NULL DEFAULT 0,
    `max_adults` INT NOT NULL DEFAULT 2,
    `max_children` INT NOT NULL DEFAULT 1,
    `amenities_json` LONGTEXT NULL,
    `description` TEXT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    INDEX `idx_hrt_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Hotel Rooms
CREATE TABLE IF NOT EXISTS `hotel_rooms` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `room_type_id` INT NOT NULL,
    `room_number` VARCHAR(20) NOT NULL,
    `floor` INT NOT NULL DEFAULT 1,
    `status` ENUM('vacant_clean', 'vacant_dirty', 'occupied_clean', 'occupied_dirty', 'inspected', 'maintenance', 'out_of_service') NOT NULL DEFAULT 'vacant_clean',
    `active_booking_id` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`room_type_id`) REFERENCES `hotel_room_types`(`id`) ON DELETE RESTRICT,
    INDEX `idx_hr_tenant` (`tenant_id`),
    INDEX `idx_hr_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Hotel Guests
CREATE TABLE IF NOT EXISTS `hotel_guests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `id_card_type` ENUM('KTP', 'Passport', 'SIM', 'Other') NOT NULL DEFAULT 'KTP',
    `id_card_number` VARCHAR(50) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(150) NULL,
    `address` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    INDEX `idx_hg_tenant` (`tenant_id`),
    INDEX `idx_hg_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Hotel Bookings
CREATE TABLE IF NOT EXISTS `hotel_bookings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `booking_number` VARCHAR(50) NOT NULL UNIQUE,
    `guest_id` INT NOT NULL,
    `room_id` INT NOT NULL,
    `source` ENUM('walk_in', 'ota_traveloka', 'ota_agoda', 'ota_booking_com', 'direct_web', 'phone_call', 'corporate') NOT NULL DEFAULT 'walk_in',
    `ota_reference_code` VARCHAR(100) NULL,
    `check_in_date` DATE NOT NULL,
    `check_out_date` DATE NOT NULL,
    `actual_check_in_at` DATETIME NULL,
    `actual_check_out_at` DATETIME NULL,
    `status` ENUM('reserved', 'checked_in', 'checked_out', 'cancelled', 'no_show') NOT NULL DEFAULT 'reserved',
    `night_count` INT NOT NULL DEFAULT 1,
    `rate_per_night` INT NOT NULL DEFAULT 0,
    `deposit_amount` INT NOT NULL DEFAULT 0,
    `total_amount` INT NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`guest_id`) REFERENCES `hotel_guests`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`room_id`) REFERENCES `hotel_rooms`(`id`) ON DELETE RESTRICT,
    INDEX `idx_hb_tenant` (`tenant_id`),
    INDEX `idx_hb_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Hotel Folios
CREATE TABLE IF NOT EXISTS `hotel_folios` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `booking_id` INT NOT NULL,
    `folio_number` VARCHAR(50) NOT NULL UNIQUE,
    `status` ENUM('open', 'settled', 'closed') NOT NULL DEFAULT 'open',
    `total_charges` INT NOT NULL DEFAULT 0,
    `total_payments` INT NOT NULL DEFAULT 0,
    `balance` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`booking_id`) REFERENCES `hotel_bookings`(`id`) ON DELETE CASCADE,
    INDEX `idx_hf_tenant` (`tenant_id`),
    INDEX `idx_hf_booking` (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Hotel Folio Items
CREATE TABLE IF NOT EXISTS `hotel_folio_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `folio_id` INT NOT NULL,
    `category` ENUM('room_charge', 'pos_restaurant', 'laundry', 'minibar', 'extra_bed', 'amenity', 'payment', 'other') NOT NULL DEFAULT 'room_charge',
    `source_order_id` INT NULL,
    `description` VARCHAR(255) NOT NULL,
    `amount` INT NOT NULL DEFAULT 0,
    `quantity` INT NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`folio_id`) REFERENCES `hotel_folios`(`id`) ON DELETE CASCADE,
    INDEX `idx_hfi_folio` (`folio_id`),
    INDEX `idx_hfi_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Housekeeping Tasks
CREATE TABLE IF NOT EXISTS `hotel_housekeeping_tasks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `room_id` INT NOT NULL,
    `assigned_user_id` INT NULL,
    `task_type` ENUM('daily_cleaning', 'checkout_cleaning', 'deep_cleaning', 'maintenance') NOT NULL DEFAULT 'daily_cleaning',
    `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    `status` ENUM('pending', 'in_progress', 'completed', 'inspected') NOT NULL DEFAULT 'pending',
    `notes` TEXT NULL,
    `completed_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`room_id`) REFERENCES `hotel_rooms`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_hkt_tenant` (`tenant_id`),
    INDEX `idx_hkt_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Hotel Night Audits
CREATE TABLE IF NOT EXISTS `hotel_night_audits` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `audit_date` DATE NOT NULL,
    `total_rooms` INT NOT NULL DEFAULT 0,
    `occupied_rooms` INT NOT NULL DEFAULT 0,
    `occupancy_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `room_revenue` INT NOT NULL DEFAULT 0,
    `pos_revenue` INT NOT NULL DEFAULT 0,
    `other_revenue` INT NOT NULL DEFAULT 0,
    `total_revenue` INT NOT NULL DEFAULT 0,
    `adr` INT NOT NULL DEFAULT 0,
    `revpar` INT NOT NULL DEFAULT 0,
    `audited_by_user_id` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`audited_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_hna_tenant` (`tenant_id`),
    INDEX `idx_hna_date` (`audit_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
