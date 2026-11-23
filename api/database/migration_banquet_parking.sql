USE `cafe_pos`;

-- 1. Banquet Rooms (Ruang Rapat, Hall, Ballroom)
CREATE TABLE IF NOT EXISTS `banquet_rooms` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `floor` VARCHAR(50) NULL,
    `area_sqm` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    `capacity_theater` INT NOT NULL DEFAULT 0,
    `capacity_classroom` INT NOT NULL DEFAULT 0,
    `capacity_u_shape` INT NOT NULL DEFAULT 0,
    `capacity_banquet` INT NOT NULL DEFAULT 0,
    `rate_per_hour` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `rate_half_day` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `rate_full_day` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `facilities_json` JSON NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_banquet_room_tenant_code` (`tenant_id`, `code`),
    INDEX `idx_banquet_room_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Banquet Packages (Paket Meeting, Coffee Break, Paket Pernikahan/Seminar)
CREATE TABLE IF NOT EXISTS `banquet_packages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `category` ENUM('meeting', 'wedding', 'social', 'equipment', 'catering') NOT NULL DEFAULT 'meeting',
    `price_per_pax` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `min_pax` INT NOT NULL DEFAULT 10,
    `includes_json` JSON NULL,
    `description` VARCHAR(255) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_banquet_pkg_tenant_code` (`tenant_id`, `code`),
    INDEX `idx_banquet_pkg_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Banquet Bookings (BEO - Banquet Event Orders)
CREATE TABLE IF NOT EXISTS `banquet_bookings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `booking_number` VARCHAR(50) NOT NULL,
    `banquet_room_id` INT NOT NULL,
    `customer_name` VARCHAR(150) NOT NULL,
    `customer_phone` VARCHAR(50) NULL,
    `customer_email` VARCHAR(100) NULL,
    `company_name` VARCHAR(150) NULL,
    `event_name` VARCHAR(200) NOT NULL,
    `event_type` ENUM('meeting', 'seminar', 'workshop', 'wedding', 'gathering', 'other') NOT NULL DEFAULT 'meeting',
    `layout_type` ENUM('theater', 'classroom', 'u_shape', 'banquet_round', 'hollow_square') NOT NULL DEFAULT 'classroom',
    `pax_count` INT NOT NULL DEFAULT 20,
    `start_time` DATETIME NOT NULL,
    `end_time` DATETIME NOT NULL,
    `package_id` INT NULL,
    `subtotal_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `equipment_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `catering_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `deposit_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `payment_status` ENUM('pending', 'partial', 'paid', 'folio_charge') NOT NULL DEFAULT 'pending',
    `status` ENUM('draft', 'confirmed', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    `hotel_booking_id` INT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_banquet_booking_tenant_number` (`tenant_id`, `booking_number`),
    INDEX `idx_banquet_booking_room_time` (`tenant_id`, `banquet_room_id`, `start_time`, `end_time`),
    INDEX `idx_banquet_booking_status` (`tenant_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Banquet Booking Items / Add-ons (Equipment, Catering, Extra Hours)
CREATE TABLE IF NOT EXISTS `banquet_booking_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `banquet_booking_id` INT NOT NULL,
    `item_type` ENUM('package', 'equipment', 'catering', 'extra_hours', 'other') NOT NULL DEFAULT 'equipment',
    `name` VARCHAR(150) NOT NULL,
    `qty` INT NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_banquet_items_booking` (`tenant_id`, `banquet_booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Parking Rates (Tarif Parkir Per Jenis Kendaraan)
CREATE TABLE IF NOT EXISTS `parking_rates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `vehicle_type` ENUM('motorcycle', 'car', 'bus', 'truck') NOT NULL DEFAULT 'car',
    `name` VARCHAR(100) NOT NULL,
    `base_rate` DECIMAL(15,2) NOT NULL DEFAULT 3000.00,
    `hourly_rate` DECIMAL(15,2) NOT NULL DEFAULT 2000.00,
    `daily_max_rate` DECIMAL(15,2) NOT NULL DEFAULT 50000.00,
    `grace_period_minutes` INT NOT NULL DEFAULT 10,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_parking_rates_tenant_type` (`tenant_id`, `vehicle_type`),
    INDEX `idx_parking_rates_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Parking Gates (Palang Pintu Masuk / Keluar)
CREATE TABLE IF NOT EXISTS `parking_gates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `gate_code` VARCHAR(50) NOT NULL,
    `gate_name` VARCHAR(100) NOT NULL,
    `gate_type` ENUM('in', 'out', 'bidirectional') NOT NULL DEFAULT 'in',
    `vehicle_type_allowed` VARCHAR(100) NOT NULL DEFAULT 'all',
    `ip_address` VARCHAR(50) NULL,
    `relay_pin` INT NULL,
    `status` ENUM('online', 'offline', 'error') NOT NULL DEFAULT 'online',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_parking_gates_tenant_code` (`tenant_id`, `gate_code`),
    INDEX `idx_parking_gates_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Parking Tickets / Sessions (Sesi Kendaraan Masuk & Keluar)
CREATE TABLE IF NOT EXISTS `parking_tickets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `ticket_number` VARCHAR(50) NOT NULL,
    `barcode_code` VARCHAR(50) NOT NULL,
    `vehicle_type` ENUM('motorcycle', 'car', 'bus', 'truck') NOT NULL DEFAULT 'car',
    `plate_number` VARCHAR(30) NOT NULL,
    `entry_time` DATETIME NOT NULL,
    `exit_time` DATETIME NULL,
    `entry_gate_id` INT NOT NULL,
    `exit_gate_id` INT NULL,
    `duration_minutes` INT NOT NULL DEFAULT 0,
    `parking_fee` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `payment_method` ENUM('cash', 'qris', 'hotel_complimentary', 'banquet_pass', 'unpaid') NOT NULL DEFAULT 'unpaid',
    `hotel_booking_id` INT NULL,
    `banquet_booking_id` INT NULL,
    `status` ENUM('parked', 'paid', 'exited', 'lost_ticket') NOT NULL DEFAULT 'parked',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_parking_tickets_barcode` (`tenant_id`, `barcode_code`),
    INDEX `idx_parking_tickets_plate` (`tenant_id`, `plate_number`),
    INDEX `idx_parking_tickets_status` (`tenant_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Smart Locks & Access Gate Relays (IoT Devices)
CREATE TABLE IF NOT EXISTS `smart_locks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `device_code` VARCHAR(50) NOT NULL,
    `device_name` VARCHAR(150) NOT NULL,
    `lock_type` ENUM('barrier_gate', 'hotel_room', 'meeting_room', 'entrance_door') NOT NULL DEFAULT 'meeting_room',
    `target_id` INT NULL,
    `device_model` VARCHAR(100) NOT NULL DEFAULT 'SmartLock-Pro-WiFi',
    `mac_address` VARCHAR(50) NULL,
    `ip_address` VARCHAR(50) NULL,
    `battery_level` INT NOT NULL DEFAULT 100,
    `is_locked` TINYINT(1) NOT NULL DEFAULT 1,
    `current_passcode` VARCHAR(20) NULL,
    `passcode_expires_at` DATETIME NULL,
    `last_synced_at` DATETIME NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_smart_locks_tenant_code` (`tenant_id`, `device_code`),
    INDEX `idx_smart_locks_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Smart Lock Access Logs (Histori Pembukaan Akses & Sensor)
CREATE TABLE IF NOT EXISTS `smart_lock_access_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `smart_lock_id` INT NOT NULL,
    `auth_method` ENUM('pin', 'rfid', 'remote_api', 'webhook', 'manual_key') NOT NULL DEFAULT 'remote_api',
    `credential_identifier` VARCHAR(100) NULL,
    `access_status` ENUM('granted', 'denied') NOT NULL DEFAULT 'granted',
    `notes` VARCHAR(255) NULL,
    `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_lock_logs_tenant` (`tenant_id`, `smart_lock_id`),
    INDEX `idx_lock_logs_time` (`tenant_id`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Default Seed Data for Tenant #1
INSERT INTO `banquet_rooms` (`tenant_id`, `name`, `code`, `floor`, `area_sqm`, `capacity_theater`, `capacity_classroom`, `capacity_u_shape`, `capacity_banquet`, `rate_per_hour`, `rate_half_day`, `rate_full_day`, `facilities_json`)
VALUES 
(1, 'Grand Ballroom Nusantara', 'RM-GBR-01', 'Lantai 2', 450.00, 400, 250, 120, 300, 1500000.00, 5000000.00, 9000000.00, '["Sound System 5000W", "Dual Projector Laser", "Stage 8x4m", "WiFi 200Mbps", "VIP Lounge"]'),
(1, 'Meeting Room Jayakarta', 'RM-MR-01', 'Lantai 1', 75.00, 50, 35, 25, 30, 350000.00, 1200000.00, 2000000.00, '["Smart TV 65 Inch", "Whiteboard", "High-speed WiFi", "Conference Mic"]'),
(1, 'Meeting Room Sriwijaya', 'RM-MR-02', 'Lantai 1', 60.00, 40, 25, 20, 24, 300000.00, 1000000.00, 1800000.00, '["Projector FHD", "Flipchart", "WiFi", "Sound System"]')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `banquet_packages` (`tenant_id`, `name`, `code`, `category`, `price_per_pax`, `min_pax`, `includes_json`, `description`)
VALUES
(1, 'Half-Day Meeting Package', 'PKG-HD-01', 'meeting', 125000.00, 15, '["Ruang Rapat 4 Jam", "1x Coffee Break + Snacks", "Standard Sound System", "Air Mineral & Permen", "Notepad & Pulpen"]', 'Paket rapat setengah hari hemat dan praktis'),
(1, 'Full-Day Meeting Package', 'PKG-FD-01', 'meeting', 225000.00, 20, '["Ruang Rapat 8 Jam", "2x Coffee Break", "1x Makan Siang Prasmanan", "Smart Projector", "Sound System", "Notepad"]', 'Paket meeting lengkap seharian penuh'),
(1, 'Ballroom Gala / Wedding Buffet', 'PKG-WD-01', 'wedding', 185000.00, 100, '["Penggunaan Grand Ballroom 6 Jam", "Prasmanan Mewah 5 Menu Utama", "Kue Pengantin / Dessert Corner", "Sound System & Panggung"]', 'Paket perayaan pesta atau resepsi pernikahan')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `parking_rates` (`tenant_id`, `vehicle_type`, `name`, `base_rate`, `hourly_rate`, `daily_max_rate`, `grace_period_minutes`)
VALUES
(1, 'motorcycle', 'Sepeda Motor Roda 2', 2000.00, 1000.00, 20000.00, 10),
(1, 'car', 'Mobil Penumpang Roda 4', 4000.00, 2000.00, 50000.00, 10),
(1, 'bus', 'Bus / Truk Pariwisata', 10000.00, 5000.00, 100000.00, 15)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `parking_gates` (`tenant_id`, `gate_code`, `gate_name`, `gate_type`, `vehicle_type_allowed`, `ip_address`, `status`)
VALUES
(1, 'GATE-IN-01', 'Gerbang Masuk Utama Depan', 'in', 'all', '192.168.1.201', 'online'),
(1, 'GATE-OUT-01', 'Gerbang Keluar Kasir Pos 1', 'out', 'all', '192.168.1.202', 'online')
ON DUPLICATE KEY UPDATE `gate_name` = VALUES(`gate_name`);

INSERT INTO `smart_locks` (`tenant_id`, `device_code`, `device_name`, `lock_type`, `target_id`, `device_model`, `mac_address`, `battery_level`, `is_locked`, `current_passcode`)
VALUES
(1, 'LOCK-GATE-01', 'Barrier Gate Controller Masuk', 'barrier_gate', 1, 'ESP32-Relay-Gate-v2', '24:6F:28:AB:11:01', 100, 1, '123456'),
(1, 'LOCK-MEET-01', 'Smart Lock Meeting Room Jayakarta', 'meeting_room', 2, 'Tuya-Zigbee-Mortise-Pro', 'B4:E6:2D:54:33:A2', 92, 1, '789012'),
(1, 'LOCK-BALL-01', 'Smart Access Grand Ballroom', 'meeting_room', 1, 'TTlock-WiFi-Gateway-Gen3', '98:F4:AB:12:88:C1', 88, 1, '654321')
ON DUPLICATE KEY UPDATE `device_name` = VALUES(`device_name`);
