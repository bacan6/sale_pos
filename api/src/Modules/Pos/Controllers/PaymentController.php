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

class PaymentController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT p.*, o.order_number, u.full_name as cashier_name 
                              FROM payments p 
                              JOIN orders o ON p.order_id = o.id 
                              LEFT JOIN users u ON p.user_id = u.id 
                              WHERE p.tenant_id = ? 
                              ORDER BY p.id DESC LIMIT 100');
        $stmt->execute([$tenantId]);
        $rows = $stmt->fetchAll();
        Response::success($rows);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $orderId = (int)($body['order_id'] ?? 0);
        $method = (string)($body['method'] ?? 'cash');
        $amountPaid = (int)($body['amount_paid'] ?? 0);
        $referenceCode = trim((string)($body['reference_code'] ?? ''));
        $userId = isset($body['user_id']) ? (int)$body['user_id'] : (AuthContext::id() ?: null);
        $deviceId = Request::header('X-Device-Id') ?: ($body['device_id'] ?? null);
        $shiftId = isset($body['shift_id']) ? (int)$body['shift_id'] : null;

        if ($orderId <= 0) {
            Response::error('ID pesanan wajib diisi', 422);
        }

        $validMethods = ['cash', 'qris', 'card', 'room_charge'];
        if (!in_array($method, $validMethods, true)) {
            Response::error('Metode pembayaran tidak valid', 422);
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare('SELECT id, order_number, total, status, table_id FROM orders WHERE id = ? AND tenant_id = ? FOR UPDATE');
            $stmt->execute([$orderId, $tenantId]);
            $order = $stmt->fetch();

            if (!$order) {
                throw new Exception('Pesanan tidak ditemukan untuk tenant ini');
            }

            if ($order['status'] === 'paid') {
                throw new Exception('Pesanan sudah dibayar');
            }

            $total = (int)$order['total'];
            if ($amountPaid < $total && $method === 'cash') {
                throw new Exception('Jumlah uang yang dibayarkan kurang dari total tagihan');
            }

            $change = $method === 'cash' ? max(0, $amountPaid - $total) : 0;
            if ($method === 'room_charge') {
                $amountPaid = $total;
            }

            // Cross-module posting: Charge to Hotel Room Folio
            if ($method === 'room_charge') {
                if (!TenantContext::hasModule('hotel')) {
                    throw new Exception('Modul Hotel tidak aktif untuk tenant ini. Tagihan kamar tidak dapat diproses.');
                }

                $roomNumber = trim((string)($body['room_number'] ?? ''));
                if ($roomNumber === '') {
                    throw new Exception('Nomor kamar hotel wajib disertakan untuk metode Charge to Room');
                }

                $rStmt = $db->prepare('SELECT hr.id as room_id, hr.room_number, hr.active_booking_id, hf.id as folio_id, hf.total_charges, hf.balance 
                                       FROM hotel_rooms hr 
                                       JOIN hotel_bookings hb ON hr.active_booking_id = hb.id 
                                       JOIN hotel_folios hf ON hb.id = hf.booking_id 
                                       WHERE hr.room_number = ? AND hr.tenant_id = ? AND hb.status = "checked_in" LIMIT 1');
                $rStmt->execute([$roomNumber, $tenantId]);
                $roomData = $rStmt->fetch();

                if (!$roomData) {
                    throw new Exception("Kamar #{$roomNumber} tidak ditemukan atau tidak sedang terisi tamu checked-in");
                }

                $folioId = (int)$roomData['folio_id'];
                $folioDesc = "F&B Cafe / Restoran Order #{$order['order_number']}";

                $insFItem = $db->prepare('INSERT INTO hotel_folio_items (tenant_id, folio_id, category, source_order_id, description, amount, quantity) VALUES (?, ?, "pos_restaurant", ?, ?, ?, 1)');
                $insFItem->execute([$tenantId, $folioId, $orderId, $folioDesc, $total]);

                $newCharges = (int)$roomData['total_charges'] + $total;
                $newBalance = (int)$roomData['balance'] + $total;
                $db->prepare('UPDATE hotel_folios SET total_charges = ?, balance = ? WHERE id = ? AND tenant_id = ?')
                   ->execute([$newCharges, $newBalance, $folioId, $tenantId]);

                $referenceCode = "Kamar #{$roomNumber} (Folio #{$folioId})";
            }

            if ($shiftId === null) {
                $sQuery = $db->prepare('SELECT id FROM pos_shifts WHERE tenant_id = ? AND status = "open" ORDER BY id DESC LIMIT 1');
                $sQuery->execute([$tenantId]);
                $activeS = $sQuery->fetch();
                if ($activeS) {
                    $shiftId = (int)$activeS['id'];
                }
            }

            $payStmt = $db->prepare('INSERT INTO payments (tenant_id, order_id, method, total_amount, amount_paid, change_amount, reference_code, user_id, shift_id, device_id) 
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $payStmt->execute([
                $tenantId,
                $orderId,
                $method,
                $total,
                $amountPaid,
                $change,
                $referenceCode ?: null,
                $userId,
                $shiftId,
                $deviceId,
            ]);
            $paymentId = (int)$db->lastInsertId();

            // Recipe BOM Stock Deduction Hook
            $itemsStmt = $db->prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?');
            $itemsStmt->execute([$orderId]);
            $orderItems = $itemsStmt->fetchAll();

            $deductedIngredients = [];
            foreach ($orderItems as $oi) {
                $prodId = (int)$oi['product_id'];
                $prodQty = (int)$oi['quantity'];
                if ($prodId <= 0 || $prodQty <= 0) continue;

                $rStmt = $db->prepare('SELECT ingredient_id, quantity_needed FROM pos_product_recipes WHERE product_id = ? AND tenant_id = ?');
                $rStmt->execute([$prodId, $tenantId]);
                $recipes = $rStmt->fetchAll();

                foreach ($recipes as $rec) {
                    $ingrId = (int)$rec['ingredient_id'];
                    $needed = (float)$rec['quantity_needed'] * $prodQty;

                    $db->prepare('UPDATE pos_ingredients SET stock = stock - ? WHERE id = ? AND tenant_id = ?')
                       ->execute([$needed, $ingrId, $tenantId]);

                    $bStmt = $db->prepare('SELECT stock, min_stock_alert, name FROM pos_ingredients WHERE id = ?');
                    $bStmt->execute([$ingrId]);
                    $bRow = $bStmt->fetch();
                    $newBal = (float)($bRow['stock'] ?? 0);
                    $isLow = $newBal <= (float)($bRow['min_stock_alert'] ?? 0);

                    $note = "BOM order #{$order['order_number']}";
                    if ($newBal < 0) {
                        $note .= ' [WARNING: Stok Minus]';
                    } elseif ($isLow) {
                        $note .= ' [WARNING: Stok Menipis]';
                    }

                    $db->prepare('INSERT INTO pos_inventory_logs (tenant_id, ingredient_id, type, quantity, balance_after, reference_id, notes, user_id) 
                                  VALUES (?, ?, "out_order", ?, ?, ?, ?, ?)')
                       ->execute([$tenantId, $ingrId, -$needed, $newBal, $order['order_number'], $note, $userId]);

                    $deductedIngredients[] = [
                        'ingredient_id' => $ingrId,
                        'name' => $bRow['name'] ?? '',
                        'deducted' => $needed,
                        'balance_after' => $newBal,
                        'is_low_stock' => $isLow,
                    ];
                }
            }

            $updOrder = $db->prepare('UPDATE orders SET status = "paid" WHERE id = ? AND tenant_id = ?');
            $updOrder->execute([$orderId, $tenantId]);

            if ($order['table_id']) {
                $db->prepare('UPDATE tables SET status = "available", active_order_number = NULL, active_order_total = 0 WHERE id = ? AND tenant_id = ?')
                   ->execute([$order['table_id'], $tenantId]);
            }

            $db->commit();

            Response::success([
                'payment_id' => $paymentId,
                'order_id' => $orderId,
                'total' => $total,
                'amount_paid' => $amountPaid,
                'change_amount' => $change,
                'method' => $method,
                'shift_id' => $shiftId,
                'deducted_ingredients' => $deductedIngredients,
            ], 'Pembayaran berhasil diselesaikan', 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }
}
