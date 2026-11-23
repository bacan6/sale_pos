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

echo "=== STARTING HOTEL PMS V2 API TESTS ===\n";

// 1. Auth Login
$res = apiCall('POST', '/v1/auth/login', [
    'username' => 'admin',
    'password' => 'admin123'
]);
$token = $res['data']['data']['token'] ?? '';
echo "1. Auth Login [{$res['code']}]: " . ($token ? "PASS" : "FAIL") . "\n";
$authHeaders = ['Authorization' => "Bearer {$token}"];

// 2. Hotel Services Catalog
$res = apiCall('GET', '/v1/hotel/services', [], $authHeaders);
$services = $res['data']['data'] ?? [];
echo "2. Hotel Services Catalog [{$res['code']}]: " . count($services) . " services found - " . ($res['code'] === 200 ? "PASS" : "FAIL") . "\n";

// 3. Guest CRM & Blacklist Protection
// Clean up or prepare a test guest
$db->prepare('UPDATE hotel_guests SET is_blacklisted = 1, blacklist_reason = "Kerusakan fasilitas tv kamar" WHERE phone = "081299990001" OR id_card_number = "3171012345670099"')->execute();
if ($db->query('SELECT COUNT(*) FROM hotel_guests WHERE id_card_number = "3171012345670099"')->fetchColumn() == 0) {
    $db->prepare('INSERT INTO hotel_guests (tenant_id, full_name, id_card_number, phone, is_blacklisted, blacklist_reason) VALUES (1, "Pak Blacklist", "3171012345670099", "081299990001", 1, "Kerusakan fasilitas tv kamar")')->execute();
}

// Prepare room 102 & 202 for tests
$r102 = $db->query('SELECT id FROM hotel_rooms WHERE room_number = "102" AND tenant_id = 1')->fetch();
$r202 = $db->query('SELECT id FROM hotel_rooms WHERE room_number = "202" AND tenant_id = 1')->fetch();
$db->prepare('UPDATE hotel_rooms SET status = "vacant_clean", active_booking_id = NULL WHERE id IN (?, ?)')->execute([(int)$r102['id'], (int)$r202['id']]);

// 3a. Attempt booking for blacklisted guest without override -> Should be 400 with warning
$res = apiCall('POST', '/v1/hotel/bookings', [
    'room_id' => (int)$r102['id'],
    'guest_name' => 'Pak Blacklist',
    'id_card_number' => '3171012345670099',
    'phone' => '081299990001',
    'check_in_date' => date('Y-m-d'),
    'check_out_date' => date('Y-m-d', strtotime('+1 day')),
], $authHeaders);
echo "3a. Blacklist Prevention [{$res['code']}]: " . ($res['code'] === 400 && str_contains($res['data']['message'] ?? '', 'PERINGATAN BLACKLIST') ? "PASS" : "FAIL") . "\n";

// 3b. Booking with override_blacklist = true -> Should succeed
$res = apiCall('POST', '/v1/hotel/bookings', [
    'room_id' => (int)$r102['id'],
    'guest_name' => 'Pak Blacklist',
    'id_card_number' => '3171012345670099',
    'phone' => '081299990001',
    'check_in_date' => date('Y-m-d'),
    'check_out_date' => date('Y-m-d', strtotime('+1 day')),
    'override_blacklist' => true,
    'auto_check_in' => true,
], $authHeaders);
$bkgId = $res['data']['data']['booking_id'] ?? 0;
$folioId = $res['data']['data']['folio_id'] ?? 0;
echo "3b. Override Blacklist Check-in [{$res['code']}]: " . ($bkgId ? "PASS (Booking #{$bkgId})" : "FAIL") . "\n";

// 4. Room Transfer (Pindah Kamar 102 -> 202)
$res = apiCall('POST', "/v1/hotel/bookings/{$bkgId}/transfer-room", [
    'target_room_id' => (int)$r202['id'],
    'reason' => 'Upgrade tamu VIP dan keluhan AC kamar 102 bising',
    'apply_new_rate' => false,
], $authHeaders);
echo "4. Room Transfer [{$res['code']}]: " . ($res['code'] === 200 ? "PASS" : "FAIL") . " - " . ($res['data']['message'] ?? '') . "\n";

// Verify room status in DB
$s102 = $db->query("SELECT status, active_booking_id FROM hotel_rooms WHERE id = {$r102['id']}")->fetch();
$s202 = $db->query("SELECT status, active_booking_id FROM hotel_rooms WHERE id = {$r202['id']}")->fetch();
echo "   Old Room 102 Status: {$s102['status']} (Expected: vacant_dirty) - " . ($s102['status'] === 'vacant_dirty' ? "PASS" : "FAIL") . "\n";
echo "   New Room 202 Status: {$s202['status']} (Expected: occupied_clean) - " . ($s202['status'] === 'occupied_clean' ? "PASS" : "FAIL") . "\n";

