USE `cafe_pos`;

-- 1. Modify users role enum to include accountant and manager
ALTER TABLE `users` 
MODIFY COLUMN `role` ENUM('admin', 'accountant', 'manager', 'cashier', 'waitstaff', 'kitchen', 'kiosk') NOT NULL DEFAULT 'cashier';

-- 2. Accounting Accounts (Chart of Accounts / COA)
CREATE TABLE IF NOT EXISTS `accounting_accounts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `type` ENUM('asset', 'liability', 'equity', 'revenue', 'cogs', 'expense') NOT NULL,
    `normal_balance` ENUM('debit', 'credit') NOT NULL,
    `parent_id` INT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `is_system` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_acc_tenant_code` (`tenant_id`, `code`),
    INDEX `idx_acc_tenant_type` (`tenant_id`, `type`),
    INDEX `idx_acc_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Accounting Periods
CREATE TABLE IF NOT EXISTS `accounting_periods` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `period_name` VARCHAR(100) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    `closed_at` DATETIME NULL,
    `closed_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_period_tenant_status` (`tenant_id`, `status`),
    INDEX `idx_period_dates` (`tenant_id`, `start_date`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Accounting Journal Entries (Jurnal Umum)
CREATE TABLE IF NOT EXISTS `accounting_journal_entries` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `entry_number` VARCHAR(50) NOT NULL,
    `entry_date` DATE NOT NULL,
    `reference_type` ENUM('manual', 'pos_shift_close', 'hotel_night_audit', 'hotel_folio', 'period_closing', 'adjustment') NOT NULL DEFAULT 'manual',
    `reference_id` INT NULL,
    `notes` TEXT NULL,
    `status` ENUM('posted', 'void') NOT NULL DEFAULT 'posted',
    `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `created_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_journal_tenant_num` (`tenant_id`, `entry_number`),
    INDEX `idx_journal_tenant_date` (`tenant_id`, `entry_date`),
    INDEX `idx_journal_ref` (`tenant_id`, `reference_type`, `reference_id`),
    INDEX `idx_journal_status` (`tenant_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Accounting Journal Items
CREATE TABLE IF NOT EXISTS `accounting_journal_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL,
    `journal_entry_id` INT NOT NULL,
    `account_id` INT NOT NULL,
    `debit` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `credit` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `memo` VARCHAR(255) NULL,
    INDEX `idx_jitem_entry` (`journal_entry_id`),
    INDEX `idx_jitem_account` (`tenant_id`, `account_id`),
    FOREIGN KEY (`journal_entry_id`) REFERENCES `accounting_journal_entries`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Accounting Settings (Default Account Mapping for Auto-Posting)
CREATE TABLE IF NOT EXISTS `accounting_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT NOT NULL UNIQUE,
    `cash_account_id` INT NULL,
    `bank_account_id` INT NULL,
    `pos_revenue_account_id` INT NULL,
    `hotel_room_revenue_account_id` INT NULL,
    `hotel_service_revenue_account_id` INT NULL,
    `guest_ledger_account_id` INT NULL,
    `service_charge_account_id` INT NULL,
    `tax_payable_account_id` INT NULL,
    `cash_over_account_id` INT NULL,
    `cash_short_account_id` INT NULL,
    `cogs_account_id` INT NULL,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
