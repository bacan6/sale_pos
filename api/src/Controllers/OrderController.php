<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use PDO;
use Exception;

class OrderController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();
        $status = Request::query('status');
        $tableId = Request::query('table_id');
        $date = Request::query('date');

        $sql = 'SELECT o.*, t.name as table_name, u.full_name as user_full_name 
                FROM orders o 
                LEFT JOIN tables t ON o.table_id = t.id 
                LEFT JOIN users u ON o.user_id = u.id 
                WHERE o.tenant_id = ?';
        $values = [$tenantId];

        if ($status !== null) {
            $sql .= ' AND o.status = ?';
            $values[] = $status;
        }

        if ($tableId !== null) {
            $sql .= ' AND o.table_id = ?';
            $values[] = (int)$tableId;
        }

        if ($date !== null) {
            $sql .= ' AND DATE(o.created_at) = ?';
            $values[] = $date;
        }

        $sql .= ' ORDER BY o.id DESC LIMIT 100';

        $stmt = $db->prepare($sql);
        $stmt->execute($values);
        $orders = $stmt->fetchAll();

        Response::success($orders);
    }

    public function show(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT o.*, t.name as table_name, u.full_name as user_full_name 
                              FROM orders o 
                              LEFT JOIN tables t ON o.table_id = t.id 
                              LEFT JOIN users u ON o.user_id = u.id 
                              WHERE o.id = ? AND o.tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $order = $stmt->fetch();

        if (!$order) {
            Response::error('Pesanan tidak ditemukan', 404);
        }

        $itemsStmt = $db->prepare('SELECT oi.*, p.code as product_code 
                                   FROM order_items oi 
                                   JOIN products p ON oi.product_id = p.id 
                                   WHERE oi.order_id = ?');
        $itemsStmt->execute([$id]);
        $items = $itemsStmt->fetchAll();

        foreach ($items as &$it) {
            $it['selected_options'] = !empty($it['selected_options_json']) ? json_decode($it['selected_options_json'], true) : [];
            unset($it['selected_options_json']);
        }

        $order['items'] = $items;
        Response::success($order);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $orderNumber = trim((string)($body['order_number'] ?? ''));
        $tableId = isset($body['table_id']) && $body['table_id'] !== null ? (int)$body['table_id'] : null;
        $orderType = (string)($body['order_type'] ?? 'Dine-In');
        $userId = isset($body['user_id']) ? (int)$body['user_id'] : null;
        $waiterName = (string)($body['waiter_name'] ?? 'Kasir Shift');
        $discountPercent = (int)($body['discount_percent'] ?? 0);
        $deviceId = Request::header('X-Device-Id') ?: ($body['device_id'] ?? null);
        $items = $body['items'] ?? [];

        if (empty($items) || !is_array($items)) {
            Response::error('Item pesanan tidak boleh kosong', 422);
        }

        if ($orderNumber === '') {
            $orderNumber = 'ORD-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $subtotal = 0;
            $itemsToInsert = [];

            foreach ($items as $item) {
                $productId = (int)($item['product_id'] ?? 0);
                $qty = (int)($item['quantity'] ?? 1);
                $notes = (string)($item['notes'] ?? '');
                $optionsJson = isset($item['selected_options']) ? json_encode($item['selected_options']) : null;

                if ($productId <= 0 || $qty <= 0) {
                    throw new Exception('Data item produk atau jumlah tidak valid');
                }

                $pStmt = $db->prepare('SELECT name, price, stock FROM products WHERE id = ? AND tenant_id = ? FOR UPDATE');
                $pStmt->execute([$productId, $tenantId]);
                $prod = $pStmt->fetch();

                if (!$prod) {
                    throw new Exception("Produk ID {$productId} tidak ditemukan untuk tenant ini");
                }

                $unitPrice = (int)$prod['price'];
                $itemSubtotal = $unitPrice * $qty;
                $subtotal += $itemSubtotal;

                $itemsToInsert[] = [
                    'product_id' => $productId,
                    'product_name' => $prod['name'],
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'subtotal' => $itemSubtotal,
                    'notes' => $notes ?: null,
                    'selected_options_json' => $optionsJson,
                ];

                $stockUpdate = $db->prepare('UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ? AND tenant_id = ?');
                $stockUpdate->execute([$qty, $productId, $tenantId]);
            }

            $discountAmount = (int)(($subtotal * $discountPercent) / 100);
            $taxAmount = (int)(($subtotal - $discountAmount) * 0.10);
            $total = $subtotal - $discountAmount + $taxAmount;

            $initialStatus = 'pending';

            $orderStmt = $db->prepare('INSERT INTO orders (tenant_id, order_number, table_id, order_type, user_id, waiter_name, status, discount_percent, subtotal, tax_amount, total, device_id) 
                                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $orderStmt->execute([
                $tenantId,
                $orderNumber,
                $tableId,
                $orderType,
                $userId,
                $waiterName,
                $initialStatus,
                $discountPercent,
                $subtotal,
                $taxAmount,
                $total,
                $deviceId,
            ]);
            $orderId = (int)$db->lastInsertId();

            $oiStmt = $db->prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, notes, selected_options_json) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            foreach ($itemsToInsert as $it) {
                $oiStmt->execute([
                    $orderId,
                    $it['product_id'],
                    $it['product_name'],
                    $it['quantity'],
                    $it['unit_price'],
                    $it['subtotal'],
                    $it['notes'],
                    $it['selected_options_json'],
                ]);
            }

            if ($tableId !== null && $orderType === 'Dine-In') {
                $tUpdate = $db->prepare('UPDATE tables SET status = "occupied", active_order_number = ?, active_order_total = ? WHERE id = ? AND tenant_id = ?');
                $tUpdate->execute([$orderNumber, $total, $tableId, $tenantId]);
            }

            $db->commit();

            Response::success([
                'id' => $orderId,
                'order_number' => $orderNumber,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total' => $total,
            ], 'Pesanan berhasil dibuat', 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }

    public function updateStatus(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();
        $newStatus = (string)($body['status'] ?? '');

        $validStatuses = ['pending', 'kitchen', 'billing', 'paid', 'cancelled'];
        if (!in_array($newStatus, $validStatuses, true)) {
            Response::error('Status pesanan tidak valid', 422);
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare('SELECT id, table_id, order_number FROM orders WHERE id = ? AND tenant_id = ? FOR UPDATE');
            $stmt->execute([$id, $tenantId]);
            $order = $stmt->fetch();

            if (!$order) {
                throw new Exception('Pesanan tidak ditemukan');
            }

            $upd = $db->prepare('UPDATE orders SET status = ? WHERE id = ? AND tenant_id = ?');
            $upd->execute([$newStatus, $id, $tenantId]);

            if ($order['table_id']) {
                if ($newStatus === 'billing') {
                    $db->prepare('UPDATE tables SET status = "billing" WHERE id = ? AND tenant_id = ?')->execute([$order['table_id'], $tenantId]);
                } elseif ($newStatus === 'paid' || $newStatus === 'cancelled') {
                    $db->prepare('UPDATE tables SET status = "available", active_order_number = NULL, active_order_total = 0 WHERE id = ? AND tenant_id = ?')->execute([$order['table_id'], $tenantId]);
                }
            }

            $db->commit();
            Response::success(['id' => $id, 'status' => $newStatus], 'Status pesanan berhasil diperbarui');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }
}
