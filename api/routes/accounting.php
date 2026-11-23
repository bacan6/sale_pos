<?php
declare(strict_types=1);

use App\Middleware\HttpsEnforce;
use App\Middleware\BearerAuth;
use App\Middleware\AccountingModuleGuard;
use App\Modules\Accounting\Controllers\CoaController;
use App\Modules\Accounting\Controllers\JournalEntryController;
use App\Modules\Accounting\Controllers\GeneralLedgerController;
use App\Modules\Accounting\Controllers\FinancialReportController;
use App\Modules\Accounting\Controllers\AccountingSettingsController;
use App\Modules\Accounting\Controllers\PeriodClosingController;

$accAuth = [HttpsEnforce::class, BearerAuth::class, AccountingModuleGuard::class];

// 1. Chart of Accounts (COA / Bagan Akun)
$router->get('/v1/accounting/coa', [CoaController::class, 'index'], $accAuth);
$router->get('/v1/accounting/coa/{id}', [CoaController::class, 'show'], $accAuth);
$router->post('/v1/accounting/coa', [CoaController::class, 'store'], $accAuth);
$router->put('/v1/accounting/coa/{id}', [CoaController::class, 'update'], $accAuth);
$router->delete('/v1/accounting/coa/{id}', [CoaController::class, 'destroy'], $accAuth);

// 2. Journal Entries (Jurnal Umum)
$router->get('/v1/accounting/journals', [JournalEntryController::class, 'index'], $accAuth);
$router->get('/v1/accounting/journals/{id}', [JournalEntryController::class, 'show'], $accAuth);
$router->post('/v1/accounting/journals', [JournalEntryController::class, 'store'], $accAuth);
$router->post('/v1/accounting/journals/{id}/void', [JournalEntryController::class, 'void'], $accAuth);

// 3. Buku Besar (General Ledger) & Neraca Saldo (Trial Balance)
$router->get('/v1/accounting/ledger', [GeneralLedgerController::class, 'ledger'], $accAuth);
$router->get('/v1/accounting/trial-balance', [GeneralLedgerController::class, 'trialBalance'], $accAuth);

// 4. Financial Reports (Laporan Keuangan)
$router->get('/v1/accounting/reports/income-statement', [FinancialReportController::class, 'incomeStatement'], $accAuth);
$router->get('/v1/accounting/reports/balance-sheet', [FinancialReportController::class, 'balanceSheet'], $accAuth);
$router->get('/v1/accounting/reports/cash-flow', [FinancialReportController::class, 'cashFlow'], $accAuth);

// 5. Accounting Settings (Pemetaan Akun Otomatis)
$router->get('/v1/accounting/settings', [AccountingSettingsController::class, 'show'], $accAuth);
$router->put('/v1/accounting/settings', [AccountingSettingsController::class, 'update'], $accAuth);

// 6. Periode Akuntansi & Tutup Buku (Closing)
$router->get('/v1/accounting/periods', [PeriodClosingController::class, 'index'], $accAuth);
$router->post('/v1/accounting/periods', [PeriodClosingController::class, 'store'], $accAuth);
$router->post('/v1/accounting/periods/{id}/close', [PeriodClosingController::class, 'close'], $accAuth);
