<?php
declare(strict_types=1);

namespace App\Modules\Pos\Controllers;

use App\Core\AuthContext;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use PDO;
use Exception;

class ShiftController {
    public function current(): void {
        $tenantId = TenantContext::id();
        $userId = AuthContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT s.*, u.full_name as user_name 
                              FROM pos_shifts s 
                              JOIN users u ON s.user_id = u.id 
                              WHERE s.tenant_id = ? AND s.status = "open" 
                              ORDER BY s.id DESC LIMIT 1');
        $stmt->execute([$tenantId]);
        $shift = $stmt->fetch();

        if (!$shift) {
            Response::success([
                'has_active_shift' => false,
                'shift' => null,
            ]);
            return;
        }

        $shiftId = (int)$shift['id'];

        // Live calculation of sales and movements
        $cashSalesStmt = $db->prepare('SELECT COALESCE(SUM(amount_paid - change_amount), 0) as cash_total 
                                       FROM payments 
                                       WHERE tenant_id = ? AND method = "cash" AND (shift_id = ? OR paid_at >= ?)');
        $cashSalesStmt->execute([$tenantId, $shiftId, $shift['opened_at']]);
        $liveCashSales = (int)$cashSalesStmt->fetch()['cash_total'];

        $nonCashSalesStmt = $db->prepare('SELECT COALESCE(SUM(amount_paid), 0) as non_cash_total 
                                          FROM payments 
                                          WHERE tenant_id = ? AND method != "cash" AND (shift_id = ? OR paid_at >= ?)');
        $nonCashSalesStmt->execute([$tenantId, $shiftId, $shift['opened_at']]);
        $liveNonCashSales = (int)$nonCashSalesStmt->fetch()['non_cash_total'];

        $movStmt = $db->prepare('SELECT 
                                    COALESCE(SUM(CASE WHEN type = "cash_in" THEN amount ELSE 0 END), 0) as total_in,
                                    COALESCE(SUM(CASE WHEN type = "cash_out" THEN amount ELSE 0 END), 0) as total_out
                                 FROM pos_shift_movements 
                                 WHERE shift_id = ? AND tenant_id = ?');
        $movStmt->execute([$shiftId, $tenantId]);
        $movs = $movStmt->fetch();
        $totalIn = (int)($movs['total_in'] ?? 0);
        $totalOut = (int)($movs['total_out'] ?? 0);

        $openingCash = (int)$shift['opening_cash'];
        $expectedDrawer = $openingCash + $liveCashSales + $totalIn - $totalOut;

        // Fetch recent movements
        $mListStmt = $db->prepare('SELECT sm.*, u.full_name as user_name 
                                   FROM pos_shift_movements sm 
                                   JOIN users u ON sm.user_id = u.id 
                                   WHERE sm.shift_id = ? AND sm.tenant_id = ? 
                                   ORDER BY sm.id DESC LIMIT 15');
        $mListStmt->execute([$shiftId, $tenantId]);
        $recentMovements = $mListStmt->fetchAll();

        Response::success([
            'has_active_shift' => true,
            'shift' => [
                'id' => $shiftId,
                'user_name' => $shift['user_name'],
                'opened_at' => $shift['opened_at'],
                'opening_cash' => $openingCash,
                'live_cash_sales' => $liveCashSales,
                'live_non_cash_sales' => $liveNonCashSales,
                'total_cash_in' => $totalIn,
                'total_cash_out' => $totalOut,
                'expected_cash_drawer' => $expectedDrawer,
                'movements' => $recentMovements,
            ],
        ]);
    }

    public function open(): void {
        $tenantId = TenantContext::id();
        $userId = AuthContext::id();
        $body = Request::body();
        $openingCash = (int)($body['opening_cash'] ?? 0);
        $deviceId = Request::header('X-Device-Id') ?: ($body['device_id'] ?? null);
        $notes = trim((string)($body['notes'] ?? ''));

        $db = Database::getInstance()->pdo();

        // Check if there is already an open shift for this tenant
        $chk = $db->prepare('SELECT id FROM pos_shifts WHERE tenant_id = ? AND status = "open" LIMIT 1');
        $chk->execute([$tenantId]);
        if ($chk->fetch()) {
            Response::error('Shift kasir saat ini masih berstatus terbuka. Harap tutup shift sebelumnya terlebih dahulu.', 400);
            return;
        }

        $stmt = $db->prepare('INSERT INTO pos_shifts (tenant_id, user_id, device_id, opening_cash, status, notes) 
                              VALUES (?, ?, ?, ?, "open", ?)');
        $stmt->execute([$tenantId, $userId, $deviceId, $openingCash, $notes]);
        $shiftId = (int)$db->lastInsertId();

        Response::success([
            'shift_id' => $shiftId,
            'opening_cash' => $openingCash,
            'opened_at' => date('Y-m-d H:i:s'),
        ], 'Shift kasir berhasil dibuka', 201);
    }

    public function cashMovement(): void {
        $tenantId = TenantContext::id();
        $userId = AuthContext::id();
        $body = Request::body();
        $shiftId = (int)($body['shift_id'] ?? 0);
        $type = (string)($body['type'] ?? 'cash_in');
        $amount = (int)($body['amount'] ?? 0);
        $reason = trim((string)($body['reason'] ?? ''));

        if (!in_array($type, ['cash_in', 'cash_out'], true)) {
            Response::error('Tipe mutasi kas harus cash_in atau cash_out', 422);
            return;
        }

        if ($amount <= 0 || $reason === '') {
            Response::error('Nominal dan alasan mutasi kas wajib diisi', 422);
            return;
        }

        $db = Database::getInstance()->pdo();

        if ($shiftId <= 0) {
            $cur = $db->prepare('SELECT id FROM pos_shifts WHERE tenant_id = ? AND status = "open" ORDER BY id DESC LIMIT 1');
            $cur->execute([$tenantId]);
            $s = $cur->fetch();
            if (!$s) {
                Response::error('Tidak ada shift aktif yang terbuka', 400);
                return;
            }
            $shiftId = (int)$s['id'];
        }

        $stmt = $db->prepare('INSERT INTO pos_shift_movements (tenant_id, shift_id, user_id, type, amount, reason) 
                              VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$tenantId, $shiftId, $userId, $type, $amount, $reason]);

        Response::success([
            'shift_id' => $shiftId,
            'type' => $type,
            'amount' => $amount,
            'reason' => $reason,
        ], 'Mutasi kas laci berhasil dicatat');
    }

    public function close(): void {
        $tenantId = TenantContext::id();
        $userId = AuthContext::id();
        $body = Request::body();
        $shiftId = (int)($body['shift_id'] ?? 0);
        $closingCashActual = (int)($body['closing_cash_actual'] ?? 0);
        $notes = trim((string)($body['notes'] ?? ''));

        $db = Database::getInstance()->pdo();

        if ($shiftId <= 0) {
            $cur = $db->prepare('SELECT id FROM pos_shifts WHERE tenant_id = ? AND status = "open" ORDER BY id DESC LIMIT 1');
            $cur->execute([$tenantId]);
            $s = $cur->fetch();
            if (!$s) {
                Response::error('Tidak ada shift kasir terbuka untuk ditutup', 400);
                return;
            }
            $shiftId = (int)$s['id'];
        }

        $sStmt = $db->prepare('SELECT * FROM pos_shifts WHERE id = ? AND tenant_id = ? FOR UPDATE');
        $sStmt->execute([$shiftId, $tenantId]);
        $shift = $sStmt->fetch();

        if (!$shift || $shift['status'] === 'closed') {
            Response::error('Shift tidak ditemukan atau sudah ditutup', 400);
            return;
        }

        // Aggregate shift metrics
        $cashSalesStmt = $db->prepare('SELECT COALESCE(SUM(amount_paid - change_amount), 0) as cash_total 
                                       FROM payments 
                                       WHERE tenant_id = ? AND method = "cash" AND (shift_id = ? OR paid_at >= ?)');
        $cashSalesStmt->execute([$tenantId, $shiftId, $shift['opened_at']]);
        $totalCashSales = (int)$cashSalesStmt->fetch()['cash_total'];

        $nonCashSalesStmt = $db->prepare('SELECT COALESCE(SUM(amount_paid), 0) as non_cash_total 
                                          FROM payments 
                                          WHERE tenant_id = ? AND method != "cash" AND (shift_id = ? OR paid_at >= ?)');
        $nonCashSalesStmt->execute([$tenantId, $shiftId, $shift['opened_at']]);
        $totalNonCashSales = (int)$nonCashSalesStmt->fetch()['non_cash_total'];

        $movStmt = $db->prepare('SELECT 
                                    COALESCE(SUM(CASE WHEN type = "cash_in" THEN amount ELSE 0 END), 0) as total_in,
                                    COALESCE(SUM(CASE WHEN type = "cash_out" THEN amount ELSE 0 END), 0) as total_out
                                 FROM pos_shift_movements 
                                 WHERE shift_id = ? AND tenant_id = ?');
        $movStmt->execute([$shiftId, $tenantId]);
        $movs = $movStmt->fetch();
        $totalIn = (int)($movs['total_in'] ?? 0);
        $totalOut = (int)($movs['total_out'] ?? 0);

        $openingCash = (int)$shift['opening_cash'];
        $expectedCash = $openingCash + $totalCashSales + $totalIn - $totalOut;
        $discrepancy = $closingCashActual - $expectedCash;

        $closedAt = date('Y-m-d H:i:s');
        $upd = $db->prepare('UPDATE pos_shifts 
                             SET closed_at = ?, closing_cash_system = ?, closing_cash_actual = ?, cash_discrepancy = ?, 
                                 total_cash_sales = ?, total_non_cash_sales = ?, total_cash_in = ?, total_cash_out = ?, 
                                 status = "closed", notes = ? 
                             WHERE id = ? AND tenant_id = ?');
        $upd->execute([
            $closedAt,
            $expectedCash,
            $closingCashActual,
            $discrepancy,
            $totalCashSales,
            $totalNonCashSales,
            $totalIn,
            $totalOut,
            $notes,
            $shiftId,
            $tenantId,
        ]);

        Response::success([
            'shift_id' => $shiftId,
            'opened_at' => $shift['opened_at'],
            'closed_at' => $closedAt,
            'opening_cash' => $openingCash,
            'total_cash_sales' => $totalCashSales,
            'total_non_cash_sales' => $totalNonCashSales,
            'total_cash_in' => $totalIn,
            'total_cash_out' => $totalOut,
            'expected_cash' => $expectedCash,
            'closing_cash_actual' => $closingCashActual,
            'discrepancy' => $discrepancy,
        ], 'Shift kasir berhasil ditutup dan direkonsiliasi');
    }

    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT s.*, u.full_name as user_name 
                              FROM pos_shifts s 
                              JOIN users u ON s.user_id = u.id 
                              WHERE s.tenant_id = ? 
                              ORDER BY s.id DESC LIMIT 50');
        $stmt->execute([$tenantId]);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['opening_cash'] = (int)$r['opening_cash'];
            $r['closing_cash_system'] = (int)$r['closing_cash_system'];
            $r['closing_cash_actual'] = (int)$r['closing_cash_actual'];
            $r['cash_discrepancy'] = (int)$r['cash_discrepancy'];
            $r['total_cash_sales'] = (int)$r['total_cash_sales'];
            $r['total_non_cash_sales'] = (int)$r['total_non_cash_sales'];
            $r['total_cash_in'] = (int)$r['total_cash_in'];
            $r['total_cash_out'] = (int)$r['total_cash_out'];
        }

        Response::success($rows);
    }
}
