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
echo "  SUITE TEST: LAUNDRY SAAS MODULE & INTEGRATIONS        \n";
echo "========================================================\n\n";

// 1. Health check verification
echo "1. Health Check Gateway: ";
$health = apiCall('GET', '/health');
assert($health['code'] === 200, "Health check failed with {$health['code']}");
$modules = $health['data']['data']['modules'] ?? [];
assert(in_array('laundry', $modules), 'Modul laundry belum terdaftar di health check');
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

// 3. Subscription module check
echo "3. Tenant Subscription Module Access: ";
$me = apiCall('GET', '/v1/auth/me', [], $authHeaders);
$tenantModules = $me['data']['data']['tenant']['modules'] ?? '';
assert(str_contains($tenantModules, 'laundry') || str_contains($tenantModules, 'combo') || str_contains($tenantModules, 'all'), "Tenant #1 tidak memiliki akses modul laundry");
echo "PASS (Modules: {$tenantModules})\n";

// 4. Test Master Services (CRUD)
echo "4. Master Laundry Services (CRUD): ";
$servicesRes = apiCall('GET', '/v1/laundry/services', [], $authHeaders);
assert($servicesRes['code'] === 200, "Gagal mengambil daftar layanan");
$services = $servicesRes['data']['data'] ?? [];
assert(count($services) >= 3, "Seed layanan laundry belum lengkap");

// Create temporary service
$newSvc = apiCall('POST', '/v1/laundry/services', [
    'name' => 'Cuci Karpet Tebal Test',
    'type' => 'satuan',
    'unit' => 'm2',
    'base_price' => 18000,
    'duration_hours' => 72,
    'description' => 'Layanan khusus uji coba',
], $authHeaders);
assert($newSvc['code'] === 201, "Gagal menambah layanan: " . ($newSvc['data']['message'] ?? $newSvc['raw']));
$tempSvcId = $newSvc['data']['data']['id'];

// Update
$updSvc = apiCall('PUT', "/v1/laundry/services/{$tempSvcId}", [
    'base_price' => 20000,
], $authHeaders);
assert($updSvc['code'] === 200, "Gagal memperbarui layanan");

// Delete
$delSvc = apiCall('DELETE', "/v1/laundry/services/{$tempSvcId}", [], $authHeaders);
assert($delSvc['code'] === 200, "Gagal menghapus layanan");
echo "PASS (Total layanan aktif: " . count($services) . ")\n";

// 5. Test Perfumes & Racks
echo "5. Master Fragrances & Storage Racks: ";
$perfumesRes = apiCall('GET', '/v1/laundry/perfumes', [], $authHeaders);
assert($perfumesRes['code'] === 200, "Gagal mengambil daftar parfum");
$perfumes = $perfumesRes['data']['data'] ?? [];
$perfumeId = $perfumes[0]['id'] ?? 1;

$racksRes = apiCall('GET', '/v1/laundry/racks', [], $authHeaders);
assert($racksRes['code'] === 200, "Gagal mengambil daftar rak");
$racks = $racksRes['data']['data'] ?? [];
$rackId = $racks[0]['id'] ?? 1;
echo "PASS (Parfum: " . count($perfumes) . ", Rak: " . count($racks) . ")\n";

// 6. Test Create Kiloan Order + Instant Cash Payment + Accounting Auto-Posting
echo "6. Order Kiloan (Express) + Cash Settlement + Jurnal Akuntansi: ";
$kiloanSvc = null;
foreach ($services as $s) {
    if ($s['type'] === 'kiloan') {
        $kiloanSvc = $s;
        break;
    }
}
assert($kiloanSvc !== null, "Layanan kiloan tidak ditemukan");

$weight = 4.5;
$kiloanOrderRes = apiCall('POST', '/v1/laundry/orders', [
    'customer_name' => 'Budi Santoso',
    'customer_phone' => '081234567891',
    'service_speed' => 'express',
    'perfume_id' => $perfumeId,
    'rack_id' => $rackId,
    'notes' => 'Harap pisahkan pakaian putih',
    'items' => [
        [
            'service_id' => $kiloanSvc['id'],
            'item_name' => $kiloanSvc['name'],
            'quantity' => $weight,
            'unit_price' => (float)$kiloanSvc['base_price'],
        ]
    ],
    'payment_method' => 'cash',
    'paid_amount' => 100000, // will pay total_amount
], $authHeaders);

