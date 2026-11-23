<?php
declare(strict_types=1);

namespace App\Modules\Hotel\Controllers;

use App\Core\AuthContext;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class HotelShiftHandoverController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT hsh.*, u.full_name as receptionist_name 
                              FROM hotel_shift_handovers hsh 
                              JOIN users u ON hsh.user_id = u.id 
                              WHERE hsh.tenant_id = ? 
                              ORDER BY hsh.id DESC LIMIT 30');
        $stmt->execute([$tenantId]);
        $shifts = $stmt->fetchAll();

        Response::success($shifts);
    }

    public function currentSummary(): void {
        $tenantId = TenantContext::id();
        $today = date('Y-m-d');
        $db = Database::getInstance()->pdo();

        // 1. Pending arrivals (reserved bookings checking in today or overdue)
        $arrStmt = $db->prepare('SELECT COUNT(*) FROM hotel_bookings WHERE tenant_id = ? AND status = "reserved" AND check_in_date <= ?');
        $arrStmt->execute([$tenantId, $today]);
        $pendingArrivals = (int)$arrStmt->fetchColumn();

        // 2. Pending departures (checked-in bookings checking out today)
        $depStmt = $db->prepare('SELECT COUNT(*) FROM hotel_bookings WHERE tenant_id = ? AND status = "checked_in" AND check_out_date <= ?');
        $depStmt->execute([$tenantId, $today]);
        $pendingDepartures = (int)$depStmt->fetchColumn();

        // 3. Payments collected today across hotel folios
        $payStmt = $db->prepare('SELECT COALESCE(SUM(ABS(amount)), 0) FROM hotel_folio_items WHERE tenant_id = ? AND category = "payment" AND DATE(created_at) = ?');
        $payStmt->execute([$tenantId, $today]);
        $paymentsCollected = (int)$payStmt->fetchColumn();

        // 4. Check active open shift for today
        $openStmt = $db->prepare('SELECT * FROM hotel_shift_handovers WHERE tenant_id = ? AND status = "open" ORDER BY id DESC LIMIT 1');
        $openStmt->execute([$tenantId]);
        $activeShift = $openStmt->fetch();

        Response::success([
            'date' => $today,
            'pending_arrivals' => $pendingArrivals,
            'pending_departures' => $pendingDepartures,
            'payments_collected_today' => $paymentsCollected,
            'active_shift' => $activeShift ?: null,
        ]);
    }

    public function openShift(): void {
        $tenantId = TenantContext::id();
        $userId = AuthContext::id() ?: 1;
        $body = Request::body();

        $shiftDate = trim((string)($body['shift_date'] ?? date('Y-m-d')));
        $shiftType = (string)($body['shift_type'] ?? 'morning');
        $cashOpening = max(0, (int)($body['cash_opening'] ?? 0));
        $notes = trim((string)($body['handover_notes'] ?? ''));

        $valid = ['morning', 'evening', 'night'];
        if (!in_array($shiftType, $valid, true)) {
            $shiftType = 'morning';
        }

        $db = Database::getInstance()->pdo();

        // Count pending arrivals & departures for snapshot
        $arrStmt = $db->prepare('SELECT COUNT(*) FROM hotel_bookings WHERE tenant_id = ? AND status = "reserved" AND check_in_date <= ?');
        $arrStmt->execute([$tenantId, $shiftDate]);
        $pendingArrivals = (int)$arrStmt->fetchColumn();

        $depStmt = $db->prepare('SELECT COUNT(*) FROM hotel_bookings WHERE tenant_id = ? AND status = "checked_in" AND check_out_date <= ?');
        $depStmt->execute([$tenantId, $shiftDate]);
        $pendingDepartures = (int)$depStmt->fetchColumn();

        $stmt = $db->prepare('INSERT INTO hotel_shift_handovers 
                              (tenant_id, shift_date, shift_type, user_id, cash_opening, cash_closing, cash_collected, pending_checkouts, pending_checkins, handover_notes, status) 
                              VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, "open")');
        $stmt->execute([$tenantId, $shiftDate, $shiftType, $userId, $cashOpening, $pendingDepartures, $pendingArrivals, $notes ?: null]);

        $id = (int)$db->lastInsertId();
        Response::success(['id' => $id], 'Shift Front Desk berhasil dibuka', 201);
    }

    public function closeShift(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();

        $cashClosing = max(0, (int)($body['cash_closing'] ?? 0));
        $cashCollected = max(0, (int)($body['cash_collected'] ?? 0));
        $notes = trim((string)($body['handover_notes'] ?? ''));

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE hotel_shift_handovers 
                              SET cash_closing = ?, cash_collected = ?, handover_notes = ?, status = "submitted" 
                              WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$cashClosing, $cashCollected, $notes ?: null, $id, $tenantId]);

        Response::success(null, 'Shift Front Desk berhasil ditutup dan diserahkan');
    }
}
