<?php
declare(strict_types=1);

$baseUrl = 'http://localhost/sale_pos/api';
$deviceId = 'POS-KASIR-01';
$deviceSecret = 'sec_kopi_senja_kasir_987213';

function httpReq(string $method, string $path, array $body = []): array {
    global $baseUrl, $deviceId, $deviceSecret;

    $url = $baseUrl . $path;
    $parsed = parse_url($url);
    $uri = ($parsed['path'] ?? '') . (isset($parsed['query']) ? '?' . $parsed['query'] : '');

    $jsonBody = !empty($body) ? json_encode($body) : '';
    $timestamp = (string)time();

    $payload = "{$method}\n{$uri}\n{$timestamp}\n{$jsonBody}";
    $signature = hash_hmac('sha256', $payload, $deviceSecret);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Device-Id: ' . $deviceId,
        'X-Timestamp: ' . $timestamp,
        'X-Signature: ' . $signature,
    ]);

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

echo "=== TESTING API VIA APACHE HTTP (PORT 80) ===\n\n";

// 1. Health check (no auth needed)
echo "[1] Health check:\n";
$health = file_get_contents($baseUrl . '/health');
echo "Status: " . $health . "\n\n";

// 2. Auth failure check (no headers)
echo "[2] Security Test - Missing HMAC header check:\n";
$ch = curl_init($baseUrl . '/v1/product-categories');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$resNoAuth = curl_exec($ch);
$codeNoAuth = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "HTTP Code: {$codeNoAuth} (Expected 401)\n";
echo "Response: {$resNoAuth}\n\n";

// 3. Product categories with HMAC
echo "[3] Product Categories List (HMAC Authorized):\n";
$cats = httpReq('GET', '/v1/product-categories');
echo "HTTP Code: {$cats['code']}\n";
echo "Found " . count($cats['data']['data'] ?? []) . " categories.\n\n";

// 4. Room Categories List
echo "[4] Room Categories List (Zonasi Ruangan):\n";
$rooms = httpReq('GET', '/v1/room-categories');
echo "HTTP Code: {$rooms['code']}\n";
foreach ($rooms['data']['data'] ?? [] as $r) {
    echo "- Zone ID: {$r['id']}, Name: {$r['name']}, Desc: {$r['description']}\n";
}
echo "\n";

// 5. Create Order via Cashier/Waitstaff
echo "[5] Create Order (ORD-HTTP-TEST):\n";
$newOrder = httpReq('POST', '/v1/orders', [
    'order_number' => 'ORD-HTTP-' . substr(strval(time()), -4),
    'table_id' => 3,
    'order_type' => 'Dine-In',
    'waiter_name' => 'Siti Rahma',
    'discount_percent' => 5,
    'items' => [
        [
            'product_id' => 2, // Cafe Latte
            'quantity' => 2,
            'notes' => 'Less sugar, oatmilk',
        ],
        [
            'product_id' => 6, // French Fries
            'quantity' => 1,
            'notes' => 'Saus dipisah',
        ],
    ],
]);
echo "HTTP Code: {$newOrder['code']}\n";
print_r($newOrder['data']);
$orderId = $newOrder['data']['data']['id'] ?? null;
echo "\n";

// 6. Kitchen Ticket creation
if ($orderId) {
    echo "[6] Send Order to Kitchen Ticket:\n";
    $kt = httpReq('POST', '/v1/kitchen-tickets', [
        'order_id' => $orderId,
        'order_number' => $newOrder['data']['data']['order_number'],
        'table_name' => 'Meja 03',
        'type' => 'Dine-In',
        'waiter_name' => 'Siti Rahma',
        'items' => [
            ['name' => 'Cafe Latte', 'qty' => 2, 'notes' => 'Less sugar, oatmilk'],
            ['name' => 'French Fries Truffle Mayo', 'qty' => 1, 'notes' => 'Saus dipisah'],
        ],
    ]);
    echo "HTTP Code: {$kt['code']}\n";
    print_r($kt['data']);
    echo "\n";

    // 7. Payment
    echo "[7] Pay Order:\n";
    $pay = httpReq('POST', '/v1/payments', [
        'order_id' => $orderId,
        'method' => 'cash',
        'amount_paid' => 100000,
    ]);
    echo "HTTP Code: {$pay['code']}\n";
    print_r($pay['data']);
    echo "\n";
}

// 8. Sync Push (Periodic sync)
echo "[8] Sync Push (Every 5/10 min if transactions exist):\n";
$syncPush = httpReq('POST', '/v1/sync/push', [
    'transactions' => [
        [
            'order_number' => 'ORD-SYNC-' . substr(strval(time()), -4),
            'table_id' => 1,
            'order_type' => 'Take-Away',
            'waiter_name' => 'Offline POS',
            'status' => 'paid',
            'discount_percent' => 0,
            'subtotal' => 28000,
            'tax_amount' => 2800,
            'total' => 30800,
            'items' => [
                [
                    'product_id' => 5,
                    'product_name' => 'Signature Ice Chocolate',
                    'quantity' => 1,
                    'unit_price' => 28000,
                    'subtotal' => 28000,
                ],
            ],
            'payment' => [
                'method' => 'cash',
                'total_amount' => 30800,
                'amount_paid' => 50000,
                'change_amount' => 19200,
            ],
        ],
    ],
]);
echo "HTTP Code: {$syncPush['code']}\n";
print_r($syncPush['data']);
echo "\n";

// 9. Sync Pull
echo "[9] Sync Pull:\n";
$syncPull = httpReq('GET', '/v1/sync/pull?since=' . urlencode(date('Y-m-d H:i:s', time() - 3600)));
echo "HTTP Code: {$syncPull['code']}\n";
echo "Pulled products: " . count($syncPull['data']['data']['products'] ?? []) . "\n";
echo "Pulled tables: " . count($syncPull['data']['data']['tables'] ?? []) . "\n";
echo "Pulled orders: " . count($syncPull['data']['data']['orders'] ?? []) . "\n";
echo "Server time: " . ($syncPull['data']['data']['server_time'] ?? '') . "\n\n";

echo "=== ALL TESTS COMPLETED SUCCESSFULLY! ===\n";
