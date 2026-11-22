USE `cafe_pos`;

-- Default Device for API testing & POS sync
INSERT INTO `devices` (`device_id`, `device_secret`, `name`, `role`, `is_active`) VALUES
('POS-KASIR-01', 'sec_kopi_senja_kasir_987213', 'Kasir Utama Tablet', 'cashier', 1),
('POS-WAITSTAFF-01', 'sec_kopi_senja_waitstaff_112233', 'Handheld Pramuniaga Andi', 'waitstaff', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Default Users
INSERT INTO `users` (`username`, `password_hash`, `full_name`, `role`, `is_active`) VALUES
('admin', '$2y$10$wT8K8U4b1.996KvZ7u0f5.29s0vj1bO3WfH6G9C7Y3k5.0s4k.y.O', 'Administrator', 'admin', 1),
('kasir01', '$2y$10$wT8K8U4b1.996KvZ7u0f5.29s0vj1bO3WfH6G9C7Y3k5.0s4k.y.O', 'Siti Rahma (Kasir 01)', 'cashier', 1),
('waitstaff01', '$2y$10$wT8K8U4b1.996KvZ7u0f5.29s0vj1bO3WfH6G9C7Y3k5.0s4k.y.O', 'Andi Pratama (Pramuniaga)', 'waitstaff', 1)
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- Default Product Categories
INSERT INTO `product_categories` (`id`, `name`, `code`, `sort_order`, `is_active`) VALUES
(1, 'Coffee', 'CAT-CF', 1, 1),
(2, 'Non-Coffee', 'CAT-NC', 2, 1),
(3, 'Snacks', 'CAT-SN', 3, 1),
(4, 'Heavy Meal', 'CAT-HM', 4, 1),
(5, 'Dessert', 'CAT-DS', 5, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Default Room Categories (Zonasi Ruangan)
INSERT INTO `room_categories` (`id`, `name`, `description`, `sort_order`, `is_active`) VALUES
(1, 'Indoor', 'Area berpendingin ruangan (Non-Smoking AC)', 1, 1),
(2, 'Outdoor', 'Area luar ruangan / teras (Smoking Area)', 2, 1),
(3, 'VIP Area', 'Ruangan khusus pertemuan & privasi dengan AC', 3, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Default Products
INSERT INTO `products` (`id`, `code`, `name`, `category_id`, `price`, `cost`, `stock`, `is_available`, `image`, `description`, `options_json`) VALUES
(1, 'CF-001', 'Espresso Single', 1, 18000, 5000, 99, 1, 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&auto=format&fit=crop&q=80', 'Single shot rich extraction 100% Arabica beans.', NULL),
(2, 'CF-002', 'Cafe Latte', 1, 28000, 8000, 50, 1, 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=400&auto=format&fit=crop&q=80', 'Smooth espresso with velvety steamed fresh milk.', '[{"name":"Sugar","choices":["Normal","Less Sugar","No Sugar"]},{"name":"Milk","choices":["Fresh Milk","Oatmilk (+6k)","Almond Milk (+8k)"]}]'),
(3, 'CF-003', 'Caramel Macchiato', 1, 32000, 10000, 42, 1, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&auto=format&fit=crop&q=80', 'Espresso layered with vanilla syrup and caramel drizzle.', '[{"name":"Temperature","choices":["Iced","Hot"]},{"name":"Sugar","choices":["Normal","Less Sugar"]}]'),
(4, 'NC-001', 'Matcha Green Tea Latte', 2, 30000, 9000, 35, 1, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80', 'Pure Uji matcha powder blended with creamy milk.', '[{"name":"Temperature","choices":["Iced","Hot"]}]'),
(5, 'NC-002', 'Signature Ice Chocolate', 2, 28000, 8500, 40, 1, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&auto=format&fit=crop&q=80', 'Belgian dark chocolate ganache with chilled milk.', NULL),
(6, 'SN-001', 'French Fries Truffle Mayo', 3, 25000, 7000, 60, 1, 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=400&auto=format&fit=crop&q=80', 'Crispy straight-cut potatoes with truffle mayo dip.', NULL),
(7, 'HM-001', 'Nasi Goreng Kampung', 4, 38000, 14000, 25, 1, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop&q=80', 'Traditional fried rice served with fried egg, satay, and crackers.', '[{"name":"Spicy Level","choices":["Tidak Pedas","Sedang","Pedas Banget"]}]'),
(8, 'HM-002', 'Spaghetti Aglio Olio Smoked Beef', 4, 42000, 16000, 20, 1, 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&auto=format&fit=crop&q=80', 'Al dente spaghetti tossed with olive oil, garlic, chili flakes, and smoked beef.', NULL),
(9, 'DS-001', 'Croissant Butter Original', 5, 22000, 8000, 15, 1, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80', 'Flaky and buttery French laminated pastry baked fresh daily.', NULL)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Default Tables
INSERT INTO `tables` (`id`, `name`, `capacity`, `room_category_id`, `status`, `active_order_number`, `active_order_total`, `guest_count`) VALUES
(1, 'Meja 01', 2, 1, 'occupied', 'ORD-108', 84000, 2),
(2, 'Meja 02', 4, 1, 'available', NULL, 0, 0),
(3, 'Meja 03', 4, 1, 'billing', 'ORD-105', 142000, 3),
(4, 'Meja 04', 6, 1, 'reserved', NULL, 0, 5),
(5, 'Meja 05', 2, 2, 'occupied', 'ORD-109', 56000, 1),
(6, 'Meja 06', 4, 2, 'available', NULL, 0, 0),
(7, 'Meja 07', 4, 2, 'available', NULL, 0, 0),
(8, 'VIP 01', 10, 3, 'reserved', NULL, 0, 8),
(9, 'VIP 02', 8, 3, 'available', NULL, 0, 0)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
