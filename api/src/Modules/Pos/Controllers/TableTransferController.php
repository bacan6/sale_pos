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

class TableTransferController {
    public function move(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $fromTableId = (int)($body['from_table_id'] ?? 0);
        $toTableId = (int)($body['to_table_id'] ?? 0);
        $notes = trim((string)($body['notes'] ?? 'Pindah Meja'));

        if ($fromTableId <= 0 || $toTableId <= 0) {
            Response::error('Meja asal dan meja tujuan wajib dipilih', 422);
            return;
        }

        if ($fromTableId === $toTableId) {
            Response::error('Meja asal dan meja tujuan tidak boleh sama', 422);
            return;
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $stmtFrom = $db->prepare('SELECT * FROM tables WHERE id = ? AND tenant_id = ? FOR UPDATE');
            $stmtFrom->execute([$fromTableId, $tenantId]);
            $fromTable = $stmtFrom->fetch();

            if (!$fromTable) {
                throw new Exception('Meja asal tidak ditemukan');
            }

            if ($fromTable['status'] === 'available' || empty($fromTable['active_order_number'])) {
                throw new Exception('Meja asal sedang kosong / tidak ada pesanan aktif');
            }

            $stmtTo = $db->prepare('SELECT * FROM tables WHERE id = ? AND tenant_id = ? FOR UPDATE');
            $stmtTo->execute([$toTableId, $tenantId]);
            $toTable = $stmtTo->fetch();

            if (!$toTable) {
                throw new Exception('Meja tujuan tidak ditemukan');
            }

            if ($toTable['status'] !== 'available') {
                throw new Exception("Meja tujuan ({$toTable['name']}) sedang terisi atau tidak tersedia");
            }

            // Find active order
            $ordStmt = $db->prepare('SELECT id, order_number FROM orders WHERE order_number = ? AND tenant_id = ? FOR UPDATE');
            $ordStmt->execute([$fromTable['active_order_number'], $tenantId]);
            $order = $ordStmt->fetch();

            if (!$order) {
                throw new Exception('Pesanan aktif untuk meja asal tidak ditemukan');
            }

            $orderId = (int)$order['id'];

            // 1. Update order table_id
            $db->prepare('UPDATE orders SET table_id = ? WHERE id = ? AND tenant_id = ?')
               ->execute([$toTableId, $orderId, $tenantId]);

            // 2. Set to_table as occupied
            $db->prepare('UPDATE tables SET status = "occupied", active_order_number = ?, active_order_total = ?, guest_count = ? WHERE id = ? AND tenant_id = ?')
               ->execute([$fromTable['active_order_number'], $fromTable['active_order_total'], $fromTable['guest_count'], $toTableId, $tenantId]);

            // 3. Clear from_table
            $db->prepare('UPDATE tables SET status = "available", active_order_number = NULL, active_order_total = 0, guest_count = 0 WHERE id = ? AND tenant_id = ?')
               ->execute([$fromTableId, $tenantId]);

            // 4. Log transfer
            $userId = AuthContext::id() ?: null;
            $logStmt = $db->prepare('INSERT INTO pos_table_transfers (tenant_id, from_table_id, to_table_id, order_id, action_type, transferred_by_user_id, notes) 
                                     VALUES (?, ?, ?, ?, "move", ?, ?)');
            $logStmt->execute([$tenantId, $fromTableId, $toTableId, $orderId, $userId, $notes]);

            $db->commit();
            Response::success([
                'order_number' => $fromTable['active_order_number'],
                'from_table_name' => $fromTable['name'],
                'to_table_name' => $toTable['name'],
            ], "Berhasil memindahkan pesanan dari {$fromTable['name']} ke {$toTable['name']}");
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }

    public function merge(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $fromTableId = (int)($body['from_table_id'] ?? 0);
        $toTableId = (int)($body['to_table_id'] ?? 0);
        $notes = trim((string)($body['notes'] ?? 'Gabung Meja'));

        if ($fromTableId <= 0 || $toTableId <= 0 || $fromTableId === $toTableId) {
            Response::error('Meja asal dan meja tujuan tidak valid', 422);
            return;
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $stmtFrom = $db->prepare('SELECT * FROM tables WHERE id = ? AND tenant_id = ? FOR UPDATE');
            $stmtFrom->execute([$fromTableId, $tenantId]);
            $fromTable = $stmtFrom->fetch();

            $stmtTo = $db->prepare('SELECT * FROM tables WHERE id = ? AND tenant_id = ? FOR UPDATE');
            $stmtTo->execute([$toTableId, $tenantId]);
            $toTable = $stmtTo->fetch();

            if (!$fromTable || !$toTable) {
                throw new Exception('Meja tidak ditemukan');
            }

            if (empty($fromTable['active_order_number']) || empty($toTable['active_order_number'])) {
                throw new Exception('Kedua meja harus memiliki pesanan aktif untuk digabungkan');
            }

            // Get both orders
            $o1Stmt = $db->prepare('SELECT * FROM orders WHERE order_number = ? AND tenant_id = ? FOR UPDATE');
            $o1Stmt->execute([$fromTable['active_order_number'], $tenantId]);
            $fromOrder = $o1Stmt->fetch();

            $o2Stmt = $db->prepare('SELECT * FROM orders WHERE order_number = ? AND tenant_id = ? FOR UPDATE');
            $o2Stmt->execute([$toTable['active_order_number'], $tenantId]);
            $toOrder = $o2Stmt->fetch();

            if (!$fromOrder || !$toOrder) {
                throw new Exception('Data pesanan tidak valid');
            }

            $fromOrderId = (int)$fromOrder['id'];
            $toOrderId = (int)$toOrder['id'];

            // 1. Move order_items from fromOrder to toOrder
            $db->prepare('UPDATE order_items SET order_id = ? WHERE order_id = ?')
               ->execute([$toOrderId, $fromOrderId]);

            // 2. Recalculate toOrder total
            $sumStmt = $db->prepare('SELECT SUM(subtotal) as new_subtotal FROM order_items WHERE order_id = ?');
            $sumStmt->execute([$toOrderId]);
            $sumRes = $sumStmt->fetch();
            $newSubtotal = (int)($sumRes['new_subtotal'] ?? 0);
            $newTax = (int)round($newSubtotal * 0.1); // 10% tax standard
            $newTotal = $newSubtotal + $newTax;

            $db->prepare('UPDATE orders SET subtotal = ?, tax_amount = ?, total = ? WHERE id = ? AND tenant_id = ?')
               ->execute([$newSubtotal, $newTax, $newTotal, $toOrderId, $tenantId]);

            // 3. Mark fromOrder as cancelled/merged
            $db->prepare('UPDATE orders SET status = "cancelled" WHERE id = ? AND tenant_id = ?')
               ->execute([$fromOrderId, $tenantId]);

            // 4. Update tables
            $combinedGuests = (int)$fromTable['guest_count'] + (int)$toTable['guest_count'];
            $db->prepare('UPDATE tables SET active_order_total = ?, guest_count = ? WHERE id = ? AND tenant_id = ?')
               ->execute([$newTotal, $combinedGuests, $toTableId, $tenantId]);

            $db->prepare('UPDATE tables SET status = "available", active_order_number = NULL, active_order_total = 0, guest_count = 0 WHERE id = ? AND tenant_id = ?')
               ->execute([$fromTableId, $tenantId]);

            // 5. Audit Log
            $userId = AuthContext::id() ?: null;
            $logStmt = $db->prepare('INSERT INTO pos_table_transfers (tenant_id, from_table_id, to_table_id, order_id, action_type, transferred_by_user_id, notes) 
                                     VALUES (?, ?, ?, ?, "merge", ?, ?)');
            $logStmt->execute([$tenantId, $fromTableId, $toTableId, $toOrderId, $userId, "Digabungkan dari {$fromOrder['order_number']}: {$notes}"]);

            $db->commit();
            Response::success([
                'target_table_name' => $toTable['name'],
                'target_order_number' => $toOrder['order_number'],
                'new_total' => $newTotal,
            ], "Berhasil menggabungkan meja {$fromTable['name']} ke meja {$toTable['name']}");
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }
}
