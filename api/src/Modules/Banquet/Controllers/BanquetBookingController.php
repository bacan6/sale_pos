<?php
declare(strict_types=1);

namespace App\Modules\Banquet\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class BanquetBookingController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $roomId = Request::query('room_id');
        $status = Request::query('status');
        $date = Request::query('date');

        $sql = 'SELECT b.*, r.name as room_name, r.code as room_code, p.name as package_name 
                FROM banquet_bookings b 
                JOIN banquet_rooms r ON b.banquet_room_id = r.id 
                LEFT JOIN banquet_packages p ON b.package_id = p.id 
                WHERE b.tenant_id = ?';
        $params = [$tenantId];

        if ($roomId) {
            $sql .= ' AND b.banquet_room_id = ?';
            $params[] = (int)$roomId;
        }
        if ($status) {
            $sql .= ' AND b.status = ?';
            $params[] = $status;
        }
        if ($date) {
            $sql .= ' AND DATE(b.start_time) = ?';
            $params[] = $date;
        }

        $sql .= ' ORDER BY b.start_time DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        Response::success($stmt->fetchAll());
    }

    public function show(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT b.*, r.name as room_name, r.code as room_code, p.name as package_name 
            FROM banquet_bookings b 
            JOIN banquet_rooms r ON b.banquet_room_id = r.id 
            LEFT JOIN banquet_packages p ON b.package_id = p.id 
            WHERE b.tenant_id = ? AND b.id = ? LIMIT 1');
        $stmt->execute([$tenantId, $id]);
        $booking = $stmt->fetch();

        if (!$booking) {
            Response::error('Reservasi banquet tidak ditemukan', 404);
        }

        $stmtItems = $db->prepare('SELECT * FROM banquet_booking_items WHERE tenant_id = ? AND banquet_booking_id = ? ORDER BY id ASC');
        $stmtItems->execute([$tenantId, $id]);
        $booking['items'] = $stmtItems->fetchAll();

        Response::success($booking);
    }

    public function checkConflict(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $roomId = (int)($body['banquet_room_id'] ?? 0);
        $startTime = trim((string)($body['start_time'] ?? ''));
        $endTime = trim((string)($body['end_time'] ?? ''));
        $excludeBookingId = isset($body['exclude_booking_id']) ? (int)$body['exclude_booking_id'] : 0;

        if ($roomId <= 0 || $startTime === '' || $endTime === '') {
            Response::error('banquet_room_id, start_time, dan end_time wajib diisi', 422);
        }

        $hasConflict = $this->hasScheduleConflict($tenantId, $roomId, $startTime, $endTime, $excludeBookingId);
        Response::success([
            'conflict' => $hasConflict,
            'message' => $hasConflict ? 'Jadwal ruangan bentrok dengan acara lain' : 'Jadwal ruangan tersedia',
        ]);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $roomId = (int)($body['banquet_room_id'] ?? 0);
        $customerName = trim((string)($body['customer_name'] ?? ''));
        $customerPhone = trim((string)($body['customer_phone'] ?? ''));
        $customerEmail = trim((string)($body['customer_email'] ?? ''));
        $companyName = trim((string)($body['company_name'] ?? ''));
        $eventName = trim((string)($body['event_name'] ?? ''));
        $eventType = (string)($body['event_type'] ?? 'meeting');
        $layoutType = (string)($body['layout_type'] ?? 'classroom');
        $paxCount = (int)($body['pax_count'] ?? 1);
        $startTime = trim((string)($body['start_time'] ?? ''));
        $endTime = trim((string)($body['end_time'] ?? ''));
        $packageId = isset($body['package_id']) && $body['package_id'] ? (int)$body['package_id'] : null;
        $depositAmount = (float)($body['deposit_amount'] ?? 0.0);
        $hotelBookingId = isset($body['hotel_booking_id']) && $body['hotel_booking_id'] ? (int)$body['hotel_booking_id'] : null;
        $notes = trim((string)($body['notes'] ?? ''));
        $items = (array)($body['items'] ?? []);

        if ($roomId <= 0 || $customerName === '' || $eventName === '' || $startTime === '' || $endTime === '') {
            Response::error('Ruangan, nama pelanggan, nama acara, waktu mulai dan selesai wajib diisi', 422);
        }

        if (strtotime($endTime) <= strtotime($startTime)) {
            Response::error('Waktu selesai harus lebih besar dari waktu mulai', 422);
        }

        $db = Database::getInstance()->pdo();

        if ($this->hasScheduleConflict($tenantId, $roomId, $startTime, $endTime)) {
            Response::error('Jadwal ruangan bentrok dengan reservasi acara lain pada jam yang sama', 409);
        }

        $subtotal = 0.0;
        $equipmentTotal = 0.0;
        $cateringTotal = 0.0;

        if ($packageId) {
            $stmtPkg = $db->prepare('SELECT price_per_pax FROM banquet_packages WHERE tenant_id = ? AND id = ? LIMIT 1');
            $stmtPkg->execute([$tenantId, $packageId]);
            $pkg = $stmtPkg->fetch();
            if ($pkg) {
                $subtotal += ((float)$pkg['price_per_pax']) * $paxCount;
            }
        } else {
            $stmtRoom = $db->prepare('SELECT rate_per_hour FROM banquet_rooms WHERE tenant_id = ? AND id = ? LIMIT 1');
            $stmtRoom->execute([$tenantId, $roomId]);
            $rm = $stmtRoom->fetch();
            if ($rm) {
                $hours = max(1.0, (strtotime($endTime) - strtotime($startTime)) / 3600);
                $subtotal += ((float)$rm['rate_per_hour']) * $hours;
            }
        }

        foreach ($items as $item) {
            $itemType = (string)($item['item_type'] ?? 'equipment');
            $qty = max(1, (int)($item['qty'] ?? 1));
            $unitPrice = (float)($item['unit_price'] ?? 0.0);
            $lineTotal = $qty * $unitPrice;
            if ($itemType === 'equipment') {
                $equipmentTotal += $lineTotal;
            } elseif ($itemType === 'catering') {
                $cateringTotal += $lineTotal;
            }
        }

        $taxAmount = ($subtotal + $equipmentTotal + $cateringTotal) * 0.10;
        $totalAmount = $subtotal + $equipmentTotal + $cateringTotal + $taxAmount;

        $db->beginTransaction();
        try {
            $bookingNumber = 'BEO-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
            $paymentStatus = $depositAmount >= $totalAmount ? 'paid' : ($depositAmount > 0 ? 'partial' : 'pending');
            $status = 'confirmed';

            $stmt = $db->prepare('INSERT INTO banquet_bookings 
                (tenant_id, booking_number, banquet_room_id, customer_name, customer_phone, customer_email, company_name, 
                 event_name, event_type, layout_type, pax_count, start_time, end_time, package_id, subtotal_amount, 
                 equipment_amount, catering_amount, tax_amount, total_amount, deposit_amount, paid_amount, payment_status, 
                 status, hotel_booking_id, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $tenantId, $bookingNumber, $roomId, $customerName, $customerPhone ?: null, $customerEmail ?: null, $companyName ?: null,
                $eventName, $eventType, $layoutType, $paxCount, $startTime, $endTime, $packageId, $subtotal,
                $equipmentTotal, $cateringTotal, $taxAmount, $totalAmount, $depositAmount, $depositAmount, $paymentStatus,
                $status, $hotelBookingId, $notes ?: null
            ]);
            $bookingId = (int)$db->lastInsertId();

            if (!empty($items)) {
                $stmtItem = $db->prepare('INSERT INTO banquet_booking_items (tenant_id, banquet_booking_id, item_type, name, qty, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?)');
                foreach ($items as $item) {
                    $itemType = (string)($item['item_type'] ?? 'equipment');
                    $name = trim((string)($item['name'] ?? 'Item'));
                    $qty = max(1, (int)($item['qty'] ?? 1));
                    $unitPrice = (float)($item['unit_price'] ?? 0.0);
                    $stmtItem->execute([$tenantId, $bookingId, $itemType, $name, $qty, $unitPrice, $qty * $unitPrice]);
                }
            }

            $db->commit();
            Response::success([
                'id' => $bookingId,
                'booking_number' => $bookingNumber,
                'total_amount' => $totalAmount,
                'deposit_amount' => $depositAmount,
                'payment_status' => $paymentStatus,
                'status' => $status
            ], 'Reservasi BEO Banquet berhasil dibuat', 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Gagal membuat reservasi banquet: ' . $e->getMessage(), 400);
        }
    }

    public function updateStatus(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();
        $status = (string)($body['status'] ?? '');

        $validStatuses = ['draft', 'confirmed', 'ongoing', 'completed', 'cancelled'];
        if (!in_array($status, $validStatuses, true)) {
            Response::error('Status tidak valid. Pilihan: ' . implode(', ', $validStatuses), 422);
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE banquet_bookings SET status = ? WHERE tenant_id = ? AND id = ?');
        $stmt->execute([$status, $tenantId, $id]);

        Response::success(['id' => $id, 'status' => $status], 'Status reservasi banquet diperbarui');
    }

    public function recordPayment(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();
        $amount = (float)($body['amount'] ?? 0.0);
        $method = (string)($body['payment_method'] ?? 'cash');
        $hotelBookingId = isset($body['hotel_booking_id']) ? (int)$body['hotel_booking_id'] : null;

        if ($amount <= 0 && $method !== 'hotel_folio') {
            Response::error('Jumlah pembayaran harus lebih dari 0', 422);
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT * FROM banquet_bookings WHERE tenant_id = ? AND id = ? LIMIT 1');
        $stmt->execute([$tenantId, $id]);
        $booking = $stmt->fetch();

        if (!$booking) {
            Response::error('Reservasi banquet tidak ditemukan', 404);
        }

        $db->beginTransaction();
        try {
            if ($method === 'hotel_folio' && $hotelBookingId) {
                // Charge into Hotel Guest Folio
                $stmtFolio = $db->prepare('SELECT id FROM hotel_folios WHERE tenant_id = ? AND booking_id = ? LIMIT 1');
                $stmtFolio->execute([$tenantId, $hotelBookingId]);
                $folio = $stmtFolio->fetch();
                if ($folio) {
                    $folioId = (int)$folio['id'];
                    $chargeAmount = (float)$booking['total_amount'] - (float)$booking['paid_amount'];
                    $desc = 'Banquet Event Charge: ' . $booking['event_name'] . ' (' . $booking['booking_number'] . ')';
                    
                    $db->prepare('INSERT INTO hotel_folio_items (tenant_id, folio_id, item_type, description, amount, is_paid) VALUES (?, ?, "service", ?, ?, 0)')
                       ->execute([$tenantId, $folioId, $desc, $chargeAmount]);

                    $db->prepare('UPDATE hotel_folios SET total_charges = total_charges + ? WHERE tenant_id = ? AND id = ?')
                       ->execute([$chargeAmount, $tenantId, $folioId]);
                }

                $db->prepare('UPDATE banquet_bookings SET hotel_booking_id = ?, payment_status = "folio_charge", paid_amount = total_amount WHERE tenant_id = ? AND id = ?')
                   ->execute([$hotelBookingId, $tenantId, $id]);
            } else {
                $newPaid = (float)$booking['paid_amount'] + $amount;
                $newPaymentStatus = $newPaid >= (float)$booking['total_amount'] ? 'paid' : 'partial';

                $db->prepare('UPDATE banquet_bookings SET paid_amount = ?, payment_status = ? WHERE tenant_id = ? AND id = ?')
                   ->execute([$newPaid, $newPaymentStatus, $tenantId, $id]);
            }

            $db->commit();
            Response::success(['id' => $id], 'Pembayaran banquet berhasil dicatat');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Gagal memproses pembayaran: ' . $e->getMessage(), 400);
        }
    }

    public function timeline(): void {
        $tenantId = TenantContext::id();
        $date = Request::query('date') ?: date('Y-m-d');
        $db = Database::getInstance()->pdo();

        $stmtRooms = $db->prepare('SELECT id, name, code, floor FROM banquet_rooms WHERE tenant_id = ? AND is_active = 1 ORDER BY id ASC');
        $stmtRooms->execute([$tenantId]);
        $rooms = $stmtRooms->fetchAll();

        $stmtBookings = $db->prepare('SELECT b.id, b.banquet_room_id, b.booking_number, b.event_name, b.customer_name, b.layout_type, b.pax_count, b.start_time, b.end_time, b.status 
            FROM banquet_bookings b 
            WHERE b.tenant_id = ? AND DATE(b.start_time) = ? AND b.status != "cancelled" 
            ORDER BY b.start_time ASC');
        $stmtBookings->execute([$tenantId, $date]);
        $bookings = $stmtBookings->fetchAll();

        Response::success([
            'date' => $date,
            'rooms' => $rooms,
            'bookings' => $bookings,
        ]);
    }

    private function hasScheduleConflict(int $tenantId, int $roomId, string $startTime, string $endTime, int $excludeId = 0): bool {
        $db = Database::getInstance()->pdo();
        $sql = 'SELECT id FROM banquet_bookings 
                WHERE tenant_id = ? AND banquet_room_id = ? AND status IN ("draft", "confirmed", "ongoing")
                  AND (? < end_time AND ? > start_time)';
        $params = [$tenantId, $roomId, $startTime, $endTime];

        if ($excludeId > 0) {
            $sql .= ' AND id != ?';
            $params[] = $excludeId;
        }

        $sql .= ' LIMIT 1';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return (bool)$stmt->fetch();
    }
}
