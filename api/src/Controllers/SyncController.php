<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use PDO;
use Exception;

class SyncController {
    public function push(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $deviceId = Request::header('X-Device-Id') ?: ($body['device_id'] ?? 'UNKNOWN');
        $transactions = $body['transactions'] ?? [];

        if (empty($transactions) || !is_array($transactions)) {
            Response::success(['synced' => 0, 'server_time' => date('c')], 'Tidak ada transaksi untuk disinkronkan');
            return;
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $syncedCount = 0;

            foreach ($transactions as $tx) {
                $orderNumber = trim((string)($tx['order_number'] ?? ''));
                if ($orderNumber === '') {
                    continue;
                }

                $existingStmt = $db->prepare('SELECT id, updated_at FROM orders WHERE order_number = ? AND tenant_id = ? FOR UPDATE');
                $existingStmt->execute([$orderNumber, $tenantId]);
                $existing = $existingStmt->fetch();

                $tableId = isset($tx['table_id']) ? (int)$tx['table_id'] : null;
                $orderType = (string)($tx['order_type'] ?? 'Dine-In');
                $status = (string)($tx['status'] ?? 'pending');
                $discountPercent = (int)($tx['discount_percent'] ?? 0);
                $subtotal = (int)($tx['subtotal'] ?? 0);
                $taxAmount = (int)($tx['tax_amount'] ?? 0);
                $total = (int)($tx['total'] ?? 0);
                $waiterName = (string)($tx['waiter_name'] ?? 'Kasir Shift');
                $clientUpdatedAt = (string)($tx['updated_at'] ?? date('Y-m-d H:i:s'));

                if ($existing) {
                    $orderId = (int)$existing['id'];
                    if (strtotime($existing['updated_at']) <= strtotime($clientUpdatedAt)) {
                        $upd = $db->prepare('UPDATE orders SET table_id = ?, order_type = ?, status = ?, discount_percent = ?, subtotal = ?, tax_amount = ?, total = ?, device_id = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?');
                        $upd->execute([$tableId, $orderType, $status, $discountPercent, $subtotal, $taxAmount, $total, $deviceId, $orderId, $tenantId]);
                    }
                } else {
                    $ins = $db->prepare('INSERT INTO orders (tenant_id, order_number, table_id, order_type, waiter_name, status, discount_percent, subtotal, tax_amount, total, device_id, created_at, updated_at) 
                                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
                    $ins->execute([$tenantId, $orderNumber, $tableId, $orderType, $waiterName, $status, $discountPercent, $subtotal, $taxAmount, $total, $deviceId, $clientUpdatedAt]);
                    $orderId = (int)$db->lastInsertId();

                    if (!empty($tx['items']) && is_array($tx['items'])) {
                        $oiStmt = $db->prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, notes, selected_options_json) 
                                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                        foreach ($tx['items'] as $it) {
                            $oiStmt->execute([
                                $orderId,
                                (int)($it['product_id'] ?? 0),
                                (string)($it['product_name'] ?? 'Item'),
                                (int)($it['quantity'] ?? 1),
                                (int)($it['unit_price'] ?? 0),
                                (int)($it['subtotal'] ?? 0),
                                (string)($it['notes'] ?? ''),
                                isset($it['selected_options']) ? json_encode($it['selected_options']) : null,
                            ]);
                        }
                    }
                }

                if (!empty($tx['payment']) && is_array($tx['payment'])) {
                    $pay = $tx['payment'];
                    $chkPay = $db->prepare('SELECT id FROM payments WHERE order_id = ? AND tenant_id = ? LIMIT 1');
                    $chkPay->execute([$orderId, $tenantId]);
                    if (!$chkPay->fetch()) {
                        $pIns = $db->prepare('INSERT INTO payments (tenant_id, order_id, method, total_amount, amount_paid, change_amount, reference_code, device_id) 
                                              VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                        $pIns->execute([
                            $tenantId,
                            $orderId,
                            (string)($pay['method'] ?? 'cash'),
                            (int)($pay['total_amount'] ?? $total),
                            (int)($pay['amount_paid'] ?? $total),
                            (int)($pay['change_amount'] ?? 0),
                            (string)($pay['reference_code'] ?? ''),
                            $deviceId,
                        ]);
                    }
                }

                $syncedCount++;
            }

            $devUpd = $db->prepare('UPDATE devices SET last_synced_at = NOW() WHERE device_id = ? AND tenant_id = ?');
            $devUpd->execute([$deviceId, $tenantId]);

            $logStmt = $db->prepare('INSERT INTO sync_log (tenant_id, device_id, direction, records_pushed, records_pulled, status, synced_at) 
                                     VALUES (?, ?, "push", ?, 0, "success", NOW())');
            $logStmt->execute([$tenantId, $deviceId, $syncedCount]);

            $db->commit();
            Response::success([
                'tenant_id' => $tenantId,
                'synced_records' => $syncedCount,
                'server_time' => date('c'),
            ], 'Sinkronisasi push berhasil');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Gagal melakukan push sync: ' . $e->getMessage(), 500);
        }
    }

    public function pull(): void {
        $tenantId = TenantContext::id();
        $since = Request::query('since', '1970-01-01 00:00:00');
        $deviceId = Request::header('X-Device-Id') ?: Request::query('device_id', 'UNKNOWN');
        $db = Database::getInstance()->pdo();

        $pcStmt = $db->prepare('SELECT * FROM product_categories WHERE tenant_id = ? AND updated_at >= ?');
        $pcStmt->execute([$tenantId, $since]);
        $productCategories = $pcStmt->fetchAll();

        $rcStmt = $db->prepare('SELECT * FROM room_categories WHERE tenant_id = ? AND updated_at >= ?');
        $rcStmt->execute([$tenantId, $since]);
        $roomCategories = $rcStmt->fetchAll();

        $pStmt = $db->prepare('SELECT p.*, pc.name as category_name 
                               FROM products p 
                               JOIN product_categories pc ON p.category_id = pc.id 
                               WHERE p.tenant_id = ? AND p.updated_at >= ?');
        $pStmt->execute([$tenantId, $since]);
        $products = $pStmt->fetchAll();
        foreach ($products as &$p) {
            $p['options'] = !empty($p['options_json']) ? json_decode($p['options_json'], true) : [];
            unset($p['options_json']);
        }

        $tStmt = $db->prepare('SELECT t.*, rc.name as zone 
                               FROM tables t 
                               JOIN room_categories rc ON t.room_category_id = rc.id 
                               WHERE t.tenant_id = ? AND t.updated_at >= ?');
        $tStmt->execute([$tenantId, $since]);
        $tables = $tStmt->fetchAll();

        $oStmt = $db->prepare('SELECT * FROM orders WHERE tenant_id = ? AND updated_at >= ? ORDER BY id DESC LIMIT 200');
        $oStmt->execute([$tenantId, $since]);
        $orders = $oStmt->fetchAll();

        $ktStmt = $db->prepare('SELECT * FROM kitchen_tickets WHERE tenant_id = ? AND updated_at >= ? ORDER BY id DESC LIMIT 100');
        $ktStmt->execute([$tenantId, $since]);
        $kitchenTickets = $ktStmt->fetchAll();

        $totalPulled = count($productCategories) + count($roomCategories) + count($products) + count($tables) + count($orders) + count($kitchenTickets);

        $logStmt = $db->prepare('INSERT INTO sync_log (tenant_id, device_id, direction, records_pushed, records_pulled, status, synced_at) 
                                 VALUES (?, ?, "pull", 0, ?, "success", NOW())');
        $logStmt->execute([$tenantId, $deviceId, $totalPulled]);

        Response::success([
            'tenant_id' => $tenantId,
            'product_categories' => $productCategories,
            'room_categories' => $roomCategories,
            'products' => $products,
            'tables' => $tables,
            'orders' => $orders,
            'kitchen_tickets' => $kitchenTickets,
            'server_time' => date('c'),
            'since_param' => $since,
        ]);
    }
}
