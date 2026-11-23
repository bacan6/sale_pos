<?php
declare(strict_types=1);

namespace App\Modules\Accounting\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use PDO;

class GeneralLedgerController {
    public function ledger(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $accountId = (int)(Request::query('account_id') ?: 0);
        $startDate = Request::query('start_date') ?: date('Y-m-01');
        $endDate = Request::query('end_date') ?: date('Y-m-d');

        if ($accountId <= 0) {
            // Return summary of all accounts with movement in date range
            $stmt = $db->prepare('SELECT a.id, a.code, a.name, a.type, a.normal_balance,
                                         COALESCE(SUM(CASE WHEN je.entry_date < ? THEN (ji.debit - ji.credit) ELSE 0 END), 0) as prior_raw,
                                         COALESCE(SUM(CASE WHEN je.entry_date BETWEEN ? AND ? THEN ji.debit ELSE 0 END), 0) as period_debit,
                                         COALESCE(SUM(CASE WHEN je.entry_date BETWEEN ? AND ? THEN ji.credit ELSE 0 END), 0) as period_credit,
                                         COALESCE(SUM(CASE WHEN je.entry_date <= ? THEN (ji.debit - ji.credit) ELSE 0 END), 0) as ending_raw
                                  FROM accounting_accounts a
                                  LEFT JOIN accounting_journal_items ji ON a.id = ji.account_id
                                  LEFT JOIN accounting_journal_entries je ON ji.journal_entry_id = je.id AND je.status = "posted"
                                  WHERE a.tenant_id = ? AND a.is_active = 1
                                  GROUP BY a.id, a.code, a.name, a.type, a.normal_balance
                                  ORDER BY a.code ASC');
            $stmt->execute([$startDate, $startDate, $endDate, $startDate, $endDate, $endDate, $tenantId]);
            $rows = $stmt->fetchAll();

            foreach ($rows as &$r) {
                $isCredit = $r['normal_balance'] === 'credit';
                $r['opening_balance'] = $isCredit ? -(float)$r['prior_raw'] : (float)$r['prior_raw'];
                $r['ending_balance'] = $isCredit ? -(float)$r['ending_raw'] : (float)$r['ending_raw'];
                $r['period_debit'] = (float)$r['period_debit'];
                $r['period_credit'] = (float)$r['period_credit'];
            }

            Response::success([
                'start_date' => $startDate,
                'end_date' => $endDate,
                'accounts' => $rows,
            ]);
            return;
        }

        // Specific Account Ledger Detail
        $accStmt = $db->prepare('SELECT * FROM accounting_accounts WHERE id = ? AND tenant_id = ? LIMIT 1');
        $accStmt->execute([$accountId, $tenantId]);
        $account = $accStmt->fetch();

        if (!$account) {
            Response::error('Akun tidak ditemukan', 404);
        }

        $isCredit = $account['normal_balance'] === 'credit';

        // Opening balance calculation prior to start_date
        $opStmt = $db->prepare('SELECT COALESCE(SUM(ji.debit - ji.credit), 0) as prior_raw 
                                FROM accounting_journal_items ji
                                JOIN accounting_journal_entries je ON ji.journal_entry_id = je.id
                                WHERE ji.account_id = ? AND ji.tenant_id = ? AND je.status = "posted" AND je.entry_date < ?');
        $opStmt->execute([$accountId, $tenantId, $startDate]);
        $priorRaw = (float)$opStmt->fetchColumn();
        $openingBalance = $isCredit ? -$priorRaw : $priorRaw;

        // Transactions in period
        $txStmt = $db->prepare('SELECT ji.id, ji.debit, ji.credit, ji.memo,
                                       je.id as journal_id, je.entry_number, je.entry_date, je.reference_type, je.reference_id, je.notes
                                FROM accounting_journal_items ji
                                JOIN accounting_journal_entries je ON ji.journal_entry_id = je.id
                                WHERE ji.account_id = ? AND ji.tenant_id = ? AND je.status = "posted" AND je.entry_date BETWEEN ? AND ?
                                ORDER BY je.entry_date ASC, je.id ASC, ji.id ASC');
        $txStmt->execute([$accountId, $tenantId, $startDate, $endDate]);
        $transactions = $txStmt->fetchAll();

        $runningBalance = $openingBalance;
        $totalDebit = 0.0;
        $totalCredit = 0.0;

        foreach ($transactions as &$tx) {
            $debit = (float)$tx['debit'];
            $credit = (float)$tx['credit'];
            $totalDebit += $debit;
            $totalCredit += $credit;

            if ($isCredit) {
                $runningBalance += ($credit - $debit);
            } else {
                $runningBalance += ($debit - $credit);
            }
            $tx['running_balance'] = $runningBalance;
        }

        Response::success([
            'account' => $account,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'opening_balance' => $openingBalance,
            'total_debit' => $totalDebit,
            'total_credit' => $totalCredit,
            'ending_balance' => $runningBalance,
            'transactions' => $transactions,
        ]);
    }

    public function trialBalance(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $asOfDate = Request::query('as_of_date') ?: date('Y-m-d');

        $stmt = $db->prepare('SELECT a.id, a.code, a.name, a.type, a.normal_balance,
                                     COALESCE(SUM(ji.debit), 0) as total_debit,
                                     COALESCE(SUM(ji.credit), 0) as total_credit,
                                     COALESCE(SUM(ji.debit - ji.credit), 0) as net_raw
                              FROM accounting_accounts a
                              LEFT JOIN accounting_journal_items ji ON a.id = ji.account_id
                              LEFT JOIN accounting_journal_entries je ON ji.journal_entry_id = je.id AND je.status = "posted" AND je.entry_date <= ?
                              WHERE a.tenant_id = ? AND a.is_active = 1
                              GROUP BY a.id, a.code, a.name, a.type, a.normal_balance
                              ORDER BY a.code ASC');
        $stmt->execute([$asOfDate, $tenantId]);
        $rows = $stmt->fetchAll();

        $totalDebitBalance = 0.0;
        $totalCreditBalance = 0.0;

        foreach ($rows as &$r) {
            $net = (float)$r['net_raw'];
            if ($net > 0) {
                $r['ending_debit'] = $net;
                $r['ending_credit'] = 0.0;
                $totalDebitBalance += $net;
            } elseif ($net < 0) {
                $r['ending_debit'] = 0.0;
                $r['ending_credit'] = abs($net);
                $totalCreditBalance += abs($net);
            } else {
                $r['ending_debit'] = 0.0;
                $r['ending_credit'] = 0.0;
            }
        }

        $isBalanced = abs($totalDebitBalance - $totalCreditBalance) < 0.01;

        Response::success([
            'as_of_date' => $asOfDate,
            'is_balanced' => $isBalanced,
            'total_debit' => $totalDebitBalance,
            'total_credit' => $totalCreditBalance,
            'difference' => round(abs($totalDebitBalance - $totalCreditBalance), 2),
            'accounts' => $rows,
        ]);
    }
}
