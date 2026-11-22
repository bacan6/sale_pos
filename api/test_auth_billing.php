<?php
declare(strict_types=1);

$baseUrl = 'http://localhost/sale_pos/api';
$platformSecret = 'master_super_secret_key_889922';

function apiReq(string $method, string $path, array $body = [], array $headers = []): array {
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

function hmacReq(string $method, string $path, string $deviceId, string $deviceSecret, array $body = []): array {
    global $baseUrl;
    $url = $baseUrl . $path;
    $parsed = parse_url($url);
    $uri = ($parsed['path'] ?? '') . (isset($parsed['query']) ? '?' . $parsed['query'] : '');

    $jsonBody = !empty($body) ? json_encode($body) : '';
    $timestamp = (string)time();

    $payload = "{$method}\n{$uri}\n{$timestamp}\n{$jsonBody}";
    $signature = hash_hmac('sha256', $payload, $deviceSecret);

    return apiReq($method, $path, $body, [
        'X-Device-Id' => $deviceId,
        'X-Timestamp' => $timestamp,
        'X-Signature' => $signature,
    ]);
}

echo "=== START AUTH & BILLING LIFECYCLE SIMULATION TESTS ===\n\n";

$uid = substr(strval(time()), -4);
$slug = "cafe-billing-{$uid}";
$email = "owner{$uid}@billingtest.com";
$username = "owner_{$uid}";
$password = 'pass12345';

// 1. SIGNUP
echo "[1] Testing Signup (POST /v1/auth/signup):\n";
$signup = apiReq('POST', '/v1/auth/signup', [
    'name' => "Cafe Test {$uid}",
    'slug' => $slug,
    'email' => $email,
    'username' => $username,
    'password' => $password,
]);
echo "Signup HTTP Code: {$signup['code']}\n";
assert($signup['code'] === 201);
$token = $signup['data']['data']['token'];
$tenantId = (int)$signup['data']['data']['tenant']['id'];
$deviceId = $signup['data']['data']['primary_device']['device_id'];
$deviceSecret = $signup['data']['data']['primary_device']['device_secret'];
echo "Bearer Token: " . substr($token, 0, 12) . "... Tenant ID: {$tenantId}\n\n";

// 2. ME (Bearer Auth)
echo "[2] Testing Profile (GET /v1/auth/me):\n";
$me = apiReq('GET', '/v1/auth/me', [], ['Authorization' => "Bearer {$token}"]);
echo "Me HTTP Code: {$me['code']}, User: " . ($me['data']['data']['user']['username'] ?? '') . ", Tenant: " . ($me['data']['data']['tenant']['name'] ?? '') . "\n";
assert($me['code'] === 200);
echo "\n";

// 3. LOGIN & LOGOUT
echo "[3] Testing Login & Logout:\n";
$login = apiReq('POST', '/v1/auth/login', [
    'username' => $username,
    'password' => $password,
]);
echo "Login HTTP Code: {$login['code']}\n";
assert($login['code'] === 200);
$sessionToken = $login['data']['data']['token'];

$logout = apiReq('POST', '/v1/auth/logout', [], ['Authorization' => "Bearer {$sessionToken}"]);
echo "Logout HTTP Code: {$logout['code']}\n";
assert($logout['code'] === 200);

$revokedCheck = apiReq('GET', '/v1/auth/me', [], ['Authorization' => "Bearer {$sessionToken}"]);
echo "Access with logged out token: HTTP Code {$revokedCheck['code']} (Expected 401)\n";
assert($revokedCheck['code'] === 401);
echo "\n";

// 4. SIMULATE WAITING-ACTIVATION & POS GUARD
echo "[4] Testing State Simulation: WAITING_ACTIVATION\n";
$simWait = apiReq('POST', '/v1/billing/simulate-status', [
    'status' => 'waiting_activation',
], ['Authorization' => "Bearer {$token}"]);
echo "Simulate Status HTTP: {$simWait['code']}, New Status: " . ($simWait['data']['data']['status'] ?? '') . "\n";
assert($simWait['code'] === 200);

// POS attempt should be rejected with 403
$posBlockedWait = hmacReq('GET', '/v1/products', $deviceId, $deviceSecret);
echo "POS Access in WAITING_ACTIVATION: HTTP {$posBlockedWait['code']} (Expected 403)\n";
echo "Response message: " . ($posBlockedWait['data']['message'] ?? '') . "\n";
assert($posBlockedWait['code'] === 403);
assert($posBlockedWait['data']['errors']['tenant_status'] === 'waiting_activation');
echo "\n";

// 5. SIMULATE ACTIVATION PAYMENT
echo "[5] Testing Simulate Activation Payment (POST /v1/billing/simulate-activation):\n";
$simAct = apiReq('POST', '/v1/billing/simulate-activation', [
    'amount' => 250000,
    'payment_method' => 'qris_static',
], ['Authorization' => "Bearer {$token}"]);
echo "Activation HTTP Code: {$simAct['code']}, Invoice: " . ($simAct['data']['data']['invoice_number'] ?? '') . "\n";
assert($simAct['code'] === 200);

// POS attempt should now SUCCEED (200)
$posAllowed = hmacReq('GET', '/v1/products', $deviceId, $deviceSecret);
echo "POS Access after Activation: HTTP {$posAllowed['code']} (Expected 200)\n";
assert($posAllowed['code'] === 200);
echo "\n";

// 6. SIMULATE ON-HOLD & POS GUARD
echo "[6] Testing State Simulation: ON_HOLD\n";
$simHold = apiReq('POST', '/v1/billing/simulate-status', [
    'status' => 'on_hold',
], ['Authorization' => "Bearer {$token}"]);
echo "Simulate Status HTTP: {$simHold['code']}, New Status: " . ($simHold['data']['data']['status'] ?? '') . "\n";
assert($simHold['code'] === 200);

// POS attempt should be rejected with 403
$posBlockedHold = hmacReq('GET', '/v1/products', $deviceId, $deviceSecret);
echo "POS Access in ON_HOLD: HTTP {$posBlockedHold['code']} (Expected 403)\n";
echo "Response message: " . ($posBlockedHold['data']['message'] ?? '') . "\n";
assert($posBlockedHold['code'] === 403);
assert($posBlockedHold['data']['errors']['tenant_status'] === 'on_hold');
echo "\n";

// 7. SIMULATE RECURRING PAYMENT
echo "[7] Testing Simulate Recurring Payment (POST /v1/billing/simulate-recurring):\n";
$simRec = apiReq('POST', '/v1/billing/simulate-recurring', [
    'amount' => 150000,
    'duration_days' => 30,
], ['Authorization' => "Bearer {$token}"]);
echo "Recurring HTTP Code: {$simRec['code']}, Invoice: " . ($simRec['data']['data']['invoice_number'] ?? '') . ", New Expiry: " . ($simRec['data']['data']['subscription_expires_at'] ?? '') . "\n";
assert($simRec['code'] === 200);

// POS attempt should now SUCCEED again (200)
$posAllowedRec = hmacReq('GET', '/v1/products', $deviceId, $deviceSecret);
echo "POS Access after Recurring Payment: HTTP {$posAllowedRec['code']} (Expected 200)\n";
assert($posAllowedRec['code'] === 200);
echo "\n";

// 8. SIMULATE TERMINATED & POS GUARD
echo "[8] Testing State Simulation: TERMINATED\n";
$simTerm = apiReq('POST', '/v1/billing/simulate-status', [
    'status' => 'terminated',
], ['Authorization' => "Bearer {$token}"]);
echo "Simulate Status HTTP: {$simTerm['code']}, New Status: " . ($simTerm['data']['data']['status'] ?? '') . "\n";
assert($simTerm['code'] === 200);

// POS attempt must be blocked permanently
$posBlockedTerm = hmacReq('GET', '/v1/products', $deviceId, $deviceSecret);
echo "POS Access in TERMINATED: HTTP {$posBlockedTerm['code']} (Expected 403)\n";
echo "Response message: " . ($posBlockedTerm['data']['message'] ?? '') . "\n";
assert($posBlockedTerm['code'] === 403);
assert($posBlockedTerm['data']['errors']['tenant_status'] === 'terminated');
echo "\n";

// 9. SUPER ADMIN SIMULATION
echo "[9] Testing Super Admin Simulation (/v1/admin/tenants/{id}/simulate-billing):\n";
$adminSim = apiReq('POST', "/v1/admin/tenants/{$tenantId}/simulate-billing", [
    'action' => 'recurring',
    'amount' => 175000,
    'duration_days' => 60,
], ['X-Platform-Secret' => $platformSecret]);
echo "Admin Simulation HTTP Code: {$adminSim['code']}, Result Status: " . ($adminSim['data']['data']['status'] ?? '') . "\n";
assert($adminSim['code'] === 200);
echo "\n";

// 10. INVOICES AUDIT TRAIL
echo "[10] Testing Invoices Audit Trail (GET /v1/billing/invoices):\n";
$invoices = apiReq('GET', '/v1/billing/invoices', [], ['Authorization' => "Bearer {$token}"]);
echo "Invoices HTTP Code: {$invoices['code']}, Total Invoices: " . count($invoices['data']['data'] ?? []) . "\n";
foreach ($invoices['data']['data'] ?? [] as $inv) {
    echo "- Inv: {$inv['invoice_number']} | Type: {$inv['type']} | Amount: Rp " . number_format($inv['amount'], 0, ',', '.') . " | Status: {$inv['status']}\n";
}
assert($invoices['code'] === 200);
assert(count($invoices['data']['data'] ?? []) >= 2);

echo "\n=== ALL AUTH & BILLING LIFECYCLE SIMULATION TESTS PASSED! ===\n";
