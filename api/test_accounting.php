<?php
declare(strict_types=1);

$baseUrl = 'http://localhost/sale_pos/api';

function apiCall(string $method, string $path, array $body = [], array $headers = []): array {
    global $baseUrl;
    $url = $baseUrl . $path;
    $jsonBody = !empty($body) ? json_encode($body) : '';

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $defaultHeaders = ['Content-Type: application/json'];
    foreach ($headers as $k => $v) {
        $defaultHeaders[] = "{$k}: {$v}";
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $defaultHeaders);

    if (!empty($jsonBody)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonBody);
    }

    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'code' => $code,
        'data' => json_decode((string)$raw, true),
        'raw' => $raw,
    ];
}

require_once __DIR__ . '/config/bootstrap.php';
$db = App\Core\Database::getInstance()->pdo();

echo "========================================================\n";
echo "  SUITE TEST: BACK-OFFICE ACCOUNTING MODULE (SAAS)     \n";
echo "========================================================\n\n";

// 1. Health check verification
echo "1. Health Check Gateway: ";
$health = apiCall('GET', '/health');
assert($health['code'] === 200, "Health check failed with {$health['code']}");
$modules = $health['data']['data']['modules'] ?? [];
assert(in_array('accounting', $modules), 'Modul accounting belum terdaftar di health check');
echo "PASS (Modul: " . implode(', ', $modules) . ")\n";

// 2. Auth Login Tenant #1 (Kopi Senja)
echo "2. Auth Login Admin Tenant #1: ";
$login = apiCall('POST', '/v1/auth/login', [
    'username' => 'admin',
    'password' => 'admin123',
]);
$token = $login['data']['data']['token'] ?? '';
assert(!empty($token), "Login gagal: " . ($login['data']['message'] ?? $login['raw']));
$authHeaders = ['Authorization' => "Bearer {$token}"];
echo "PASS (Token: " . substr($token, 0, 15) . "...)\n";

// 3. SaaS Guard Verification: Tenant without accounting
echo "3. SaaS Guard (Tenant tanpa modul accounting): ";
// Ensure tenant 999 exists with modules = 'pos'
$db->exec('INSERT INTO tenants (id, name, slug, email, status) VALUES (999, "Resto Test Solo", "resto-solo", "solo@test.com", "active") ON DUPLICATE KEY UPDATE name=name');
$db->exec('INSERT INTO subscriptions (tenant_id, plan, modules, max_devices, status, starts_at, expires_at) VALUES (999, "pos_starter", "pos", 3, "active", NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)) ON DUPLICATE KEY UPDATE modules="pos"');
$passHash = password_hash('password123', PASSWORD_BCRYPT);
$db->exec("INSERT INTO users (id, tenant_id, username, password_hash, full_name, role, is_active) VALUES (999, 999, 'adminsolo', '{$passHash}', 'Admin Solo', 'admin', 1) ON DUPLICATE KEY UPDATE password_hash='{$passHash}'");

$soloLogin = apiCall('POST', '/v1/auth/login', [
    'username' => 'adminsolo',
    'password' => 'password123',
], ['X-Tenant-Slug' => 'resto-solo']);
$soloToken = $soloLogin['data']['data']['token'] ?? '';

$guardRes = apiCall('GET', '/v1/accounting/coa', [], [
    'Authorization' => "Bearer {$soloToken}",
    'X-Tenant-Slug' => 'resto-solo',
]);
assert($guardRes['code'] === 403, "Tenant tanpa accounting harus ditolak 403, got {$guardRes['code']}");
echo "PASS (403 Forbidden: {$guardRes['data']['message']})\n";

// 4. COA (Chart of Accounts)
echo "4a. Fetch Chart of Accounts: ";
$coaRes = apiCall('GET', '/v1/accounting/coa', [], $authHeaders);
$accounts = $coaRes['data']['data'] ?? [];
assert($coaRes['code'] === 200 && count($accounts) >= 20, "Gagal mengambil COA");
echo "PASS (" . count($accounts) . " accounts loaded)\n";

