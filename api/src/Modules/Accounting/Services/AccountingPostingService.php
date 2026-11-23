<?php
declare(strict_types=1);

namespace App\Modules\Accounting\Services;

use App\Core\Database;
use Exception;
use PDO;

class AccountingPostingService {
    public static function generateEntryNumber(PDO $db, int $tenantId, string $date): string {
        $yearMonth = date('Ym', strtotime($date));
        $prefix = "JV-{$yearMonth}-";

        $stmt = $db->prepare('SELECT entry_number FROM accounting_journal_entries 
                              WHERE tenant_id = ? AND entry_number LIKE ? 
                              ORDER BY id DESC LIMIT 1 FOR UPDATE');
        $stmt->execute([$tenantId, "{$prefix}%"]);
        $lastNumber = $stmt->fetchColumn();

        if ($lastNumber) {
            $seq = (int)substr((string)$lastNumber, strlen($prefix)) + 1;
        } else {
            $seq = 1;
        }

        return $prefix . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);
    }

    public static function getSettings(PDO $db, int $tenantId): array {
        $stmt = $db->prepare('SELECT * FROM accounting_settings WHERE tenant_id = ? LIMIT 1');
        $stmt->execute([$tenantId]);
        $settings = $stmt->fetch();
        if ($settings) {
            return $settings;
        }

        // Fallback: auto-create default settings mapping by code
        $accStmt = $db->prepare('SELECT id, code FROM accounting_accounts WHERE tenant_id = ?');
        $accStmt->execute([$tenantId]);
        $accounts = $accStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        $defaultMap = [
            'cash_account_id' => $accounts['1110'] ?? null,
            'bank_account_id' => $accounts['1120'] ?? null,
            'guest_ledger_account_id' => $accounts['1130'] ?? null,
            'pos_revenue_account_id' => $accounts['4120'] ?? null,
            'hotel_room_revenue_account_id' => $accounts['4110'] ?? null,
            'hotel_service_revenue_account_id' => $accounts['4140'] ?? null,
            'service_charge_account_id' => $accounts['2140'] ?? null,
            'tax_payable_account_id' => $accounts['2130'] ?? null,
            'cash_over_account_id' => $accounts['7100'] ?? null,
            'cash_short_account_id' => $accounts['6400'] ?? null,
            'cogs_account_id' => $accounts['5100'] ?? null,
        ];

        $ins = $db->prepare('INSERT INTO accounting_settings 
            (tenant_id, cash_account_id, bank_account_id, pos_revenue_account_id, hotel_room_revenue_account_id, 
             hotel_service_revenue_account_id, guest_ledger_account_id, service_charge_account_id, 
             tax_payable_account_id, cash_over_account_id, cash_short_account_id, cogs_account_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $ins->execute([
            $tenantId,
            $defaultMap['cash_account_id'],
            $defaultMap['bank_account_id'],
            $defaultMap['pos_revenue_account_id'],
            $defaultMap['hotel_room_revenue_account_id'],
            $defaultMap['hotel_service_revenue_account_id'],
            $defaultMap['guest_ledger_account_id'],
            $defaultMap['service_charge_account_id'],
            $defaultMap['tax_payable_account_id'],
            $defaultMap['cash_over_account_id'],
            $defaultMap['cash_short_account_id'],
            $defaultMap['cogs_account_id'],
        ]);

        return array_merge(['tenant_id' => $tenantId], $defaultMap);
    }

    public static function createJournalEntry(
        PDO $db,
        int $tenantId,
        string $entryDate,
        string $referenceType,
        ?int $referenceId,
        string $notes,
        array $items,
        ?int $userId = null
    ): array {
        if (empty($items)) {
            throw new Exception('Jurnal harus memiliki minimal 2 baris akun');
        }

        $totalDebit = 0.0;
        $totalCredit = 0.0;
        $cleanItems = [];

        foreach ($items as $item) {
            $accountId = (int)($item['account_id'] ?? 0);
            $debit = round((float)($item['debit'] ?? 0), 2);
            $credit = round((float)($item['credit'] ?? 0), 2);
            $memo = trim((string)($item['memo'] ?? ''));

            if ($accountId <= 0) {
                throw new Exception('Setiap baris jurnal harus memiliki akun yang valid');
            }
            if ($debit < 0 || $credit < 0) {
                throw new Exception('Nominal debit/kredit tidak boleh negatif');
            }
            if ($debit === 0.0 && $credit === 0.0) {
                continue;
            }
            if ($debit > 0 && $credit > 0) {
                throw new Exception('Satu baris hanya boleh diisi debit atau kredit, tidak keduanya');
            }

            $totalDebit += $debit;
            $totalCredit += $credit;
            $cleanItems[] = [
                'account_id' => $accountId,
                'debit' => $debit,
                'credit' => $credit,
                'memo' => $memo,
            ];
        }

        if (count($cleanItems) < 2) {
            throw new Exception('Jurnal harus memiliki minimal satu debit dan satu kredit');
        }

        if (abs($totalDebit - $totalCredit) > 0.01) {
            throw new Exception("Jurnal tidak seimbang! Total Debit (Rp " . number_format($totalDebit, 2) . ") != Total Kredit (Rp " . number_format($totalCredit, 2) . ")");
        }

        if ($totalDebit <= 0) {
            throw new Exception('Total nominal jurnal harus lebih besar dari 0');
        }

        $entryNumber = self::generateEntryNumber($db, $tenantId, $entryDate);

        $stmt = $db->prepare('INSERT INTO accounting_journal_entries 
            (tenant_id, entry_number, entry_date, reference_type, reference_id, notes, status, total_amount, created_by)
            VALUES (?, ?, ?, ?, ?, ?, "posted", ?, ?)');
        $stmt->execute([
            $tenantId,
            $entryNumber,
            $entryDate,
            $referenceType,
            $referenceId,
            $notes,
            $totalDebit,
            $userId,
        ]);
        $journalId = (int)$db->lastInsertId();

        $itemStmt = $db->prepare('INSERT INTO accounting_journal_items 
            (tenant_id, journal_entry_id, account_id, debit, credit, memo)
            VALUES (?, ?, ?, ?, ?, ?)');

        foreach ($cleanItems as $item) {
            $itemStmt->execute([
                $tenantId,
                $journalId,
                $item['account_id'],
                $item['debit'],
                $item['credit'],
                $item['memo'] ?: $notes,
            ]);
        }

        return [
            'id' => $journalId,
            'entry_number' => $entryNumber,
            'entry_date' => $entryDate,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'total_amount' => $totalDebit,
            'items_count' => count($cleanItems),
        ];
    }

    public static function postPosShiftSummary(PDO $db, int $tenantId, int $shiftId): ?array {
        // Prevent duplicate posting
        $checkStmt = $db->prepare('SELECT id, entry_number FROM accounting_journal_entries 
                                  WHERE tenant_id = ? AND reference_type = "pos_shift_close" AND reference_id = ? AND status = "posted" LIMIT 1');
        $checkStmt->execute([$tenantId, $shiftId]);
        $existing = $checkStmt->fetch();
        if ($existing) {
            return $existing;
        }

        $sStmt = $db->prepare('SELECT * FROM pos_shifts WHERE id = ? AND tenant_id = ? LIMIT 1');
        $sStmt->execute([$shiftId, $tenantId]);
        $shift = $sStmt->fetch();
        if (!$shift || $shift['status'] !== 'closed') {
            return null;
        }

        $settings = self::getSettings($db, $tenantId);
        $cashAcc = (int)($settings['cash_account_id'] ?? 0);
        $bankAcc = (int)($settings['bank_account_id'] ?? 0);
        $posRevAcc = (int)($settings['pos_revenue_account_id'] ?? 0);
        $cashShortAcc = (int)($settings['cash_short_account_id'] ?? 0);
        $cashOverAcc = (int)($settings['cash_over_account_id'] ?? 0);

        if (!$cashAcc || !$bankAcc || !$posRevAcc) {
            throw new Exception('Pengaturan akun akuntansi (Kas, Bank, Pendapatan POS) belum lengkap untuk tenant ini');
        }

        $totalCash = (float)($shift['total_cash_sales'] ?? 0);
        $totalNonCash = (float)($shift['total_non_cash_sales'] ?? 0);
        $totalSales = (float)($shift['total_sales'] ?? ($totalCash + $totalNonCash));
        $diff = (float)($shift['cash_discrepancy'] ?? ($shift['difference_amount'] ?? 0));

        if ($totalSales <= 0 && $diff == 0) {
            return null;
        }

        $items = [];
        $actualCash = (float)($shift['closing_cash_actual'] ?? ($shift['actual_cash_end'] ?? 0)) - (float)($shift['opening_cash'] ?? 0);
        if ($actualCash <= 0 && $totalCash > 0) {
            $actualCash = $totalCash + $diff;
        }

        if ($actualCash > 0) {
            $items[] = [
                'account_id' => $cashAcc,
                'debit' => $actualCash,
                'credit' => 0,
                'memo' => "Penerimaan Kas Shift #{$shiftId}",
            ];
        }

        if ($totalNonCash > 0) {
            $items[] = [
                'account_id' => $bankAcc,
                'debit' => $totalNonCash,
                'credit' => 0,
                'memo' => "Penerimaan Bank/QRIS/Card Shift #{$shiftId}",
            ];
        }

        if ($diff < 0 && $cashShortAcc) {
            $items[] = [
                'account_id' => $cashShortAcc,
                'debit' => abs($diff),
                'credit' => 0,
                'memo' => "Selisih Kas Kurang Shift #{$shiftId}",
            ];
        }

        if ($totalSales > 0) {
            $items[] = [
                'account_id' => $posRevAcc,
                'debit' => 0,
                'credit' => $totalSales,
                'memo' => "Pendapatan Penjualan Cafe/POS Shift #{$shiftId}",
            ];
        }

        if ($diff > 0 && $cashOverAcc) {
            $items[] = [
                'account_id' => $cashOverAcc,
                'debit' => 0,
                'credit' => $diff,
                'memo' => "Selisih Kas Lebih Shift #{$shiftId}",
            ];
        }

        // Verify balance before creation
        $tDebit = array_sum(array_column($items, 'debit'));
        $tCredit = array_sum(array_column($items, 'credit'));
        if (abs($tDebit - $tCredit) > 0.01) {
            // Adjust to ensure exact zero imbalance
            $gap = round($tDebit - $tCredit, 2);
            if ($gap > 0 && $cashOverAcc) {
                $items[] = ['account_id' => $cashOverAcc, 'debit' => 0, 'credit' => $gap, 'memo' => 'Penyeimbang Selisih Kas'];
            } elseif ($gap < 0 && $cashShortAcc) {
                $items[] = ['account_id' => $cashShortAcc, 'debit' => abs($gap), 'credit' => 0, 'memo' => 'Penyeimbang Selisih Kas'];
            }
        }

        $date = !empty($shift['closed_at']) ? substr((string)$shift['closed_at'], 0, 10) : date('Y-m-d');
        $notes = "Ringkasan Penutupan Shift Kasir POS #{$shiftId}";

        return self::createJournalEntry($db, $tenantId, $date, 'pos_shift_close', $shiftId, $notes, $items, (int)($shift['user_id'] ?? null));
    }

    public static function postHotelNightAuditSummary(PDO $db, int $tenantId, int $auditId): ?array {
        $checkStmt = $db->prepare('SELECT id, entry_number FROM accounting_journal_entries 
                                  WHERE tenant_id = ? AND reference_type = "hotel_night_audit" AND reference_id = ? AND status = "posted" LIMIT 1');
        $checkStmt->execute([$tenantId, $auditId]);
        $existing = $checkStmt->fetch();
        if ($existing) {
            return $existing;
        }

        $aStmt = $db->prepare('SELECT * FROM hotel_night_audits WHERE id = ? AND tenant_id = ? LIMIT 1');
        $aStmt->execute([$auditId, $tenantId]);
        $audit = $aStmt->fetch();
        if (!$audit) {
            return null;
        }

        $settings = self::getSettings($db, $tenantId);
        $guestLedgerAcc = (int)($settings['guest_ledger_account_id'] ?? 0);
        $roomRevAcc = (int)($settings['hotel_room_revenue_account_id'] ?? 0);
        $serviceChargeAcc = (int)($settings['service_charge_account_id'] ?? 0);
        $taxPayableAcc = (int)($settings['tax_payable_account_id'] ?? 0);

        if (!$guestLedgerAcc || !$roomRevAcc) {
            throw new Exception('Pengaturan akun akuntansi (Guest Ledger, Pendapatan Kamar Hotel) belum lengkap');
        }

        $totalRoomRevenue = (float)($audit['total_revenue'] ?? 0);
        if ($totalRoomRevenue <= 0) {
            return null;
        }

        $serviceCharge = $serviceChargeAcc ? round($totalRoomRevenue * 0.05, 2) : 0.0;
        $taxAmount = $taxPayableAcc ? round(($totalRoomRevenue + $serviceCharge) * 0.10, 2) : 0.0;
        $totalGuestReceivable = round($totalRoomRevenue + $serviceCharge + $taxAmount, 2);

        $items = [
            [
                'account_id' => $guestLedgerAcc,
                'debit' => $totalGuestReceivable,
                'credit' => 0,
                'memo' => "Tagihan Tamu / Guest Ledger Audit {$audit['audit_date']}",
            ],
            [
                'account_id' => $roomRevAcc,
                'debit' => 0,
                'credit' => $totalRoomRevenue,
                'memo' => "Pendapatan Kamar Hotel (Room Revenue) {$audit['audit_date']}",
            ],
        ];

        if ($serviceCharge > 0 && $serviceChargeAcc) {
            $items[] = [
                'account_id' => $serviceChargeAcc,
                'debit' => 0,
                'credit' => $serviceCharge,
                'memo' => "Service Charge Hotel {$audit['audit_date']}",
            ];
        }

        if ($taxAmount > 0 && $taxPayableAcc) {
            $items[] = [
                'account_id' => $taxPayableAcc,
                'debit' => 0,
                'credit' => $taxAmount,
                'memo' => "Pajak Hotel PB1 10% {$audit['audit_date']}",
            ];
        }

        $date = (string)$audit['audit_date'];
        $notes = "Ringkasan Night Audit Hotel {$date} (Okupansi: " . ($audit['occupancy_rate'] ?? 0) . "%)";

        return self::createJournalEntry($db, $tenantId, $date, 'hotel_night_audit', $auditId, $notes, $items, (int)($audit['audited_by'] ?? null));
    }
}