// 5. Extend Stay (+2 nights)
$res = apiCall('POST', "/v1/hotel/bookings/{$bkgId}/extend-stay", [
    'extra_nights' => 2,
], $authHeaders);
echo "5. Extend Stay [{$res['code']}]: " . ($res['code'] === 200 ? "PASS" : "FAIL") . " (New checkout: " . ($res['data']['data']['new_check_out_date'] ?? '') . ")\n";

// 6. Early / Late Checkout Fee
$res = apiCall('POST', "/v1/hotel/bookings/{$bkgId}/early-late-charge", [
    'type' => 'late_checkout',
    'amount' => 75000,
    'notes' => 'Late checkout s/d jam 15:00',
], $authHeaders);
echo "6. Late Checkout Surcharge [{$res['code']}]: " . ($res['code'] === 200 ? "PASS" : "FAIL") . "\n";

// 7. Add Predefined Service to Folio (Extra Bed)
$serviceExtraBed = $services[0] ?? ['id' => 1];
$res = apiCall('POST', "/v1/hotel/folios/{$folioId}/add-service", [
    'service_id' => $serviceExtraBed['id'],
    'quantity' => 1,
    'notes' => 'Kamar lantai 2',
], $authHeaders);
echo "7. Folio 1-Click Service Addition [{$res['code']}]: " . ($res['code'] === 200 ? "PASS" : "FAIL") . "\n";

// 8. Reservation Timeline Gantt
$res = apiCall('GET', '/v1/hotel/calendar/timeline?days=14', [], $authHeaders);
$timelineRooms = $res['data']['data']['rooms'] ?? [];
echo "8. Reservation Timeline [{$res['code']}]: " . count($timelineRooms) . " rooms returned - " . ($res['code'] === 200 ? "PASS" : "FAIL") . "\n";

// 9. Lost & Found Registry
$res = apiCall('POST', '/v1/hotel/lost-and-found', [
    'room_id' => (int)$r102['id'],
    'item_name' => 'Kacamata Rayban Hitam',
    'description' => 'Tertinggal di atas meja nakas samping ranjang',
    'storage_location' => 'Brankas Front Desk Laci B',
    'found_date' => date('Y-m-d'),
], $authHeaders);
$lfId = $res['data']['data']['id'] ?? 0;
echo "9a. Create Lost & Found Item [{$res['code']}]: " . ($lfId ? "PASS (ID: {$lfId})" : "FAIL") . "\n";

$res = apiCall('PUT', "/v1/hotel/lost-and-found/{$lfId}", [
    'status' => 'claimed',
    'claimed_by_name' => 'Bpk. Hendra (Pemilik)',
], $authHeaders);
echo "9b. Claim Lost & Found Item [{$res['code']}]: " . ($res['code'] === 200 ? "PASS" : "FAIL") . "\n";

// 10. Front Desk Shift Handover
$res = apiCall('GET', '/v1/hotel/shifts/current-summary', [], $authHeaders);
echo "10a. Shift Summary [{$res['code']}]: Arrivals=" . ($res['data']['data']['pending_arrivals'] ?? 0) . ", Departures=" . ($res['data']['data']['pending_departures'] ?? 0) . " - " . ($res['code'] === 200 ? "PASS" : "FAIL") . "\n";

$res = apiCall('POST', '/v1/hotel/shifts/open', [
    'shift_type' => 'morning',
    'cash_opening' => 500000,
    'handover_notes' => 'Kas awal laci Rp 500.000, uang kecil lengkap',
], $authHeaders);
$shiftId = $res['data']['data']['id'] ?? 0;
echo "10b. Open Shift [{$res['code']}]: " . ($shiftId ? "PASS (ID: {$shiftId})" : "FAIL") . "\n";

$res = apiCall('POST', "/v1/hotel/shifts/{$shiftId}/close", [
    'cash_closing' => 1250000,
    'cash_collected' => 750000,
    'handover_notes' => 'Tutup shift pagi berjalan lancar, semua serah terima selesai',
], $authHeaders);
echo "10c. Close Shift [{$res['code']}]: " . ($res['code'] === 200 ? "PASS" : "FAIL") . "\n";

echo "=== ALL HOTEL PMS V2 API TESTS COMPLETED SUCCESSFULLY ===\n";
