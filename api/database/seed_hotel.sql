USE `cafe_pos`;

-- Seed Room Types for Tenant 1
INSERT INTO `hotel_room_types` (`id`, `tenant_id`, `name`, `code`, `base_price`, `max_adults`, `max_children`, `amenities_json`, `description`, `is_active`) VALUES
(1, 1, 'Standard Single Room', 'STD-SGL', 350000, 1, 0, '["AC", "Single Bed", "Free WiFi", "Hot Shower", "Smart TV"]', 'Kamar nyaman dan praktis untuk pelancong tunggal atau perjalanan bisnis cepat.', 1),
(2, 1, 'Deluxe Double Room', 'DLX-DBL', 550000, 2, 1, '["AC", "Queen Bed", "Free WiFi", "Hot Shower", "Smart TV", "Mini Fridge", "Electric Kettle"]', 'Kamar elegan dengan pemandangan kota dan fasilitas lengkap.', 1),
(3, 1, 'Executive Suite', 'EXE-STE', 950000, 3, 2, '["AC", "King Bed", "Living Room", "Bathtub", "Free WiFi", "Smart TV 55 Inch", "Mini Bar", "Balcony"]', 'Suite mewah dengan ruang tamu terpisah, bathtub pribadi, dan sarapan eksklusif.', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Seed Rooms
INSERT INTO `hotel_rooms` (`id`, `tenant_id`, `room_type_id`, `room_number`, `floor`, `status`) VALUES
(1, 1, 1, '101', 1, 'vacant_clean'),
(2, 1, 1, '102', 1, 'vacant_dirty'),
(3, 1, 2, '201', 2, 'occupied_clean'),
(4, 1, 2, '202', 2, 'vacant_clean'),
(5, 1, 3, '301', 3, 'vacant_clean'),
(6, 1, 3, '302', 3, 'maintenance')
ON DUPLICATE KEY UPDATE `room_number` = VALUES(`room_number`);

-- Seed Demo Guest
INSERT INTO `hotel_guests` (`id`, `tenant_id`, `full_name`, `id_card_type`, `id_card_number`, `phone`, `email`, `address`) VALUES
(1, 1, 'Raden Budi Santoso', 'KTP', '3404123456780001', '081298765432', 'budi.santoso@example.com', 'Jl. Malioboro No. 45, Yogyakarta')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- Seed Active Booking for Room 201
INSERT INTO `hotel_bookings` (`id`, `tenant_id`, `booking_number`, `guest_id`, `room_id`, `source`, `ota_reference_code`, `check_in_date`, `check_out_date`, `actual_check_in_at`, `status`, `night_count`, `rate_per_night`, `deposit_amount`, `total_amount`, `notes`) VALUES
(1, 1, 'BKG-202611-001', 1, 3, 'ota_traveloka', 'TVLK-8829104', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), NOW(), 'checked_in', 2, 550000, 200000, 1100000, 'Tamu request non-smoking room dan bantal ekstra.')
ON DUPLICATE KEY UPDATE `booking_number` = VALUES(`booking_number`);

UPDATE `hotel_rooms` SET `active_booking_id` = 1, `status` = 'occupied_clean' WHERE `id` = 3;

-- Seed Folio for Booking 1
INSERT INTO `hotel_folios` (`id`, `tenant_id`, `booking_id`, `folio_number`, `status`, `total_charges`, `total_payments`, `balance`) VALUES
(1, 1, 1, 'FOL-202611-001', 'open', 1100000, 200000, 900000)
ON DUPLICATE KEY UPDATE `folio_number` = VALUES(`folio_number`);

-- Seed Initial Folio Items (Room Nights + Deposit Payment)
INSERT INTO `hotel_folio_items` (`id`, `tenant_id`, `folio_id`, `category`, `source_order_id`, `description`, `amount`, `quantity`) VALUES
(1, 1, 1, 'room_charge', NULL, 'Deluxe Double Room (2 Malam @ Rp 550.000)', 1100000, 1),
(2, 1, 1, 'payment', NULL, 'Deposit Pembayaran Masuk (QRIS)', -200000, 1)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);
