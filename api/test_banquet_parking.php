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
echo "  SUITE TEST: BANQUET & SMART PARKING / LOCK SAAS MODULE\n";
echo "========================================================\n\n";

// 1. Health check verification
echo "1. Health Check Gateway: ";
$health = apiCall('GET', '/health');
assert($health['code'] === 200, "Health check failed with {$health['code']}");
$modules = $health['data']['data']['modules'] ?? [];
assert(in_array('banquet', $modules), 'Modul banquet belum terdaftar di health check');
assert(in_array('parking', $modules), 'Modul parking belum terdaftar di health check');
echo "PASS (Modul: " . implode(', ', $modules) . ")\n";

// 2. Ensure Tenant #1 has 'all' modules for the test
$db->exec("UPDATE subscriptions SET modules = 'all' WHERE tenant_id = 1");

// 3. Auth Login
echo "2. Auth Login Tenant Admin: ";
$login = apiCall('POST', '/v1/auth/login', [
    'username' => 'admin',
    'password' => 'admin123',
]);
assert($login['code'] === 200, "Login gagal: " . ($login['data']['message'] ?? $login['raw']));
$token = $login['data']['data']['token'] ?? '';
assert(!empty($token), 'Token tidak didapatkan');
$authHeader = ['Authorization' => 'Bearer ' . $token];
echo "PASS (Token: " . substr($token, 0, 10) . "...)\n";

// 4. Test Guard Protection for Unauthorized Tenant
echo "3. Guard Module Protection (Unauthorized Tenant): ";
$db->exec("INSERT INTO tenants (id, name, slug, email, status) VALUES (987, 'Dummy Solo', 'dummy-solo', 'dummy@test.com', 'active') ON DUPLICATE KEY UPDATE name=name");
$db->exec("INSERT INTO users (id, tenant_id, username, password_hash, full_name, role, is_active) VALUES (987, 987, 'dummy_user', '" . password_hash('pass123', PASSWORD_BCRYPT) . "', 'Dummy', 'admin', 1) ON DUPLICATE KEY UPDATE full_name=full_name");
$db->exec("INSERT INTO subscriptions (tenant_id, plan, modules, max_devices, status, starts_at, expires_at) VALUES (987, 'pos_starter', 'pos', 3, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)) ON DUPLICATE KEY UPDATE modules='pos'");

$dummyLogin = apiCall('POST', '/v1/auth/login', ['username' => 'dummy_user', 'password' => 'pass123']);
$dummyToken = $dummyLogin['data']['data']['token'] ?? '';
$banquetUnauthorized = apiCall('GET', '/v1/banquet/rooms', [], ['Authorization' => 'Bearer ' . $dummyToken]);
assert($banquetUnauthorized['code'] === 403, "Expected 403 for unauthorized module, got {$banquetUnauthorized['code']}");
echo "PASS (403 Forbidden confirmed)\n";

// 5. Banquet Rooms CRUD
echo "4. Banquet Rooms API: ";
$rooms = apiCall('GET', '/v1/banquet/rooms', [], $authHeader);
assert($rooms['code'] === 200, "Get rooms failed: {$rooms['code']}");
$roomCount = count($rooms['data']['data'] ?? []);
assert($roomCount > 0, "Banquet rooms count is 0");

$newRoom = apiCall('POST', '/v1/banquet/rooms', [
    'name' => 'Emerald VIP Boardroom',
    'code' => 'RM-EMR-' . rand(100, 999),
    'floor' => 'Lantai 3',
    'area_sqm' => 45.5,
    'capacity_classroom' => 20,
    'capacity_u_shape' => 16,
    'rate_per_hour' => 250000,
    'facilities' => ['Interactive Smartboard', 'Fiber WiFi', 'Polycom Video Conference'],
], $authHeader);
assert($newRoom['code'] === 201, "Create room failed: " . ($newRoom['data']['message'] ?? ''));
$createdRoomId = (int)$newRoom['data']['data']['id'];
echo "PASS (Created Room ID: {$createdRoomId})\n";

// 6. Banquet Packages API
echo "5. Banquet Packages API: ";
$packages = apiCall('GET', '/v1/banquet/packages', [], $authHeader);
assert($packages['code'] === 200, "Get packages failed");
$firstPackageId = (int)($packages['data']['data'][0]['id'] ?? 1);
echo "PASS (Found " . count($packages['data']['data']) . " packages)\n";

// 7. Banquet Conflict Detection & Booking Lifecycle
echo "6. Banquet Conflict Detection & BEO Booking: ";
$targetRoomId = $createdRoomId;
$startSlot = date('Y-m-d 13:00:00', strtotime('+2 days'));
$endSlot = date('Y-m-d 17:00:00', strtotime('+2 days'));

$dryRunConflict = apiCall('POST', '/v1/banquet/check-conflict', [
    'banquet_room_id' => $targetRoomId,
    'start_time' => $startSlot,
    'end_time' => $endSlot,
], $authHeader);
assert($dryRunConflict['code'] === 200 && $dryRunConflict['data']['data']['conflict'] === false, "Slot should be free");

