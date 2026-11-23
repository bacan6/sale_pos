USE `cafe_pos`;

-- 1. Seed Indonesian Hospitality Standard COA for Tenant #1 (Kopi Senja Utama)
INSERT INTO `accounting_accounts` (`tenant_id`, `code`, `name`, `type`, `normal_balance`, `parent_id`, `is_active`, `is_system`) VALUES
(1, '1110', 'Kas Kasir / Laci Kas', 'asset', 'debit', NULL, 1, 1),
(1, '1120', 'Bank Rekening Operasional (BCA/Mandiri/QRIS)', 'asset', 'debit', NULL, 1, 1),
(1, '1130', 'Piutang Tamu / Guest Ledger', 'asset', 'debit', NULL, 1, 1),
(1, '1140', 'Persediaan Bahan Baku Minuman & Makanan', 'asset', 'debit', NULL, 1, 0),
(1, '1150', 'Persediaan Amenitas & Housekeeping', 'asset', 'debit', NULL, 1, 0),
(1, '1510', 'Peralatan & Mesin Kopi', 'asset', 'debit', NULL, 1, 0),
(1, '1520', 'Perlengkapan Kamar Hotel', 'asset', 'debit', NULL, 1, 0),
(1, '2110', 'Hutang Usaha / Supplier', 'liability', 'credit', NULL, 1, 0),
(1, '2120', 'Uang Muka Reservasi Tamu / Deposit Kamar', 'liability', 'credit', NULL, 1, 1),
(1, '2130', 'Hutang Pajak Restoran & Hotel (PB1 10%)', 'liability', 'credit', NULL, 1, 1),
(1, '2140', 'Hutang Service Charge (Pelayanan)', 'liability', 'credit', NULL, 1, 1),
(1, '3100', 'Modal Pemilik', 'equity', 'credit', NULL, 1, 0),
(1, '3200', 'Laba Ditahan', 'equity', 'credit', NULL, 1, 0),
(1, '3300', 'Laba Bersih Tahun Berjalan', 'equity', 'credit', NULL, 1, 1),
(1, '4110', 'Pendapatan Kamar Hotel (Room Revenue)', 'revenue', 'credit', NULL, 1, 1),
(1, '4120', 'Pendapatan Makanan Resto & Cafe', 'revenue', 'credit', NULL, 1, 1),
(1, '4130', 'Pendapatan Minuman Resto & Cafe', 'revenue', 'credit', NULL, 1, 1),
(1, '4140', 'Pendapatan Layanan Tambahan Hotel (Extra Services)', 'revenue', 'credit', NULL, 1, 1),
(1, '5100', 'Harga Pokok Penjualan (HPP) Makanan & Minuman', 'cogs', 'debit', NULL, 1, 1),
(1, '6100', 'Beban Gaji & Upah Karyawan', 'expense', 'debit', NULL, 1, 0),
(1, '6200', 'Beban Listrik, Air & Gas', 'expense', 'debit', NULL, 1, 0),
(1, '6300', 'Beban Operasional Housekeeping & Linen', 'expense', 'debit', NULL, 1, 0),
(1, '6400', 'Beban Selisih Kas Kurang (Cash Shortage)', 'expense', 'debit', NULL, 1, 1),
(1, '7100', 'Pendapatan Selisih Kas Lebih (Cash Overage)', 'revenue', 'credit', NULL, 1, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Configure Default Accounting Settings for Tenant #1
INSERT INTO `accounting_settings` (
    `tenant_id`,
    `cash_account_id`,
    `bank_account_id`,
    `pos_revenue_account_id`,
    `hotel_room_revenue_account_id`,
    `hotel_service_revenue_account_id`,
    `guest_ledger_account_id`,
    `service_charge_account_id`,
    `tax_payable_account_id`,
    `cash_over_account_id`,
    `cash_short_account_id`,
    `cogs_account_id`
)
SELECT 
    1,
    (SELECT id FROM accounting_accounts WHERE tenant_id = 1 AND code = '1110' LIMIT 1),
    (SELECT id FROM accounting_accounts WHERE tenant_id = 1 AND code = '1120' LIMIT 1),
    (SELECT id FROM accounting_accounts WHERE tenant_id = 1 AND code = '4120' LIMIT 1),
    (SELECT id FROM accounting_accounts WHERE tenant_id = 1 AND code = '4110' LIMIT 1),
    (SELECT id FROM accounting_accounts WHERE tenant_id = 1 AND code = '4140' LIMIT 1),
    (SELECT id FROM accounting_accounts WHERE tenant_id = 1 AND code = '1130' LIMIT 1),
    (SELECT id FROM accounting_accounts WHERE tenant_id = 1 AND code = '2140' LIMIT 1),
    (SELECT id FROM accounting_accounts WHERE tenant_id = 1 AND code = '2130' LIMIT 1),
    (SELECT id FROM accounting_accounts WHERE tenant_id = 1 AND code = '7100' LIMIT 1),
    (SELECT id FROM accounting_accounts WHERE tenant_id = 1 AND code = '6400' LIMIT 1),
    (SELECT id FROM accounting_accounts WHERE tenant_id = 1 AND code = '5100' LIMIT 1)
ON DUPLICATE KEY UPDATE `cash_account_id` = VALUES(`cash_account_id`);

-- 3. Seed Initial Open Accounting Period for Current Month
INSERT INTO `accounting_periods` (`tenant_id`, `period_name`, `start_date`, `end_date`, `status`)
VALUES (1, 'November 2026', '2026-11-01', '2026-11-30', 'open')
ON DUPLICATE KEY UPDATE `period_name` = VALUES(`period_name`);