echo "4b. Create Custom Account (1118 Kas Kecil): ";
$createAcc = apiCall('POST', '/v1/accounting/coa', [
    'code' => '1118',
    'name' => 'Kas Kecil Barista Bar',
    'type' => 'asset',
    'normal_balance' => 'debit',
], $authHeaders);
if ($createAcc['code'] === 201) {
    echo "PASS (Created ID: {$createAcc['data']['data']['id']})\n";
} else {
    // Might already exist from prior run
    assert(str_contains($createAcc['data']['message'] ?? '', 'sudah digunakan'), "Create account error: {$createAcc['raw']}");
    echo "PASS (Account 1118 exists)\n";
}

// 5. Double-Entry Validation (Balanced vs Unbalanced)
echo "5a. Reject Unbalanced Journal (Debit != Credit): ";
$unbal = apiCall('POST', '/v1/accounting/journals', [
    'entry_date' => date('Y-m-d'),
    'notes' => 'Test Jurnal Tidak Seimbang',
    'items' => [
        ['account_id' => $accounts[0]['id'], 'debit' => 100000, 'credit' => 0],
        ['account_id' => $accounts[1]['id'], 'debit' => 0, 'credit' => 80000],
    ],
], $authHeaders);
assert($unbal['code'] === 422, "Unbalanced journal must return 422, got {$unbal['code']}");
echo "PASS (422: {$unbal['data']['message']})\n";

echo "5b. Post Balanced Manual Journal Voucher: ";
$bal = apiCall('POST', '/v1/accounting/journals', [
    'entry_date' => date('Y-m-d'),
    'notes' => 'Penyetoran Kas Modal Operasional Bar',
    'items' => [
        ['account_id' => $accounts[0]['id'], 'debit' => 500000, 'credit' => 0, 'memo' => 'Debit Kas'],
        ['account_id' => $accounts[1]['id'], 'debit' => 0, 'credit' => 500000, 'memo' => 'Kredit Bank'],
    ],
], $authHeaders);
assert($bal['code'] === 201, "Balanced journal failed: {$bal['raw']}");
$journalNum = $bal['data']['data']['entry_number'];
echo "PASS (JV: {$journalNum})\n";

// 6. POS Shift Closing Batch Posting
echo "6. POS Shift Closing Auto-Batch Posting: ";
// Open shift
$openShift = apiCall('POST', '/v1/pos/shifts/open', [
    'opening_cash' => 150000,
], $authHeaders);
$shiftId = $openShift['data']['data']['shift_id'] ?? 0;
assert($shiftId > 0, "Open shift failed: {$openShift['raw']}");

// Close shift with closing actual
$closeShift = apiCall('POST', '/v1/pos/shifts/close', [
    'shift_id' => $shiftId,
    'closing_cash_actual' => 200000,
    'notes' => 'Tutup Shift Sore Kasir',
], $authHeaders);
assert($closeShift['code'] === 200, "Close shift failed: {$closeShift['raw']}");

// Verify journal entry created for pos_shift_close
$chkShiftJ = $db->prepare('SELECT * FROM accounting_journal_entries WHERE tenant_id = 1 AND reference_type = "pos_shift_close" AND reference_id = ? AND status = "posted"');
$chkShiftJ->execute([$shiftId]);
$shiftJ = $chkShiftJ->fetch();
assert($shiftJ !== false, "Journal for POS shift close not found in database");
echo "PASS (Posted JV: {$shiftJ['entry_number']})\n";

