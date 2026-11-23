<?php
declare(strict_types=1);

namespace App\Modules\Laundry\Controllers;

use App\Core\AuthContext;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use App\Modules\Accounting\Services\AccountingPostingService;
use Exception;
use PDO;

class LaundryOrderController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();
        $status = trim((string)(Request::query('status') ?? ''));
        $search = trim((string)(Request::query('search') ?? ''));
        $rackId = (int)(Request::query('rack_id') ?? 0);
        $speed = trim((string)(Request::query('speed') ?? ''));
        $limit = max(1, min(100, (int)(Request::query('limit') ?? 50)));

        $sql = 'SELECT lo.*, 
                       lp.name as perfume_name,
                       lr.code as rack_code, lr.name as rack_name,
                       hb.booking_number, hg.full_name as hotel_guest_name,
                       (SELECT COUNT(*) FROM laundry_order_items WHERE order_id = lo.id) as items_count
                FROM laundry_orders lo
                LEFT JOIN laundry_perfumes lp ON lo.perfume_id = lp.id
                LEFT JOIN laundry_racks lr ON lo.rack_id = lr.id
                LEFT JOIN hotel_bookings hb ON lo.hotel_booking_id = hb.id
                LEFT JOIN hotel_guests hg ON hb.guest_id = hg.id
                WHERE lo.tenant_id = ?';
        $params = [$tenantId];

        if (!empty($status)) {
            $sql .= ' AND lo.status = ?';
            $params[] = $status;
        }

        if ($rackId > 0) {
            $sql .= ' AND lo.rack_id = ?';
            $params[] = $rackId;
        }

        if (!empty($speed)) {
            $sql .= ' AND lo.service_speed = ?';
            $params[] = $speed;
        }

        if (!empty($search)) {
            $sql .= ' AND (lo.order_number LIKE ? OR lo.tracking_code LIKE ? OR lo.customer_name LIKE ? OR lo.customer_phone LIKE ?)';
            $like = "%{$search}%";
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        $sql .= ' ORDER BY lo.id DESC LIMIT ' . $limit;
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();

        Response::success($orders);
    }

    public function show(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT lo.*, 
                                     lp.name as perfume_name,
                                     lr.code as rack_code, lr.name as rack_name,
                                     hb.booking_number, hg.full_name as hotel_guest_name,
                                     u.name as created_by_name
                              FROM laundry_orders lo
                              LEFT JOIN laundry_perfumes lp ON lo.perfume_id = lp.id
                              LEFT JOIN laundry_racks lr ON lo.rack_id = lr.id
                              LEFT JOIN hotel_bookings hb ON lo.hotel_booking_id = hb.id
                              LEFT JOIN hotel_guests hg ON hb.guest_id = hg.id
                              LEFT JOIN users u ON lo.created_by = u.id
                              WHERE lo.id = ? AND lo.tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $order = $stmt->fetch();

        if (!$order) {
            Response::error('Pesanan laundry tidak ditemukan', 404);
        }

        // Line Items
        $itemStmt = $db->prepare('SELECT loi.*, ls.type as service_type, ls.unit as service_unit 
                                  FROM laundry_order_items loi 
                                  LEFT JOIN laundry_services ls ON loi.service_id = ls.id 
                                  WHERE loi.order_id = ?');
        $itemStmt->execute([$id]);
        $order['items'] = $itemStmt->fetchAll();

        // Payments
        $payStmt = $db->prepare('SELECT lp.*, u.name as cashier_name 
                                 FROM laundry_payments lp 
                                 LEFT JOIN users u ON lp.cashier_id = u.id 
                                 WHERE lp.order_id = ? ORDER BY lp.id ASC');
        $payStmt->execute([$id]);
        $order['payments'] = $payStmt->fetchAll();

        // Status Logs
        $logStmt = $db->prepare('SELECT lsl.*, u.name as changed_by_name 
                                 FROM laundry_status_logs lsl 
                                 LEFT JOIN users u ON lsl.changed_by = u.id 
                                 WHERE lsl.order_id = ? ORDER BY lsl.id ASC');
        $logStmt->execute([$id]);
        $order['logs'] = $logStmt->fetchAll();

        Response::success($order);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $userId = AuthContext::id();
        $body = Request::body();
        $db = Database::getInstance()->pdo();

        $customerName = trim((string)($body['customer_name'] ?? ''));
        $customerPhone = trim((string)($body['customer_phone'] ?? ''));
        $serviceSpeed = in_array($body['service_speed'] ?? '', ['regular', 'express', 'super_express'], true) ? $body['service_speed'] : 'regular';
        $perfumeId = !empty($body['perfume_id']) ? (int)$body['perfume_id'] : null;
        $rackId = !empty($body['rack_id']) ? (int)$body['rack_id'] : null;
        $hotelBookingId = !empty($body['hotel_booking_id']) ? (int)$body['hotel_booking_id'] : null;
        $notes = trim((string)($body['notes'] ?? ''));
        $rawItems = $body['items'] ?? [];

        if (empty($customerName)) {
            Response::error('Nama pelanggan wajib diisi', 422);
        }

        if (empty($rawItems) || !is_array($rawItems)) {
            Response::error('Pesanan harus memiliki minimal 1 item layanan', 422);
        }

        $db->beginTransaction();
        try {
            // Generate unique numbers
            $today = date('Ymd');
            $countStmt = $db->prepare('SELECT COUNT(*) FROM laundry_orders WHERE tenant_id = ? AND order_number LIKE ?');
            $countStmt->execute([$tenantId, "LND-{$today}-%"]);
            $seq = (int)$countStmt->fetchColumn() + 1;
            $orderNumber = sprintf('LND-%s-%04d', $today, $seq);
            $trackingCode = 'TRK' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));

            // Calculate estimated completion based on speed
            $estHours = 48;
            $surchargeMultiplier = 0.0;
            if ($serviceSpeed === 'express') {
                $estHours = 24;
                $surchargeMultiplier = 0.50; // +50%
            } elseif ($serviceSpeed === 'super_express') {
                $estHours = 6;
                $surchargeMultiplier = 1.00; // +100%
            }
            $estCompletionAt = date('Y-m-d H:i:s', strtotime("+{$estHours} hours"));

            // Calculate perfume extra
            $perfumeExtraUnit = 0.0;
            if ($perfumeId) {
                $pStmt = $db->prepare('SELECT price_extra FROM laundry_perfumes WHERE id = ? AND tenant_id = ? LIMIT 1');
                $pStmt->execute([$perfumeId, $tenantId]);
                $perfumeExtraUnit = (float)$pStmt->fetchColumn();
            }

            $subtotal = 0.0;
            $totalWeight = 0.0;
            $cleanItems = [];

            foreach ($rawItems as $itm) {
                $serviceId = !empty($itm['service_id']) ? (int)$itm['service_id'] : null;
                $itemName = trim((string)($itm['item_name'] ?? ''));
                $qty = max(0.1, (float)($itm['quantity'] ?? 1.0));
                $unitPrice = max(0.0, (float)($itm['unit_price'] ?? 0.0));

                if ($serviceId) {
                    $sStmt = $db->prepare('SELECT name, type, base_price FROM laundry_services WHERE id = ? AND tenant_id = ? LIMIT 1');
                    $sStmt->execute([$serviceId, $tenantId]);
                    $svc = $sStmt->fetch();
                    if ($svc) {
                        if (empty($itemName)) $itemName = (string)$svc['name'];
                        if ($unitPrice <= 0) $unitPrice = (float)$svc['base_price'];
                        if ($svc['type'] === 'kiloan') {
                            $totalWeight += $qty;
                        }
                    }
                }

                if (empty($itemName)) {
                    $itemName = 'Item Cucian';
                }

                $itemSubtotal = round($qty * $unitPrice, 2);
                $subtotal += $itemSubtotal;

                $cleanItems[] = [
                    'service_id' => $serviceId,
                    'item_name' => $itemName,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'subtotal' => $itemSubtotal,
                    'notes' => trim((string)($itm['notes'] ?? '')),
                ];
            }

            $speedSurcharge = round($subtotal * $surchargeMultiplier, 2);
            $perfumeSurcharge = $totalWeight > 0 ? round($perfumeExtraUnit * $totalWeight, 2) : round($perfumeExtraUnit, 2);
            $discount = max(0.0, (float)($body['discount_amount'] ?? 0));
            $totalAmount = max(0.0, round($subtotal + $speedSurcharge + $perfumeSurcharge - $discount, 2));

            // Initial insert
            $insOrder = $db->prepare('INSERT INTO laundry_orders 
                (tenant_id, order_number, tracking_code, customer_name, customer_phone, service_speed, 
                 perfume_id, rack_id, total_weight, subtotal_amount, speed_surcharge, perfume_surcharge, 
                 discount_amount, total_amount, paid_amount, payment_status, status, hotel_booking_id, 
                 estimated_completion_at, notes, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, "unpaid", "received", ?, ?, ?, ?)');
            $insOrder->execute([
                $tenantId, $orderNumber, $trackingCode, $customerName, $customerPhone, $serviceSpeed,
                $perfumeId, $rackId, $totalWeight, $subtotal, $speedSurcharge, $perfumeSurcharge,
                $discount, $totalAmount, $hotelBookingId, $estCompletionAt, $notes, $userId
            ]);
            $orderId = (int)$db->lastInsertId();

            // Insert line items
            $insItem = $db->prepare('INSERT INTO laundry_order_items 
                (tenant_id, order_id, service_id, item_name, quantity, unit_price, subtotal, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            foreach ($cleanItems as $ci) {
                $insItem->execute([
                    $tenantId, $orderId, $ci['service_id'], $ci['item_name'], $ci['quantity'],
                    $ci['unit_price'], $ci['subtotal'], $ci['notes']
                ]);
            }

            // Initial status log
            $db->prepare('INSERT INTO laundry_status_logs (tenant_id, order_id, from_status, to_status, changed_by, notes) 
                          VALUES (?, ?, NULL, "received", ?, "Pesanan laundry berhasil diterima")')
               ->execute([$tenantId, $orderId, $userId]);

            // Optional Instant Payment or Hotel Room Charge
            $paymentMethod = trim((string)($body['payment_method'] ?? ''));
            $initialPayAmount = max(0.0, (float)($body['paid_amount'] ?? 0));

            if ($paymentMethod === 'room_charge' && $hotelBookingId) {
                // Post charge to Hotel Folio
                $fStmt = $db->prepare('SELECT id FROM hotel_folios WHERE booking_id = ? AND tenant_id = ? AND status = "open" LIMIT 1');
                $fStmt->execute([$hotelBookingId, $tenantId]);
                $folioId = (int)$fStmt->fetchColumn();

                if ($folioId > 0) {
                    $db->prepare('INSERT INTO hotel_folio_items (tenant_id, folio_id, category, source_order_id, description, amount, quantity)
                                  VALUES (?, ?, "laundry", ?, ?, ?, 1)')
                       ->execute([$tenantId, $folioId, $orderId, "Laundry Service {$orderNumber}", (int)round($totalAmount)]);

                    $db->prepare('UPDATE hotel_folios SET total_charges = total_charges + ?, balance = balance + ? WHERE id = ?')
                       ->execute([(int)round($totalAmount), (int)round($totalAmount), $folioId]);

                    // Record laundry payment as room_charge
                    $db->prepare('INSERT INTO laundry_payments (tenant_id, order_id, amount, payment_method, reference_number, cashier_id)
                                  VALUES (?, ?, ?, "room_charge", ?, ?)')
                       ->execute([$tenantId, $orderId, $totalAmount, "FOLIO-{$folioId}", $userId]);
                    $payId = (int)$db->lastInsertId();

                    $db->prepare('UPDATE laundry_orders SET paid_amount = ?, payment_status = "paid" WHERE id = ?')
                       ->execute([$totalAmount, $orderId]);

                    // Post to Accounting
                    AccountingPostingService::postLaundryPaymentJournal(
                        $db, $tenantId, $orderId, $payId, $totalAmount, 'room_charge', $orderNumber, $userId
                    );
                }
            } elseif ($initialPayAmount > 0 && in_array($paymentMethod, ['cash', 'card', 'qris', 'transfer'], true)) {
                $actualPay = min($initialPayAmount, $totalAmount);
                $refNo = trim((string)($body['payment_reference'] ?? ''));

                $db->prepare('INSERT INTO laundry_payments (tenant_id, order_id, amount, payment_method, reference_number, cashier_id)
                              VALUES (?, ?, ?, ?, ?, ?)')
                   ->execute([$tenantId, $orderId, $actualPay, $paymentMethod, $refNo, $userId]);
                $payId = (int)$db->lastInsertId();

                $newPayStatus = ($actualPay >= $totalAmount) ? 'paid' : 'partial';
                $db->prepare('UPDATE laundry_orders SET paid_amount = ?, payment_status = ? WHERE id = ?')
                   ->execute([$actualPay, $newPayStatus, $orderId]);

                // Post to Accounting
                AccountingPostingService::postLaundryPaymentJournal(
                    $db, $tenantId, $orderId, $payId, $actualPay, $paymentMethod, $orderNumber, $userId
                );
            }

            $db->commit();

            Response::success([
                'id' => $orderId,
                'order_number' => $orderNumber,
                'tracking_code' => $trackingCode,
                'total_amount' => $totalAmount,
                'estimated_completion_at' => $estCompletionAt,
            ], 'Pesanan laundry berhasil dibuat', 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Gagal membuat pesanan laundry: ' . $e->getMessage(), 500);
        }
    }

    public function updateStatus(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $userId = AuthContext::id();
        $body = Request::body();
        $db = Database::getInstance()->pdo();

        $newStatus = trim((string)($body['status'] ?? ''));
        $notes = trim((string)($body['notes'] ?? ''));
        $validStatuses = ['received', 'washing', 'drying', 'ironing', 'ready', 'picked_up', 'cancelled'];

        if (!in_array($newStatus, $validStatuses, true)) {
            Response::error('Status baru tidak valid', 422);
        }

        $stmt = $db->prepare('SELECT id, status, payment_status, total_amount, paid_amount FROM laundry_orders WHERE id = ? AND tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $order = $stmt->fetch();

        if (!$order) {
            Response::error('Pesanan laundry tidak ditemukan', 404);
        }

        $currentStatus = (string)$order['status'];
        if ($currentStatus === $newStatus) {
            Response::success(null, 'Status cucian tidak berubah');
            return;
        }

        $db->beginTransaction();
        try {
            $extraUpdates = [];
            $extraParams = [];

            if ($newStatus === 'ready') {
                $extraUpdates[] = 'completed_at = NOW()';
            } elseif ($newStatus === 'picked_up') {
                $extraUpdates[] = 'picked_up_at = NOW()';
            }

            $setSql = 'status = ?';
            if (!empty($extraUpdates)) {
                $setSql .= ', ' . implode(', ', $extraUpdates);
            }

            $updateParams = array_merge([$newStatus], $extraParams, [$id, $tenantId]);
            $db->prepare("UPDATE laundry_orders SET {$setSql} WHERE id = ? AND tenant_id = ?")->execute($updateParams);

            $db->prepare('INSERT INTO laundry_status_logs (tenant_id, order_id, from_status, to_status, changed_by, notes) 
                          VALUES (?, ?, ?, ?, ?, ?)')
               ->execute([$tenantId, $id, $currentStatus, $newStatus, $userId, $notes ?: "Status diubah dari {$currentStatus} ke {$newStatus}"]);

            $db->commit();
            Response::success(['status' => $newStatus], 'Status cucian berhasil diperbarui');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error('Gagal memperbarui status: ' . $e->getMessage(), 500);
        }
    }

    public function assignRack(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();
        $rackId = !empty($body['rack_id']) ? (int)$body['rack_id'] : null;
        $db = Database::getInstance()->pdo();

        if ($rackId) {
            $rChk = $db->prepare('SELECT id FROM laundry_racks WHERE id = ? AND tenant_id = ? LIMIT 1');
            $rChk->execute([$rackId, $tenantId]);
            if (!$rChk->fetch()) {
                Response::error('Rak penyimpanan tidak ditemukan', 404);
            }
        }

        $stmt = $db->prepare('UPDATE laundry_orders SET rack_id = ? WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$rackId, $id, $tenantId]);

        Response::success(null, 'Penempatan rak berhasil diperbarui');
    }
}
