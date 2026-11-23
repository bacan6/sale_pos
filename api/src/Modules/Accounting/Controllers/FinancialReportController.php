<?php
declare(strict_types=1);

namespace App\Modules\Accounting\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use PDO;

class FinancialReportController {
    public function incomeStatement(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $startDate = Request::query('start_date') ?: date('Y-m-01');
        $endDate = Request::query('end_date') ?: date('Y-m-d');

        $stmt = $db->prepare('SELECT a.id, a.code, a.name, a.type, a.normal_balance,
                                     COALESCE(SUM(ji.credit - ji.debit), 0) as revenue_balance,
                                     COALESCE(SUM(ji.debit - ji.credit), 0) as expense_balance
                              FROM accounting_accounts a
                              LEFT JOIN accounting_journal_items ji ON a.id = ji.account_id
                              LEFT JOIN accounting_journal_entries je ON ji.journal_entry_id = je.id AND je.status = "posted" AND je.entry_date BETWEEN ? AND ?
                              WHERE a.tenant_id = ? AND a.type IN ("revenue", "cogs", "expense") AND a.is_active = 1
                              GROUP BY a.id, a.code, a.name, a.type, a.normal_balance
                              ORDER BY a.code ASC');
        $stmt->execute([$startDate, $endDate, $tenantId]);
        $rows = $stmt->fetchAll();

        $revenues = [];
        $cogs = [];
        $expenses = [];

        $totalRevenue = 0.0;
        $totalCogs = 0.0;
        $totalExpenses = 0.0;

        foreach ($rows as $r) {
            $type = $r['type'];
            if ($type === 'revenue') {
                $amt = (float)$r['revenue_balance'];
                $r['amount'] = $amt;
                $revenues[] = $r;
                $totalRevenue += $amt;
            } elseif ($type === 'cogs') {
                $amt = (float)$r['expense_balance'];
                $r['amount'] = $amt;
                $cogs[] = $r;
                $totalCogs += $amt;
            } elseif ($type === 'expense') {
                $amt = (float)$r['expense_balance'];
                $r['amount'] = $amt;
                $expenses[] = $r;
                $totalExpenses += $amt;
            }
        }

        $grossProfit = $totalRevenue - $totalCogs;
        $netIncome = $grossProfit - $totalExpenses;

        Response::success([
            'start_date' => $startDate,
            'end_date' => $endDate,
            'total_revenue' => $totalRevenue,
            'total_cogs' => $totalCogs,
            'gross_profit' => $grossProfit,
            'total_expenses' => $totalExpenses,
            'net_income' => $netIncome,
            'revenues' => $revenues,
            'cogs' => $cogs,
            'expenses' => $expenses,
        ]);
    }

    public function balanceSheet(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $asOfDate = Request::query('as_of_date') ?: date('Y-m-d');

        // Net income calculation up to as_of_date (retained in equity)
        $incStmt = $db->prepare('SELECT 
            COALESCE(SUM(CASE WHEN a.type = "revenue" THEN (ji.credit - ji.debit) 
                              WHEN a.type IN ("cogs", "expense") THEN -(ji.debit - ji.credit) 
                              ELSE 0 END), 0) as current_profit
            FROM accounting_accounts a
            JOIN accounting_journal_items ji ON a.id = ji.account_id
            JOIN accounting_journal_entries je ON ji.journal_entry_id = je.id
            WHERE a.tenant_id = ? AND je.status = "posted" AND je.entry_date <= ?');
        $incStmt->execute([$tenantId, $asOfDate]);
        $currentEarnings = (float)$incStmt->fetchColumn();

        $stmt = $db->prepare('SELECT a.id, a.code, a.name, a.type, a.normal_balance,
                                     COALESCE(SUM(ji.debit - ji.credit), 0) as asset_balance,
                                     COALESCE(SUM(ji.credit - ji.debit), 0) as credit_balance
                              FROM accounting_accounts a
                              LEFT JOIN accounting_journal_items ji ON a.id = ji.account_id
                              LEFT JOIN accounting_journal_entries je ON ji.journal_entry_id = je.id AND je.status = "posted" AND je.entry_date <= ?
                              WHERE a.tenant_id = ? AND a.type IN ("asset", "liability", "equity") AND a.is_active = 1
                              GROUP BY a.id, a.code, a.name, a.type, a.normal_balance
                              ORDER BY a.code ASC');
        $stmt->execute([$asOfDate, $tenantId]);
        $rows = $stmt->fetchAll();

        $assets = [];
        $liabilities = [];
        $equities = [];

        $totalAssets = 0.0;
        $totalLiabilities = 0.0;
        $totalEquityWithoutProfit = 0.0;

        foreach ($rows as $r) {
            $type = $r['type'];
            if ($type === 'asset') {
                $amt = (float)$r['asset_balance'];
                $r['amount'] = $amt;
                $assets[] = $r;
                $totalAssets += $amt;
            } elseif ($type === 'liability') {
                $amt = (float)$r['credit_balance'];
                $r['amount'] = $amt;
                $liabilities[] = $r;
                $totalLiabilities += $amt;
            } elseif ($type === 'equity') {
                $amt = (float)$r['credit_balance'];
                $r['amount'] = $amt;
                $equities[] = $r;
                $totalEquityWithoutProfit += $amt;
            }
        }

        $equities[] = [
            'id' => 0,
            'code' => '3300',
            'name' => 'Laba Bersih Periode Berjalan',
            'type' => 'equity',
            'normal_balance' => 'credit',
            'amount' => $currentEarnings,
        ];
        $totalEquity = $totalEquityWithoutProfit + $currentEarnings;
        $totalLiabAndEquity = $totalLiabilities + $totalEquity;

        Response::success([
            'as_of_date' => $asOfDate,
            'is_balanced' => abs($totalAssets - $totalLiabAndEquity) < 0.01,
            'total_assets' => $totalAssets,
            'total_liabilities' => $totalLiabilities,
            'total_equity' => $totalEquity,
            'total_liabilities_and_equity' => $totalLiabAndEquity,
            'discrepancy' => round(abs($totalAssets - $totalLiabAndEquity), 2),
            'assets' => $assets,
            'liabilities' => $liabilities,
            'equity' => $equities,
        ]);
    }

    public function cashFlow(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $startDate = Request::query('start_date') ?: date('Y-m-01');
        $endDate = Request::query('end_date') ?: date('Y-m-d');

        // Cash & Bank accounts (code starts with 111 or 112)
        $cStmt = $db->prepare('SELECT id FROM accounting_accounts WHERE tenant_id = ? AND code IN ("1110", "1120")');
        $cStmt->execute([$tenantId]);
        $cashAccIds = $cStmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($cashAccIds)) {
            Response::success([
                'start_date' => $startDate,
                'end_date' => $endDate,
                'opening_cash' => 0,
                'cash_in' => 0,
                'cash_out' => 0,
                'net_cash_flow' => 0,
                'closing_cash' => 0,
                'flows' => [],
            ]);
            return;
        }

        $inClause = implode(',', array_map('intval', $cashAccIds));

        // Prior opening balance
        $opQuery = "SELECT COALESCE(SUM(ji.debit - ji.credit), 0) 
                    FROM accounting_journal_items ji
                    JOIN accounting_journal_entries je ON ji.journal_entry_id = je.id
                    WHERE ji.account_id IN ($inClause) AND ji.tenant_id = ? AND je.status = 'posted' AND je.entry_date < ?";
        $opStmt = $db->prepare($opQuery);
        $opStmt->execute([$tenantId, $startDate]);
        $openingCash = (float)$opStmt->fetchColumn();

        // Inflows and Outflows in period
        $pQuery = "SELECT 
                    COALESCE(SUM(CASE WHEN ji.debit > 0 THEN ji.debit ELSE 0 END), 0) as cash_in,
                    COALESCE(SUM(CASE WHEN ji.credit > 0 THEN ji.credit ELSE 0 END), 0) as cash_out
                   FROM accounting_journal_items ji
                   JOIN accounting_journal_entries je ON ji.journal_entry_id = je.id
                   WHERE ji.account_id IN ($inClause) AND ji.tenant_id = ? AND je.status = 'posted' AND je.entry_date BETWEEN ? AND ?";
        $pStmt = $db->prepare($pQuery);
        $pStmt->execute([$tenantId, $startDate, $endDate]);
        $res = $pStmt->fetch();

        $cashIn = (float)($res['cash_in'] ?? 0);
        $cashOut = (float)($res['cash_out'] ?? 0);
        $netCashFlow = $cashIn - $cashOut;
        $closingCash = $openingCash + $netCashFlow;

        Response::success([
            'start_date' => $startDate,
            'end_date' => $endDate,
            'opening_cash' => $openingCash,
            'cash_in' => $cashIn,
            'cash_out' => $cashOut,
            'net_cash_flow' => $netCashFlow,
            'closing_cash' => $closingCash,
        ]);
    }
}
