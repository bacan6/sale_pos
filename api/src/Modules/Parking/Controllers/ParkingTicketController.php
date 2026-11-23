<?php
declare(strict_types=1);

namespace App\Modules\Parking\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class ParkingTicketController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $status = Request::query('status');
        $plate = Request::query('plate');
        $date = Request::query('date');

        $sql = 'SELECT t.*, gin.gate_name as entry_gate_name, gout.gate_name as exit_gate_name 
                FROM parking_tickets t 
                LEFT JOIN parking_gates gin ON t.entry_gate_id = gin.id 
                LEFT JOIN parking_gates gout ON t.exit_gate_id = gout.id 
                WHERE t.tenant_id = ?';
        $params = [$tenantId];

        if ($status) {
            $sql .= ' AND t.status = ?';
            $params[] = $status;
        }
        if ($plate) {
            $sql .= ' AND t.plate_number LIKE ?';
            $params[] = '%' . $plate . '%';
        }
        if ($date) {
            $sql .= ' AND DATE(t.entry_time) = ?';
            $params[] = $date;
        }

        $sql .= ' ORDER BY t.id DESC LIMIT 100';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        Response::success($stmt->fetchAll());
    }

    public function show(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT t.*, gin.gate_name as entry_gate_name, gout.gate_name as exit_gate_name 
            FROM parking_tickets t 
            LEFT JOIN parking_gates gin ON t.entry_gate_id = gin.id 
            LEFT JOIN parking_gates gout ON t.exit_gate_id = gout.id 
            WHERE t.tenant_id = ? AND (t.id = ? OR t.barcode_code = ?) LIMIT 1');
        $stmt->execute([$tenantId, $id, (string)$id]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            Response::error('Tiket parkir tidak ditemukan', 404);
        }

        if ($ticket['status'] === 'parked') {
            $calc = $this->calculateFee($tenantId, (string)$ticket['vehicle_type'], (string)$ticket['entry_time']);
            $ticket['current_duration_minutes'] = $calc['duration_minutes'];
            $ticket['current_estimated_fee'] = $calc['fee'];
        }

        Response::success($ticket);
    }

    public function checkIn(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $plate = strtoupper(trim((string)($body['plate_number'] ?? '')));
        $vehicleType = (string)($body['vehicle_type'] ?? 'car');
        $entryGateId = (int)($body['entry_gate_id'] ?? 1);

        if ($plate === '') {
            Response::error('Nomor plat kendaraan wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();

        $chk = $db->prepare('SELECT id FROM parking_tickets WHERE tenant_id = ? AND plate_number = ? AND status = "parked" LIMIT 1');
        $chk->execute([$tenantId, $plate]);
        if ($chk->fetch()) {
            Response::error('Kendaraan dengan plat ini masih berada di dalam area parkir', 409);
        }

        $ticketNumber = 'TCK-' . date('YmdHi') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
        $barcodeCode = 'PRK' . time() . rand(100, 999);
        $entryTime = date('Y-m-d H:i:s');

        $stmt = $db->prepare('INSERT INTO parking_tickets (tenant_id, ticket_number, barcode_code, vehicle_type, plate_number, entry_time, entry_gate_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, "parked")');
        $stmt->execute([$tenantId, $ticketNumber, $barcodeCode, $vehicleType, $plate, $entryTime, $entryGateId]);
        $ticketId = (int)$db->lastInsertId();

        Response::success([
            'id' => $ticketId,
            'ticket_number' => $ticketNumber,
            'barcode_code' => $barcodeCode,
            'plate_number' => $plate,
            'vehicle_type' => $vehicleType,
            'entry_time' => $entryTime,
        ], 'Tiket masuk kendaraan berhasil dicetak', 201);
    }

    public function checkOut(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();

        $paymentMethod = (string)($body['payment_method'] ?? 'cash');
        $exitGateId = isset($body['exit_gate_id']) ? (int)$body['exit_gate_id'] : null;
        $hotelBookingId = isset($body['hotel_booking_id']) ? (int)$body['hotel_booking_id'] : null;
        $banquetBookingId = isset($body['banquet_booking_id']) ? (int)$body['banquet_booking_id'] : null;

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT * FROM parking_tickets WHERE tenant_id = ? AND (id = ? OR barcode_code = ?) LIMIT 1');
        $stmt->execute([$tenantId, $id, (string)$id]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            Response::error('Tiket parkir tidak ditemukan', 404);
        }

        if ($ticket['status'] === 'exited') {
            Response::error('Tiket parkir ini sudah selesai dan kendaraan telah keluar', 400);
        }

        $calc = $this->calculateFee($tenantId, (string)$ticket['vehicle_type'], (string)$ticket['entry_time']);
        $fee = $calc['fee'];
        $paidAmount = $fee;

        if ($paymentMethod === 'hotel_complimentary' || $paymentMethod === 'banquet_pass') {
            $paidAmount = 0.0;
        }

        $exitTime = date('Y-m-d H:i:s');
        $status = 'exited';

        $stmtUp = $db->prepare('UPDATE parking_tickets SET 
            exit_time = ?, exit_gate_id = ?, duration_minutes = ?, parking_fee = ?, paid_amount = ?, payment_method = ?, 
            hotel_booking_id = ?, banquet_booking_id = ?, status = ?
            WHERE tenant_id = ? AND id = ?');
        $stmtUp->execute([
            $exitTime, $exitGateId, $calc['duration_minutes'], $fee, $paidAmount, $paymentMethod,
            $hotelBookingId, $banquetBookingId, $status, $tenantId, $ticket['id']
        ]);

        Response::success([
            'id' => $ticket['id'],
            'ticket_number' => $ticket['ticket_number'],
            'plate_number' => $ticket['plate_number'],
            'duration_minutes' => $calc['duration_minutes'],
            'parking_fee' => $fee,
            'paid_amount' => $paidAmount,
            'payment_method' => $paymentMethod,
            'status' => $status,
            'exit_time' => $exitTime,
        ], 'Pembayaran parkir berhasil & palang keluar terbuka');
    }

    private function calculateFee(int $tenantId, string $vehicleType, string $entryTime): array {
        $db = Database::getInstance()->pdo();
        $stmtRate = $db->prepare('SELECT * FROM parking_rates WHERE tenant_id = ? AND vehicle_type = ? AND is_active = 1 LIMIT 1');
        $stmtRate->execute([$tenantId, $vehicleType]);
        $rate = $stmtRate->fetch();

        $baseRate = $rate ? (float)$rate['base_rate'] : 3000.0;
        $hourlyRate = $rate ? (float)$rate['hourly_rate'] : 2000.0;
        $dailyMax = $rate ? (float)$rate['daily_max_rate'] : 50000.0;
        $graceMinutes = $rate ? (int)$rate['grace_period_minutes'] : 10;

        $entryTs = strtotime($entryTime);
        $nowTs = time();
        $durationMinutes = max(1, (int)ceil(($nowTs - $entryTs) / 60));

        if ($durationMinutes <= $graceMinutes) {
            return ['duration_minutes' => $durationMinutes, 'fee' => 0.0];
        }

        $billableHours = (int)ceil($durationMinutes / 60);
        $fee = $baseRate;
        if ($billableHours > 1) {
            $fee += ($billableHours - 1) * $hourlyRate;
        }

        if ($fee > $dailyMax && $dailyMax > 0) {
            $fee = $dailyMax;
        }

        return [
            'duration_minutes' => $durationMinutes,
            'fee' => $fee,
        ];
    }
}
