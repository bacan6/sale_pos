<?php
declare(strict_types=1);

$baseUrl = 'http://localhost/sale_pos/api';
$platformSecret = 'master_super_secret_key_889922';

function httpCall(string $method, string $path, array $body = [], array $headers = []): array {
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

function hmacCall(string $method, string $path, string $deviceId, string $deviceSecret, array $body = []): array {
    global $baseUrl;
    $url = $baseUrl . $path;
    $parsed = parse_url($url);
    $uri = ($parsed['path'] ?? '') . (isset($parsed['query']) ? '?' . $parsed['query'] : '');

    $jsonBody = !empty($body) ? json_encode($body) : '';
    $timestamp = (string)time();

    $payload = "{$method}\n{$uri}\n{$timestamp}\n{$jsonBody}";
    $signature = hash_hmac('sha256', $payload, $deviceSecret);

    return httpCall($method, $path, $body, [
        'X-Device-Id' => $deviceId,
        'X-Timestamp' => $timestamp,
        'X-Signature' => $signature,
    ]);
}

echo "=== START SAAS MULTI-TENANT VERIFICATION ===\n\n";

// 1. Health check
echo "[1] Testing Gateway Health:\n";
$health = httpCall('GET', '/health');
echo "HTTP Code: {$health['code']}, Platform: " . ($health['data']['data']['platform'] ?? '') . "\n\n";
assert($health['code'] === 200);

// 2. Platform Super Admin (Unauthorized vs Authorized)
echo "[2] Testing Super Admin Access:\n";
$unauthAdmin = httpCall('GET', '/v1/admin/tenants');
echo "Without Secret: HTTP {$unauthAdmin['code']} (Expected 403)\n";
assert($unauthAdmin['code'] === 403);

$authAdmin = httpCall('GET', '/v1/admin/tenants', [], ['X-Platform-Secret' => $platformSecret]);
echo "With Secret: HTTP {$authAdmin['code']}, Total Tenants: " . count($authAdmin['data']['data'] ?? []) . "\n\n";
assert($authAdmin['code'] === 200);

// 3. Public SaaS Registration for Tenant B
$uniqueSuffix = substr(strval(time()), -4);
$tenantBSlug = 'cafe-senja-barat-' . $uniqueSuffix;
echo "[3] Registering New SaaS Tenant: 'Cafe Senja Barat' (slug: {$tenantBSlug}):\n";
$reg = httpCall('POST', '/v1/saas/register', [
    'name' => 'Cafe Senja Barat ' . $uniqueSuffix,
    'slug' => $tenantBSlug,
    'email' => "owner{$uniqueSuffix}@cafebarat.com",
    'phone' => '087711223344',
    'admin_username' => 'owner_barat',
    'admin_password' => 'secret12345',
]);
echo "Registration HTTP Code: {$reg['code']}, Raw: {$reg['raw']}\n";
assert($reg['code'] === 201);
$tenantB = $reg['data']['data'];
$tenantBId = (int)$tenantB['tenant_id'];
$deviceBId = $tenantB['primary_device']['device_id'];
$deviceBSecret = $tenantB['primary_device']['device_secret'];
echo "Tenant B ID: {$tenantBId}, Primary Device: {$deviceBId}\n\n";

// 4. Tenant B POS Device Provisioning
echo "[4] Testing Device Provisioning for Tenant B:\n";
$devListB = hmacCall('GET', '/v1/devices', $deviceBId, $deviceBSecret);
echo "Current devices for Tenant B: {$devListB['data']['data']['used_devices']} / {$devListB['data']['data']['max_devices']}\n";
assert($devListB['code'] === 200);

$newDevB = hmacCall('POST', '/v1/devices', $deviceBId, $deviceBSecret, [
    'name' => 'Handheld Waiter 1',
    'role' => 'waitstaff',
]);
echo "Add device HTTP Code: {$newDevB['code']}, New Device ID: " . ($newDevB['data']['data']['device_id'] ?? 'none') . "\n\n";
assert($newDevB['code'] === 201);

// 5. Tenant Isolation Test (Tenant A vs Tenant B Products)
echo "[5] Testing Cross-Tenant Data Isolation:\n";
// Tenant A (Kopi Senja) credentials
$deviceAId = 'POS-KASIR-01';
$deviceASecret = 'sec_kopi_senja_kasir_987213';

$prodA = hmacCall('GET', '/v1/products', $deviceAId, $deviceASecret);
echo "Tenant A Products count: " . count($prodA['data']['data'] ?? []) . "\n";
assert(count($prodA['data']['data'] ?? []) > 0);

$prodB = hmacCall('GET', '/v1/products', $deviceBId, $deviceBSecret);
echo "Tenant B Products count (initially empty): " . count($prodB['data']['data'] ?? []) . "\n";
assert(count($prodB['data']['data'] ?? []) === 0);

// Tenant B adds its own product
$catListB = hmacCall('GET', '/v1/product-categories', $deviceBId, $deviceBSecret);
$catBId = (int)($catListB['data']['data'][0]['id'] ?? 1);

$addProdB = hmacCall('POST', '/v1/products', $deviceBId, $deviceBSecret, [
    'code' => 'CSB-001',
    'name' => 'Kopi Tubruk Spesial Barat',
    'category_id' => $catBId,
    'price' => 15000,
    'cost' => 4000,
    'stock' => 50,
]);
echo "Tenant B added product HTTP Code: {$addProdB['code']}\n";
assert($addProdB['code'] === 201);

// Verify Tenant A still CANNOT see Tenant B's product
$prodAAfter = hmacCall('GET', '/v1/products', $deviceAId, $deviceASecret);
$foundBInA = array_filter($prodAAfter['data']['data'] ?? [], fn($p) => $p['code'] === 'CSB-001');
echo "Is Tenant B product visible in Tenant A? " . (empty($foundBInA) ? 'NO (Isolated!)' : 'YES (Leak!)') . "\n";
assert(empty($foundBInA));

// 6. Tenant B Order & Payment
echo "\n[6] Testing Tenant B Order & Payment Flow:\n";
$newOrderB = hmacCall('POST', '/v1/orders', $deviceBId, $deviceBSecret, [
    'order_number' => 'ORD-TB-' . $uniqueSuffix,
    'order_type' => 'Take-Away',
    'waiter_name' => 'Kasir Barat',
    'items' => [
        [
            'product_id' => $addProdB['data']['data']['id'],
            'quantity' => 2,
        ],
    ],
]);
echo "Tenant B Order HTTP Code: {$newOrderB['code']}, Order: " . ($newOrderB['data']['data']['order_number'] ?? '') . "\n";
assert($newOrderB['code'] === 201);
$orderBId = (int)$newOrderB['data']['data']['id'];

$payOrderB = hmacCall('POST', '/v1/payments', $deviceBId, $deviceBSecret, [
    'order_id' => $orderBId,
    'method' => 'cash',
    'amount_paid' => 50000,
]);
echo "Tenant B Pay HTTP Code: {$payOrderB['code']}, Change: " . ($payOrderB['data']['data']['change_amount'] ?? 0) . "\n\n";
assert($payOrderB['code'] === 201);

// Verify Tenant A Orders do not include Tenant B's order
$ordersA = hmacCall('GET', '/v1/orders', $deviceAId, $deviceASecret);
$foundOrderInA = array_filter($ordersA['data']['data'] ?? [], fn($o) => $o['order_number'] === 'ORD-TB-' . $uniqueSuffix);
echo "Is Tenant B order visible in Tenant A? " . (empty($foundOrderInA) ? 'NO (Isolated!)' : 'YES (Leak!)') . "\n";
assert(empty($foundOrderInA));

// 7. Testing Tenant Suspension / On-Hold by Super Admin
echo "\n[7] Testing Super Admin Suspending Tenant B:\n";
$suspendB = httpCall('PUT', "/v1/admin/tenants/{$tenantBId}/status", ['status' => 'on_hold'], ['X-Platform-Secret' => $platformSecret]);
echo "Suspend Tenant B HTTP Code: {$suspendB['code']}\n";
assert($suspendB['code'] === 200);

// Request from Tenant B should now be rejected with 403
$reqSuspended = hmacCall('GET', '/v1/products', $deviceBId, $deviceBSecret);
echo "Tenant B call after suspension: HTTP Code {$reqSuspended['code']} (Expected 403)\n";
echo "Response: " . ($reqSuspended['data']['message'] ?? '') . "\n";
assert($reqSuspended['code'] === 403);

// Reactivate Tenant B
$reactivateB = httpCall('PUT', "/v1/admin/tenants/{$tenantBId}/status", ['status' => 'active'], ['X-Platform-Secret' => $platformSecret]);
echo "Reactivate Tenant B HTTP Code: {$reactivateB['code']}\n";
assert($reactivateB['code'] === 200);

$reqReactivated = hmacCall('GET', '/v1/products', $deviceBId, $deviceBSecret);
echo "Tenant B call after reactivation: HTTP Code {$reqReactivated['code']} (Expected 200)\n\n";
assert($reqReactivated['code'] === 200);

echo "=== ALL SAAS MULTI-TENANT VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n";
