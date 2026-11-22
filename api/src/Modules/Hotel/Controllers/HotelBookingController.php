<?php
declare(strict_types=1);

namespace App\Modules\Hotel\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class HotelBookingController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $query = 'SELECT hb.*, 
                         hg.full_name as guest_name, hg.phone as guest_phone, hg.id_card_number,
                         hr.room_number, hr.floor,
                         hrt.name as room_type_name, hrt.code as room_type_code,
                         hf.id as folio_id, hf.folio_number, hf.balance as folio_balance, hf.status as folio_status
                  FROM hotel_bookings hb
                  JOIN hotel_guests hg ON hb.guest_id = hg.id
                  JOIN hotel_rooms hr ON hb.room_id = hr.id
                  JOIN hotel_room_types hrt ON hr.room_type_id = hrt.id
                  LEFT JOIN hotel_folios hf ON hb.id = hf.booking_id
                  WHERE hb.tenant_id = ?
                  ORDER BY hb.id DESC LIMIT 100';

        $stmt = $db->prepare($query);
        $stmt->execute([$tenantId]);
        $rows = $stmt->fetchAll();

        Response::success($rows);
    }

    public function show(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT hb.*, 
                                     hg.full_name as guest_name, hg.id_card_type, hg.id_card_number, hg.phone as guest_phone, hg.email as guest_email, hg.address as guest_address,
                                     hr.room_number, hr.floor, hr.status as room_status,
                                     hrt.name as room_type_name, hrt.code as room_type_code,
                                     hf.id as folio_id, hf.folio_number, hf.total_charges, hf.total_payments, hf.balance, hf.status as folio_status
                              FROM hotel_bookings hb
                              JOIN hotel_guests hg ON hb.guest_id = hg.id
                              JOIN hotel_rooms hr ON hb.room_id = hr.id
                              JOIN hotel_room_types hrt ON hr.room_type_id = hrt.id
                              LEFT JOIN hotel_folios hf ON hb.id = hf.booking_id
                              WHERE hb.id = ? AND hb.tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Data reservasi/booking tidak ditemukan', 404);
        }

        if (!empty($row['folio_id'])) {
            $itemStmt = $db->prepare('SELECT * FROM hotel_folio_items WHERE folio_id = ? AND tenant_id = ? ORDER BY id ASC');
            $itemStmt->execute([$row['folio_id'], $tenantId]);
            $row['folio_items'] = $itemStmt->fetchAll();
        } else {
            $row['folio_items'] = [];
        }

        Response::success($row);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $roomId = (int)($body['room_id'] ?? 0);
        $guestName = trim((string)($body['guest_name'] ?? ''));
        $idCardType = (string)($body['id_card_type'] ?? 'KTP');
        $idCardNumber = trim((string)($body['id_card_number'] ?? ''));
        $phone = trim((string)($body['phone'] ?? ''));
        $email = trim((string)($body['email'] ?? ''));
        $source = (string)($body['source'] ?? 'walk_in');
        $otaRef = trim((string)($body['ota_reference_code'] ?? ''));
        $checkInDate = trim((string)($body['check_in_date'] ?? date('Y-m-d')));
        $checkOutDate = trim((string)($body['check_out_date'] ?? date('Y-m-d', strtotime('+1 day'))));
        $depositAmount = max(0, (int)($body['deposit_amount'] ?? 0));
        $notes = trim((string)($body['notes'] ?? ''));
        $autoCheckIn = !empty($body['auto_check_in']);

        if ($roomId <= 0 || $guestName === '' || $idCardNumber === '') {
            Response::error('Pilih kamar, nama tamu, dan nomor identitas (KTP/Passport) wajib diisi', 422);
        }

        $nights = (int)((strtotime($checkOutDate) - strtotime($checkInDate)) / 86400);
        if ($nights <= 0) {
            $nights = 1;
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $rStmt = $db->prepare('SELECT hr.*, hrt.base_price, hrt.name as type_name 
                                  FROM hotel_rooms hr 
                                  JOIN hotel_room_types hrt ON hr.room_type_id = hrt.id 
                                  WHERE hr.id = ? AND hr.tenant_id = ? FOR UPDATE');
            $rStmt->execute([$roomId, $tenantId]);
            $room = $rStmt->fetch();

            if (!$room) {
                throw new Exception('Kamar tidak ditemukan');
            }

            if ($autoCheckIn && !empty($room['active_booking_id'])) {
                throw new Exception("Kamar #{$room['room_number']} saat ini sedang terisi.");
            }

            // Find or create guest
            $gStmt = $db->prepare('SELECT id FROM hotel_guests WHERE tenant_id = ? AND (id_card_number = ? OR (phone = ? AND phone != "")) LIMIT 1');
            $gStmt->execute([$tenantId, $idCardNumber, $phone]);
            $existingGuest = $gStmt->fetch();

            if ($existingGuest) {
                $guestId = (int)$existingGuest['id'];
                $db->prepare('UPDATE hotel_guests SET full_name = ?, id_card_type = ?, phone = ?, email = ? WHERE id = ?')
                   ->execute([$guestName, $idCardType, $phone ?: null, $email ?: null, $guestId]);
            } else {
                $insGuest = $db->prepare('INSERT INTO hotel_guests (tenant_id, full_name, id_card_type, id_card_number, phone, email) VALUES (?, ?, ?, ?, ?, ?)');
                $insGuest->execute([$tenantId, $guestName, $idCardType, $idCardNumber, $phone ?: null, $email ?: null]);
                $guestId = (int)$db->lastInsertId();
            }

            $ratePerNight = (int)$room['base_price'];
            $totalRoomCharge = $ratePerNight * $nights;
            $bookingNumber = 'BKG-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));

            $status = $autoCheckIn ? 'checked_in' : 'reserved';
            $actualCheckIn = $autoCheckIn ? date('Y-m-d H:i:s') : null;

            $insBooking = $db->prepare('INSERT INTO hotel_bookings 
                (tenant_id, booking_number, guest_id, room_id, source, ota_reference_code, check_in_date, check_out_date, actual_check_in_at, status, night_count, rate_per_night, deposit_amount, total_amount, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $insBooking->execute([
                $tenantId, $bookingNumber, $guestId, $roomId, $source, $otaRef ?: null,
                $checkInDate, $checkOutDate, $actualCheckIn, $status, $nights, $ratePerNight,
                $depositAmount, $totalRoomCharge, $notes ?: null
            ]);
            $bookingId = (int)$db->lastInsertId();

            // Create Folio
            $folioNumber = 'FOL-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
            $initialCharges = $totalRoomCharge;
            $initialPayments = $depositAmount;
            $initialBalance = $initialCharges - $initialPayments;

            $insFolio = $db->prepare('INSERT INTO hotel_folios (tenant_id, booking_id, folio_number, status, total_charges, total_payments, balance) 
                                     VALUES (?, ?, ?, "open", ?, ?, ?)');
            $insFolio->execute([$tenantId, $bookingId, $folioNumber, $initialCharges, $initialPayments, $initialBalance]);
            $folioId = (int)$db->lastInsertId();

            // Add Room Charge to Folio
            $desc = "Sewa Kamar {$room['type_name']} #{$room['room_number']} ({$nights} Malam)";
            $insItem = $db->prepare('INSERT INTO hotel_folio_items (tenant_id, folio_id, category, description, amount, quantity) VALUES (?, ?, "room_charge", ?, ?, 1)');
            $insItem->execute([$tenantId, $folioId, $desc, $totalRoomCharge]);

            if ($depositAmount > 0) {
                $insPay = $db->prepare('INSERT INTO hotel_folio_items (tenant_id, folio_id, category, description, amount, quantity) VALUES (?, ?, "payment", "Uang Muka / Deposit Reservasi", ?, 1)');
                $insPay->execute([$tenantId, $folioId, -$depositAmount]);
            }

            if ($autoCheckIn) {
                $db->prepare('UPDATE hotel_rooms SET status = "occupied_clean", active_booking_id = ? WHERE id = ? AND tenant_id = ?')
                   ->execute([$bookingId, $roomId, $tenantId]);
            }

            $db->commit();

            Response::success([
                'booking_id' => $bookingId,
                'booking_number' => $bookingNumber,
                'folio_id' => $folioId,
                'folio_number' => $folioNumber,
                'status' => $status,
                'total_amount' => $totalRoomCharge,
                'deposit_amount' => $depositAmount,
            ], 'Reservasi hotel berhasil dibuat', 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }

    public function checkIn(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare('SELECT hb.*, hr.room_number, hr.status as room_status, hr.active_booking_id 
                                  FROM hotel_bookings hb 
                                  JOIN hotel_rooms hr ON hb.room_id = hr.id 
                                  WHERE hb.id = ? AND hb.tenant_id = ? FOR UPDATE');
            $stmt->execute([$id, $tenantId]);
            $booking = $stmt->fetch();

            if (!$booking) {
                throw new Exception('Data reservasi tidak ditemukan');
            }

            if ($booking['status'] === 'checked_in') {
                throw new Exception('Tamu sudah dalam status check-in');
            }

            if ($booking['status'] === 'checked_out' || $booking['status'] === 'cancelled') {
                throw new Exception('Reservasi yang sudah selesai/dibatalkan tidak dapat di-check-in');
            }

            if (!empty($booking['active_booking_id']) && (int)$booking['active_booking_id'] !== $id) {
                throw new Exception("Kamar #{$booking['room_number']} saat ini sedang digunakan oleh tamu lain");
            }

            $db->prepare('UPDATE hotel_bookings SET status = "checked_in", actual_check_in_at = NOW() WHERE id = ? AND tenant_id = ?')
               ->execute([$id, $tenantId]);

            $db->prepare('UPDATE hotel_rooms SET status = "occupied_clean", active_booking_id = ? WHERE id = ? AND tenant_id = ?')
               ->execute([$id, $booking['room_id'], $tenantId]);

            $db->commit();

            Response::success([
                'booking_id' => $id,
                'status' => 'checked_in',
                'room_number' => $booking['room_number'],
            ], "Check-in kamar #{$booking['room_number']} berhasil!");
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }

    public function checkOut(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare('SELECT hb.*, hr.room_number, hf.id as folio_id, hf.balance 
                                  FROM hotel_bookings hb 
                                  JOIN hotel_rooms hr ON hb.room_id = hr.id 
                                  LEFT JOIN hotel_folios hf ON hb.id = hf.booking_id 
                                  WHERE hb.id = ? AND hb.tenant_id = ? FOR UPDATE');
            $stmt->execute([$id, $tenantId]);
            $booking = $stmt->fetch();

            if (!$booking) {
                throw new Exception('Data reservasi tidak ditemukan');
            }

            if ($booking['status'] !== 'checked_in') {
                throw new Exception('Hanya reservasi berstatus checked-in yang dapat check-out');
            }

            $folioBalance = (int)($booking['balance'] ?? 0);
            if ($folioBalance > 0) {
                throw new Exception("Tagihan folio kamar masih memiliki sisa saldo Rp " . number_format($folioBalance, 0, ',', '.') . ". Silakan selesaikan pembayaran sebelum check-out.");
            }

            $db->prepare('UPDATE hotel_bookings SET status = "checked_out", actual_check_out_at = NOW() WHERE id = ? AND tenant_id = ?')
               ->execute([$id, $tenantId]);

            $db->prepare('UPDATE hotel_rooms SET status = "vacant_dirty", active_booking_id = NULL WHERE id = ? AND tenant_id = ?')
               ->execute([$booking['room_id'], $tenantId]);

            if (!empty($booking['folio_id'])) {
                $db->prepare('UPDATE hotel_folios SET status = "settled" WHERE id = ? AND tenant_id = ?')
                   ->execute([$booking['folio_id'], $tenantId]);
            }

            // Create cleaning task automatically
            $db->prepare('INSERT INTO hotel_housekeeping_tasks (tenant_id, room_id, task_type, priority, status, notes) 
                          VALUES (?, ?, "checkout_cleaning", "high", "pending", "Kamar check-out, perlu dibersihkan untuk tamu berikutnya")')
               ->execute([$tenantId, $booking['room_id']]);

            $db->commit();

            Response::success([
                'booking_id' => $id,
                'status' => 'checked_out',
                'room_number' => $booking['room_number'],
            ], "Check-out kamar #{$booking['room_number']} berhasil. Status kamar berubah ke Vacant Dirty & tugas housekeeping otomatis dibuat.");
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }

    public function cancel(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT id, status, room_id FROM hotel_bookings WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$id, $tenantId]);
        $booking = $stmt->fetch();

        if (!$booking) {
            Response::error('Reservasi tidak ditemukan', 404);
        }

        if ($booking['status'] === 'checked_in') {
            Response::error('Reservasi yang sedang aktif menginap tidak bisa dibatalkan langsung. Lakukan check-out.', 400);
        }

        $db->prepare('UPDATE hotel_bookings SET status = "cancelled" WHERE id = ? AND tenant_id = ?')->execute([$id, $tenantId]);
        Response::success(null, 'Reservasi berhasil dibatalkan');
    }
}
