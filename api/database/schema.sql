-- Schema database untuk Cafe POS (Kopi Senja)
CREATE DATABASE IF NOT EXISTS `cafe_pos` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `cafe_pos`;

CREATE TABLE IF NOT EXISTS `devices` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `device_id` VARCHAR(64) NOT NULL UNIQUE,
    `device_secret` VARCHAR(128) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `role` ENUM('cashier', 'waitstaff', 'kiosk', 'kitchen', 'admin') NOT NULL DEFAULT 'cashier',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `last_synced_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_devices_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `role` ENUM('admin', 'cashier', 'waitstaff', 'kitchen') NOT NULL DEFAULT 'cashier',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `code` VARCHAR(20) NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_pc_sort` (`sort_order`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `room_categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_rc_sort` (`sort_order`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `category_id` INT NOT NULL,
    `price` INT NOT NULL DEFAULT 0,
    `cost` INT NOT NULL DEFAULT 0,
    `stock` INT NOT NULL DEFAULT 0,
    `is_available` TINYINT(1) NOT NULL DEFAULT 1,
    `image` TEXT NULL,
    `description` TEXT NULL,
    `options_json` LONGTEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE RESTRICT,
    INDEX `idx_prod_cat` (`category_id`),
    INDEX `idx_prod_avail` (`is_available`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tables` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL,
    `capacity` INT NOT NULL DEFAULT 4,
    `room_category_id` INT NOT NULL,
    `status` ENUM('available', 'occupied', 'reserved', 'billing') NOT NULL DEFAULT 'available',
    `active_order_number` VARCHAR(50) NULL,
    `active_order_total` INT NOT NULL DEFAULT 0,
    `guest_count` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`room_category_id`) REFERENCES `room_categories`(`id`) ON DELETE RESTRICT,
    INDEX `idx_table_room` (`room_category_id`),
    INDEX `idx_table_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_number` VARCHAR(50) NOT NULL UNIQUE,
    `table_id` INT NULL,
    `order_type` ENUM('Dine-In', 'Take-Away') NOT NULL DEFAULT 'Dine-In',
    `user_id` INT NULL,
    `waiter_name` VARCHAR(100) NULL,
    `status` ENUM('pending', 'kitchen', 'billing', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
    `discount_percent` INT NOT NULL DEFAULT 0,
    `subtotal` INT NOT NULL DEFAULT 0,
    `tax_amount` INT NOT NULL DEFAULT 0,
    `total` INT NOT NULL DEFAULT 0,
    `device_id` VARCHAR(64) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_order_num` (`order_number`),
    INDEX `idx_order_status` (`status`),
    INDEX `idx_order_updated` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `product_name` VARCHAR(150) NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `unit_price` INT NOT NULL DEFAULT 0,
    `subtotal` INT NOT NULL DEFAULT 0,
    `notes` VARCHAR(255) NULL,
    `selected_options_json` LONGTEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
    INDEX `idx_oi_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kitchen_tickets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NULL,
    `order_number` VARCHAR(50) NOT NULL,
    `table_name` VARCHAR(50) NOT NULL,
    `type` ENUM('Dine-In', 'Take-Away') NOT NULL DEFAULT 'Dine-In',
    `waiter_name` VARCHAR(100) NOT NULL,
    `status` ENUM('queued', 'cooking', 'ready') NOT NULL DEFAULT 'queued',
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL,
    INDEX `idx_kt_order` (`order_number`),
    INDEX `idx_kt_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kitchen_ticket_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `kitchen_ticket_id` INT NOT NULL,
    `product_id` INT NULL,
    `name` VARCHAR(150) NOT NULL,
    `qty` INT NOT NULL DEFAULT 1,
    `notes` VARCHAR(255) NULL,
    `options_json` LONGTEXT NULL,
    FOREIGN KEY (`kitchen_ticket_id`) REFERENCES `kitchen_tickets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `method` ENUM('cash', 'qris', 'card') NOT NULL DEFAULT 'cash',
    `total_amount` INT NOT NULL DEFAULT 0,
    `amount_paid` INT NOT NULL DEFAULT 0,
    `change_amount` INT NOT NULL DEFAULT 0,
    `reference_code` VARCHAR(100) NULL,
    `user_id` INT NULL,
    `device_id` VARCHAR(64) NULL,
    `paid_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_payments_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sync_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `device_id` VARCHAR(64) NOT NULL,
    `direction` ENUM('push', 'pull') NOT NULL,
    `records_pushed` INT NOT NULL DEFAULT 0,
    `records_pulled` INT NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'success',
    `message` TEXT NULL,
    `synced_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_sync_device` (`device_id`),
    INDEX `idx_sync_time` (`synced_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