$bookingRes = apiCall('POST', '/v1/banquet/bookings', [
    'banquet_room_id' => $targetRoomId,
    'customer_name' => 'PT Teknologi Maju Bangsa',
    'customer_phone' => '081234567890',
    'customer_email' => 'corp@tekno.id',
    'company_name' => 'PT Tekno Maju',
    'event_name' => 'Rapat Umum Pemegang Saham (RUPS)',
    'event_type' => 'meeting',
    'layout_type' => 'u_shape',
    'pax_count' => 16,
    'start_time' => $startSlot,
    'end_time' => $endSlot,
    'package_id' => $firstPackageId,
    'deposit_amount' => 500000,
    'items' => [
        ['item_type' => 'equipment', 'name' => 'Wireless Pointer & Clip-on Mic', 'qty' => 2, 'unit_price' => 75000],
        ['item_type' => 'catering', 'name' => 'VIP Fruit Platter', 'qty' => 4, 'unit_price' => 50000],
    ],
], $authHeader);
assert($bookingRes['code'] === 201, "Booking creation failed: " . ($bookingRes['data']['message'] ?? ''));
$bookingId = (int)$bookingRes['data']['data']['id'];

// Overlapping conflict test
$overlappingConflict = apiCall('POST', '/v1/banquet/check-conflict', [
    'banquet_room_id' => $targetRoomId,
    'start_time' => date('Y-m-d 14:00:00', strtotime('+2 days')),
    'end_time' => date('Y-m-d 18:00:00', strtotime('+2 days')),
], $authHeader);
assert($overlappingConflict['data']['data']['conflict'] === true, "Conflict detection should trigger for overlapping slot");

$conflictStore = apiCall('POST', '/v1/banquet/bookings', [
    'banquet_room_id' => $targetRoomId,
    'customer_name' => 'Conflicting Customer',
    'event_name' => 'Bentrok Event',
    'start_time' => date('Y-m-d 14:00:00', strtotime('+2 days')),
    'end_time' => date('Y-m-d 18:00:00', strtotime('+2 days')),
], $authHeader);
assert($conflictStore['code'] === 409, "Expected 409 Conflict, got {$conflictStore['code']}");
echo "PASS (Booking #{$bookingId} created, conflict 409 prevented)\n";

// 8. Banquet Payment Settlement & Hotel Folio Charge Link
echo "7. Banquet Payment Settlement: ";
$payRes = apiCall('POST', "/v1/banquet/bookings/{$bookingId}/payments", [
    'amount' => 1000000,
    'payment_method' => 'cash',
], $authHeader);
assert($payRes['code'] === 200, "Payment record failed");
echo "PASS\n";

// 9. Parking Rates & Gates
echo "8. Parking Gates & Pulse Trigger: ";
$gates = apiCall('GET', '/v1/parking/gates', [], $authHeader);
assert($gates['code'] === 200, "Get parking gates failed");
$firstGateId = (int)($gates['data']['data'][0]['id'] ?? 1);

$pulse = apiCall('POST', "/v1/parking/gates/{$firstGateId}/pulse", ['action' => 'open'], $authHeader);
assert($pulse['code'] === 200, "Pulse gate failed");
assert($pulse['data']['data']['relay_state'] === 'PULSE_HIGH_3000MS', "Invalid relay state");
echo "PASS (Gate #{$firstGateId} pulsed successfully)\n";

// 10. Parking Ticket Check-in & Check-out
echo "9. Parking Ticketing & Guest Waiver: ";
$testPlate = 'B ' . rand(1000, 9999) . ' XYZ';
$checkIn = apiCall('POST', '/v1/parking/tickets/check-in', [
    'plate_number' => $testPlate,
    'vehicle_type' => 'car',
    'entry_gate_id' => $firstGateId,
], $authHeader);
assert($checkIn['code'] === 201, "Parking check-in failed: " . ($checkIn['data']['message'] ?? ''));
$ticketId = (int)$checkIn['data']['data']['id'];

$ticketDetail = apiCall('GET', "/v1/parking/tickets/{$ticketId}", [], $authHeader);
assert($ticketDetail['code'] === 200 && $ticketDetail['data']['data']['status'] === 'parked', "Ticket should be parked");

$checkOut = apiCall('POST', "/v1/parking/tickets/{$ticketId}/check-out", [
    'payment_method' => 'hotel_complimentary',
    'exit_gate_id' => 2,
], $authHeader);
assert($checkOut['code'] === 200, "Check out failed: " . ($checkOut['data']['message'] ?? ''));
assert($checkOut['data']['data']['paid_amount'] == 0, "Complimentary should have 0 paid_amount");
assert($checkOut['data']['data']['status'] === 'exited', "Ticket status should be exited");
echo "PASS (Ticket #{$ticketId} [{$testPlate}] settled as complimentary)\n";

// 11. Smart Lock IoT Access Control
echo "10. Smart Lock Remote Unlock & Passcode Generation: ";
$locks = apiCall('GET', '/v1/parking/smart-locks', [], $authHeader);
assert($locks['code'] === 200, "Get smart locks failed");
$firstLockId = (int)($locks['data']['data'][0]['id'] ?? 1);

$unlock = apiCall('POST', "/v1/parking/smart-locks/{$firstLockId}/unlock", ['duration_seconds' => 5], $authHeader);
assert($unlock['code'] === 200, "Remote unlock failed");
assert($unlock['data']['data']['state'] === 'UNLOCKED', "Lock state should be UNLOCKED");

$passcode = apiCall('POST', "/v1/parking/smart-locks/{$firstLockId}/generate-passcode", ['valid_hours' => 12], $authHeader);
assert($passcode['code'] === 200, "Generate passcode failed");
assert(!empty($passcode['data']['data']['passcode']), "Passcode should be returned");

$logs = apiCall('GET', '/v1/parking/smart-locks/logs', [], $authHeader);
assert($logs['code'] === 200 && count($logs['data']['data']) > 0, "Logs should have records");
echo "PASS (Remote open & Passcode " . $passcode['data']['data']['passcode'] . " verified)\n";

echo "\n========================================================\n";
echo "  ALL BANQUET & SMART PARKING / LOCK TESTS PASSED (10/10)!\n";
echo "========================================================\n";