// 7. Hotel Night Audit Auto-Batch Posting
echo "7. Hotel Night Audit Auto-Batch Posting: ";
// Seed a room charge folio item for today so there is revenue to audit
$db->exec('INSERT INTO hotel_folio_items (tenant_id, folio_id, category, description, amount, quantity, created_at) 
           VALUES (1, 1, "room_charge", "Sewa Kamar Deluxe #101", 750000, 1, NOW())');

$auditDate = date('Y-m-d');
$nightAudit = apiCall('POST', '/v1/hotel/night-audit/run', [
    'audit_date' => $auditDate,
], $authHeaders);
assert($nightAudit['code'] === 200, "Night audit run failed: {$nightAudit['raw']}");

$auditId = $nightAudit['data']['data']['audit_id'] ?? 0;
$chkAuditJ = $db->prepare('SELECT * FROM accounting_journal_entries WHERE tenant_id = 1 AND reference_type = "hotel_night_audit" AND reference_id = ? AND status = "posted"');
$chkAuditJ->execute([$auditId]);
$auditJ = $chkAuditJ->fetch();
assert($auditJ !== false, "Journal for Hotel Night Audit not found in database");
echo "PASS (Posted JV: {$auditJ['entry_number']})\n";

// 8. General Ledger & Trial Balance Verification
echo "8a. Fetch General Ledger Detail: ";
$glRes = apiCall('GET', "/v1/accounting/ledger?account_id={$accounts[0]['id']}", [], $authHeaders);
assert($glRes['code'] === 200 && isset($glRes['data']['data']['ending_balance']), "GL detail failed");
echo "PASS (Ending Balance: Rp " . number_format($glRes['data']['data']['ending_balance']) . ")\n";

echo "8b. Trial Balance Keseimbangan: ";
$tbRes = apiCall('GET', '/v1/accounting/trial-balance', [], $authHeaders);
assert($tbRes['code'] === 200 && $tbRes['data']['data']['is_balanced'] === true, "Trial balance is not balanced!");
echo "PASS (Debit: Rp " . number_format($tbRes['data']['data']['total_debit']) . 
     ", Credit: Rp " . number_format($tbRes['data']['data']['total_credit']) . 
     ", Difference: Rp 0)\n";

// 9. Financial Reports
echo "9a. Laporan Laba Rugi (Income Statement): ";
$incRes = apiCall('GET', '/v1/accounting/reports/income-statement', [], $authHeaders);
assert($incRes['code'] === 200 && isset($incRes['data']['data']['net_income']), "Income statement failed");
echo "PASS (Revenue: Rp " . number_format($incRes['data']['data']['total_revenue']) . 
     ", Net Income: Rp " . number_format($incRes['data']['data']['net_income']) . ")\n";

echo "9b. Neraca (Balance Sheet): ";
$balRes = apiCall('GET', '/v1/accounting/reports/balance-sheet', [], $authHeaders);
assert($balRes['code'] === 200 && $balRes['data']['data']['is_balanced'] === true, "Balance sheet is not balanced!");
echo "PASS (Total Assets: Rp " . number_format($balRes['data']['data']['total_assets']) . 
     ", Liabilities & Equity: Rp " . number_format($balRes['data']['data']['total_liabilities_and_equity']) . ")\n";

echo "9c. Laporan Arus Kas (Cash Flow): ";
$cfRes = apiCall('GET', '/v1/accounting/reports/cash-flow', [], $authHeaders);
assert($cfRes['code'] === 200 && isset($cfRes['data']['data']['closing_cash']), "Cash flow report failed");
echo "PASS (Closing Cash: Rp " . number_format($cfRes['data']['data']['closing_cash']) . ")\n";

// 10. Accounting Settings & Periods
echo "10a. Accounting Auto-Posting Settings: ";
$setRes = apiCall('GET', '/v1/accounting/settings', [], $authHeaders);
assert($setRes['code'] === 200 && !empty($setRes['data']['data']['cash_account_id']), "Settings failed");
echo "PASS (Cash Account: {$setRes['data']['data']['cash_account_id']})\n";

echo "10b. Accounting Periods List: ";
$perRes = apiCall('GET', '/v1/accounting/periods', [], $authHeaders);
assert($perRes['code'] === 200 && count($perRes['data']['data']) > 0, "Periods list failed");
echo "PASS (" . count($perRes['data']['data']) . " periods found)\n";

// Cleanup test tenant
$db->exec('DELETE FROM tenants WHERE id = 999');

echo "\n========================================================\n";
echo "  SELURUH 10/10 TEST BACK-OFFICE ACCOUNTING SUKSES!    \n";
echo "========================================================\n";