assert($kiloanOrderRes['code'] === 201, "Gagal membuat order kiloan: " . ($kiloanOrderRes['data']['message'] ?? $kiloanOrderRes['raw']));
$kiloanOrderId = (int)$kiloanOrderRes['data']['data']['id'];
$orderNumber = (string)$kiloanOrderRes['data']['data']['order_number'];
$trackingCode = (string)$kiloanOrderRes['data']['data']['tracking_code'];
$totalAmount = (float)$kiloanOrderRes['data']['data']['total_amount'];
assert($totalAmount > 0, "Total amount harus lebih dari 0");

// Verify Accounting Journal Entry was generated
$jStmt = $db->prepare('SELECT id, entry_number, reference_type, reference_id, total_amount, status 
                       FROM accounting_journal_entries 
                       WHERE tenant_id = 1 AND reference_type = "laundry_payment" 
                       ORDER BY id DESC LIMIT 1');
$jStmt->execute();
$journal = $jStmt->fetch();
assert(!empty($journal), "Jurnal akuntansi otomatis untuk pembayaran laundry tidak terbentuk");
assert((float)$journal['total_amount'] === $totalAmount, "Total nominal jurnal tidak sesuai total order ({$journal['total_amount']} vs {$totalAmount})");

// Verify Journal Items (Debit Cash, Credit Laundry Revenue)
$jiStmt = $db->prepare('SELECT a.code, a.name, ji.debit, ji.credit 
                        FROM accounting_journal_items ji 
                        JOIN accounting_accounts a ON ji.account_id = a.id 
                        WHERE ji.journal_entry_id = ?');
$jiStmt->execute([$journal['id']]);
$journalItems = $jiStmt->fetchAll();
assert(count($journalItems) === 2, "Item jurnal harus seimbang 2 baris (Debit & Credit)");
assert((float)$journalItems[0]['debit'] > 0 || (float)$journalItems[1]['debit'] > 0, "Harus ada baris debit");
echo "PASS (Order: {$orderNumber}, Total: Rp " . number_format($totalAmount, 0, ',', '.') . ", JV: {$journal['entry_number']})\n";

// 7. Test Satuan Order + Hotel Room Charge Cross-Billing
echo "7. Order Satuan + Charge ke Kamar Hotel (Room Folio): ";
// Find or create an open hotel booking
$bStmt = $db->prepare('SELECT hb.id as booking_id, hf.id as folio_id, hg.full_name as guest_name 
                       FROM hotel_bookings hb 
                       JOIN hotel_folios hf ON hf.booking_id = hb.id 
                       JOIN hotel_guests hg ON hb.guest_id = hg.id 
                       WHERE hb.tenant_id = 1 AND hf.status = "open" LIMIT 1');
$bStmt->execute();
$openBooking = $bStmt->fetch();

$satuanSvc = null;
foreach ($services as $s) {
    if ($s['type'] === 'satuan') {
        $satuanSvc = $s;
        break;
    }
}

if ($openBooking && $satuanSvc) {
    $hotelBookingId = (int)$openBooking['booking_id'];
    $satuanOrderRes = apiCall('POST', '/v1/laundry/orders', [
        'customer_name' => $openBooking['guest_name'],
        'customer_phone' => '089988776655',
        'service_speed' => 'regular',
        'hotel_booking_id' => $hotelBookingId,
        'notes' => 'Tamu kamar hotel minta diantar jam 7 malam',
        'items' => [
            [
                'service_id' => $satuanSvc['id'],
                'item_name' => $satuanSvc['name'],
                'quantity' => 2,
                'unit_price' => (float)$satuanSvc['base_price'],
            ]
        ],
        'payment_method' => 'room_charge',
        'paid_amount' => (float)$satuanSvc['base_price'] * 2,
    ], $authHeaders);

    assert($satuanOrderRes['code'] === 201, "Gagal membuat order room charge: " . ($satuanOrderRes['data']['message'] ?? $satuanOrderRes['raw']));
    $satuanOrderId = (int)$satuanOrderRes['data']['data']['id'];

    // Verify Folio Item was added
    $fiStmt = $db->prepare('SELECT id, category, amount, description FROM hotel_folio_items 
                            WHERE folio_id = ? AND category = "laundry" AND source_order_id = ? LIMIT 1');
    $fiStmt->execute([$openBooking['folio_id'], $satuanOrderId]);
    $folioItem = $fiStmt->fetch();
    assert(!empty($folioItem), "Item laundry tidak masuk ke folio hotel tamu");
    echo "PASS (Tamu: {$openBooking['guest_name']}, Folio Item ID: {$folioItem['id']}, Amount: Rp " . number_format((float)$folioItem['amount'], 0, ',', '.') . ")\n";
} else {
    echo "SKIPPED (Tidak ada folio booking hotel terbuka untuk tenant #1)\n";
}

// 8. Test Workstation Status Transitions (Pipeline)
echo "8. Workstation Pipeline Transitions (Cuci -> Kering -> Setrika -> Siap -> Diambil): ";
$stages = ['washing', 'drying', 'ironing', 'ready', 'picked_up'];
foreach ($stages as $stage) {
    $stRes = apiCall('PUT', "/v1/laundry/orders/{$kiloanOrderId}/status", [
        'status' => $stage,
        'notes' => "Proses tahap {$stage} selesai",
    ], $authHeaders);
    assert($stRes['code'] === 200, "Gagal advance status ke {$stage}");
}

// Verify order timestamps
$chkStmt = $db->prepare('SELECT status, completed_at, picked_up_at FROM laundry_orders WHERE id = ?');
$chkStmt->execute([$kiloanOrderId]);
$finalOrder = $chkStmt->fetch();
assert($finalOrder['status'] === 'picked_up', "Status akhir harus picked_up");
assert(!empty($finalOrder['completed_at']), "completed_at tidak tercatat");
assert(!empty($finalOrder['picked_up_at']), "picked_up_at tidak tercatat");
echo "PASS (Semua tahap berhasil dilewati, status akhir: {$finalOrder['status']})\n";

// 9. Test Public Customer Tracking Endpoint
echo "9. Public Customer Order Tracking: ";
$trackRes = apiCall('GET', "/v1/laundry/track/{$trackingCode}");
assert($trackRes['code'] === 200, "Gagal tracking publik: " . ($trackRes['data']['message'] ?? $trackRes['raw']));
$trackData = $trackRes['data']['data'] ?? [];
assert($trackData['order_number'] === $orderNumber, "Nomor order tidak cocok");
assert(!empty($trackData['customer_phone_masked']), "Nomor telepon harus disamarkan untuk privasi");
assert(str_contains($trackData['customer_phone_masked'], '****'), "Masking telepon gagal: {$trackData['customer_phone_masked']}");
assert(count($trackData['timeline']) >= 5, "Timeline histori status tracking kurang lengkap");
echo "PASS (Tracking Code: {$trackingCode}, Masked Phone: {$trackData['customer_phone_masked']}, Timeline steps: " . count($trackData['timeline']) . ")\n";

// 10. Test Laundry Guard Unauthorized Access
echo "10. Laundry Module Guard Restriction Check: ";
$db->exec("DELETE FROM users WHERE username = 'posuser' OR tenant_id = 999");
$db->exec("DELETE FROM subscriptions WHERE tenant_id = 999");
$db->exec("DELETE FROM tenants WHERE id = 999 OR slug = 'pos-only-test'");

$db->exec("INSERT INTO tenants (id, name, slug, email, status) VALUES (999, 'Toko POS Saja', 'pos-only-test', 'pos@only.com', 'active')");
$db->exec("INSERT INTO subscriptions (tenant_id, plan, modules, max_devices, status, starts_at, expires_at) VALUES (999, 'starter', 'pos', 3, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))");
$db->exec("INSERT INTO users (tenant_id, username, password_hash, full_name, role, is_active) VALUES (999, 'posuser', '" . password_hash('pos123', PASSWORD_BCRYPT) . "', 'POS Staff', 'cashier', 1)");

$loginPosOnly = apiCall('POST', '/v1/auth/login', ['username' => 'posuser', 'password' => 'pos123']);
$posOnlyToken = $loginPosOnly['data']['data']['token'] ?? '';
assert(!empty($posOnlyToken), "Login user pos-only gagal: " . ($loginPosOnly['data']['message'] ?? $loginPosOnly['raw']));

$guardCheck = apiCall('GET', '/v1/laundry/orders', [], ['Authorization' => "Bearer {$posOnlyToken}"]);
assert($guardCheck['code'] === 403, "Tenant pos-only seharusnya dilarang mengakses modul laundry (code {$guardCheck['code']})");
echo "PASS (Blocked with 403 Forbidden for non-laundry tenant)\n";

// Cleanup test tenant
$db->exec("DELETE FROM users WHERE tenant_id = 999");
$db->exec("DELETE FROM subscriptions WHERE tenant_id = 999");
$db->exec("DELETE FROM tenants WHERE id = 999");

echo "\n========================================================\n";
echo "  SEMUA TEST LAUNDRY SAAS MODULE BERHASIL (100% PASS)   \n";
echo "========================================================\n";
