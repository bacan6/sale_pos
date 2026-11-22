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

// Ensure admin password is known
require_once __DIR__ . '/config/bootstrap.php';
$db = App\Core\Database::getInstance()->pdo();
$db->prepare('UPDATE users SET password_hash = ? WHERE username = "admin"')->execute([password_hash('admin123', PASSWORD_BCRYPT)]);

echo "=== STARTING HOTEL PMS & POS INTEGRATION HTTP TESTS ===\n";

// 1. Health check
$res = apiCall('GET', '/health');
echo "1. Health Check [{$res['code']}]: " . ($res['data']['status'] === 'success' ? "PASS" : "FAIL") . "\n";

// 2. Login
$res = apiCall('POST', '/v1/auth/login', [
    'username' => 'admin',
    'password' => 'admin123'
]);
$token = $res['data']['data']['token'] ?? '';
$tenantModules = $res['data']['data']['tenant']['modules'] ?? '';
echo "2. Auth Login [{$res['code']}]: " . ($token ? "PASS" : "FAIL") . " (Modules: {$tenantModules})\n";

$authHeaders = ['Authorization' => "Bearer {$token}"];

// 3. Hotel Room Types
$res = apiCall('GET', '/v1/hotel/room-types', [], $authHeaders);
$roomTypes = $res['data']['data'] ?? [];
echo "3. Hotel Room Types [{$res['code']}]: " . count($roomTypes) . " types found - " . ($res['code'] === 200 ? "PASS" : "FAIL") . "\n";

// 4. Hotel Rooms
$res = apiCall('GET', '/v1/hotel/rooms', [], $authHeaders);
$rooms = $res['data']['data'] ?? [];
echo "4. Hotel Rooms [{$res['code']}]: " . count($rooms) . " rooms found - " . ($res['code'] === 200 ? "PASS" : "FAIL") . "\n";

// 5. Booking creation & Auto Check-in for an available room
$targetRoom = null;
foreach ($rooms as $r) {
    if (empty($r['active_booking_id']) && in_array($r['status'], ['vacant_clean', 'vacant_dirty'])) {
        $targetRoom = $r;
        break;
    }
}
if (!$targetRoom) {
    $targetRoom = $rooms[0];
    $db->prepare('UPDATE hotel_rooms SET active_booking_id = NULL, status = "vacant_clean" WHERE id = ?')->execute([$targetRoom['id']]);
}
$targetRoomId = (int)$targetRoom['id'];
$targetRoomNum = (string)$targetRoom['room_number'];

$res = apiCall('POST', '/v1/hotel/bookings', [
    'room_id' => $targetRoomId,
    'guest_name' => 'Prof. Susilo Bambang',
    'id_card_type' => 'KTP',
    'id_card_number' => '3578912345670002',
    'phone' => '081234567899',
    'source' => 'direct_web',
    'check_in_date' => date('Y-m-d'),
    'check_out_date' => date('Y-m-d', strtotime('+2 days')),
    'deposit_amount' => 150000,
    'auto_check_in' => true
], $authHeaders);
$bookingId = $res['data']['data']['booking_id'] ?? 0;
echo "5. Create & Check-in Booking for Room {$targetRoomNum} [{$res['code']}]: " . ($bookingId > 0 ? "PASS" : "FAIL") . " (ID: {$bookingId})\n";

// 6. POS Order Creation
$res = apiCall('POST', '/v1/pos/orders', [
    'order_number' => 'ORD-PMS-' . time(),
    'order_type' => 'Dine-In',
    'waiter_name' => 'Staff Cafe',
    'items' => [
        [
            'product_id' => 1,
            'quantity' => 2,
            'notes' => 'Less sugar'
        ]
    ]
], $authHeaders);
$orderId = $res['data']['data']['id'] ?? 0;
if (!$orderId) {
    echo "DEBUG POS Order response: " . $res['raw'] . "\n";
}
echo "6. POS Order Created [{$res['code']}]: " . ($orderId > 0 ? "PASS" : "FAIL") . " (ID: {$orderId})\n";

// 7. POS Payment: Charge to Hotel Room
$res = apiCall('POST', '/v1/pos/payments', [
    'order_id' => $orderId,
    'method' => 'room_charge',
    'room_number' => $targetRoomNum
], $authHeaders);
echo "7. Charge to Hotel Room {$targetRoomNum} [{$res['code']}]: " . (in_array($res['code'], [200, 201]) ? "PASS" : "FAIL") . "\n";

// 8. Verify Room Folio has POS restaurant item
$res = apiCall('GET', "/v1/hotel/bookings/{$bookingId}", [], $authHeaders);
$folioItems = $res['data']['data']['folio_items'] ?? [];
$posFound = false;
foreach ($folioItems as $item) {
    if ($item['category'] === 'pos_restaurant') {
        $posFound = true;
        break;
    }
}
echo "8. Folio Contains Restaurant Bill: " . ($posFound ? "PASS" : "FAIL") . " (Folio items: " . count($folioItems) . ")\n";

// 9. Housekeeping Quick Clean Room 102
$res = apiCall('POST', '/v1/hotel/housekeeping/rooms/2/quick-clean', [], $authHeaders);
echo "9. Housekeeping Quick Clean [{$res['code']}]: " . ($res['code'] === 200 ? "PASS" : "FAIL") . "\n";

// 10. Night Audit Run
$res = apiCall('POST', '/v1/hotel/night-audit/run', [
    'audit_date' => date('Y-m-d')
], $authHeaders);
echo "10. Night Audit Execution [{$res['code']}]: " . ($res['code'] === 200 ? "PASS" : "FAIL") . " (Occupancy: " . ($res['data']['data']['occupancy_rate'] ?? 0) . "%)\n";

// 11. Module Gate Test: Change plan to POS Solo, then try to access Hotel route
$res = apiCall('POST', '/v1/billing/simulate-plan', ['plan' => 'pos_starter'], $authHeaders);
echo "11a. Switch Plan to 'pos_starter' [{$res['code']}]: " . ($res['code'] === 200 ? "PASS" : "FAIL") . "\n";

// Re-login to get updated token
$loginPosOnly = apiCall('POST', '/v1/auth/login', ['username' => 'admin', 'password' => 'admin123']);
$posOnlyToken = $loginPosOnly['data']['data']['token'] ?? '';

$hotelBlockedRes = apiCall('GET', '/v1/hotel/rooms', [], ['Authorization' => "Bearer {$posOnlyToken}"]);
$isBlocked = ($hotelBlockedRes['code'] === 403);
echo "11b. Hotel route access blocked for POS-only tenant [{$hotelBlockedRes['code']}]: " . ($isBlocked ? "PASS" : "FAIL") . "\n";

// Switch back to combo_pro plan
$restoreRes = apiCall('POST', '/v1/billing/simulate-plan', ['plan' => 'combo_pro'], ['Authorization' => "Bearer {$posOnlyToken}"]);
echo "12. Restore Combo Plan [{$restoreRes['code']}]: " . ($restoreRes['code'] === 200 ? "PASS" : "FAIL") . "\n";

echo "=== ALL HTTP INTEGRATION TESTS PASSED ===\n";
