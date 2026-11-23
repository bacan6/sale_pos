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

class OrderSplitController {
    public function splitBill(array $params): void {
        $tenantId = TenantContext::id();
        $orderId = (int)($params['id'] ?? 0);
        $body = Request::body();
        $splitType = (string)($body['split_type'] ?? 'by_item'); // 'by_item' or 'equal'

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ? FOR UPDATE');
            $stmt->execute([$orderId, $tenantId]);
            $order = $stmt->fetch();

            if (!$order) {
                throw new Exception('Pesanan tidak ditemukan');
            }

            if ($order['status'] === 'paid' || $order['status'] === 'cancelled') {
                throw new Exception('Pesanan tidak dapat di-split (status sudah selesai atau dibatalkan)');
            }

            if ($splitType === 'equal') {
                $count = max(2, min(20, (int)($body['split_count'] ?? 2)));
                $total = (int)$order['total'];
                $baseShare = intdiv($total, $count);
                $remainder = $total % $count;

                $shares = [];
                for ($i = 1; $i <= $count; $i++) {
                    $amount = $baseShare + ($i <= $remainder ? 1 : 0);
                    $shares[] = [
                        'payer_index' => $i,
                        'amount' => $amount,
                        'order_number' => "{$order['order_number']}/P{$i}",
                    ];
                }

                $db->commit();
                Response::success([
                    'order_id' => $orderId,
                    'order_number' => $order['order_number'],
                    'split_type' => 'equal',
                    'split_count' => $count,
                    'total' => $total,
                    'shares' => $shares,
                ], "Berhasil membuat simulasi split bill rata {$count} bagian");
                return;
            }

            // Split By Item
            $splitItems = $body['items'] ?? [];
            if (empty($splitItems) || !is_array($splitItems)) {
                throw new Exception('Daftar item untuk split bill wajib disertakan');
            }

            // 1. Create Child Split Order
            $childNumber = $order['order_number'] . '-S' . rand(10, 99);
            $userId = AuthContext::id() ?: null;
            $insOrder = $db->prepare('INSERT INTO orders (tenant_id, order_number, table_id, parent_order_id, is_split, order_type, user_id, waiter_name, status, subtotal, tax_amount, total, device_id) 
                                      VALUES (?, ?, ?, ?, 1, ?, ?, ?, "pending", 0, 0, 0, ?)');
            $insOrder->execute([
                $tenantId,
                $childNumber,
                $order['table_id'],
                $orderId,
                $order['order_type'],
                $userId,
                $order['waiter_name'],
                $order['device_id'],
            ]);
            $childOrderId = (int)$db->lastInsertId();

            $childSubtotal = 0;

            foreach ($splitItems as $reqItem) {
                $itemId = (int)($reqItem['order_item_id'] ?? 0);
                $qtyToSplit = (int)($reqItem['quantity'] ?? 0);

                if ($itemId <= 0 || $qtyToSplit <= 0) continue;

                $itStmt = $db->prepare('SELECT * FROM order_items WHERE id = ? AND order_id = ? FOR UPDATE');
                $itStmt->execute([$itemId, $orderId]);
                $item = $itStmt->fetch();

                if (!$item) continue;

                $origQty = (int)$item['quantity'];
                $unitPrice = (int)$item['unit_price'];

                if ($qtyToSplit >= $origQty) {
                    // Move entire line item to child order
                    $db->prepare('UPDATE order_items SET order_id = ? WHERE id = ?')
                       ->execute([$childOrderId, $itemId]);
                    $childSubtotal += (int)$item['subtotal'];
                } else {
                    // Split partial quantity
                    $remainQty = $origQty - $qtyToSplit;
                    $remainSubtotal = $remainQty * $unitPrice;
                    $splitSubtotal = $qtyToSplit * $unitPrice;

                    // Update existing line item
                    $db->prepare('UPDATE order_items SET quantity = ?, subtotal = ? WHERE id = ?')
                       ->execute([$remainQty, $remainSubtotal, $itemId]);

                    // Insert new line item for child order
                    $insChildItem = $db->prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, notes, selected_options_json) 
                                                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                    $insChildItem->execute([
                        $childOrderId,
                        $item['product_id'],
                        $item['product_name'],
                        $qtyToSplit,
                        $unitPrice,
                        $splitSubtotal,
                        $item['notes'],
                        $item['selected_options_json'],
                    ]);
                    $childSubtotal += $splitSubtotal;
                }
            }

            if ($childSubtotal === 0) {
                throw new Exception('Tidak ada item yang berhasil di-split');
            }

            // Recalculate child order
            $childTax = (int)round($childSubtotal * 0.1);
            $childTotal = $childSubtotal + $childTax;
            $db->prepare('UPDATE orders SET subtotal = ?, tax_amount = ?, total = ? WHERE id = ? AND tenant_id = ?')
               ->execute([$childSubtotal, $childTax, $childTotal, $childOrderId, $tenantId]);

            // Recalculate parent order
            $pSumStmt = $db->prepare('SELECT SUM(subtotal) as new_subtotal FROM order_items WHERE order_id = ?');
            $pSumStmt->execute([$orderId]);
            $pSumRes = $pSumStmt->fetch();
            $newParentSubtotal = (int)($pSumRes['new_subtotal'] ?? 0);
            $newParentTax = (int)round($newParentSubtotal * 0.1);
            $newParentTotal = $newParentSubtotal + $newParentTax;

            $db->prepare('UPDATE orders SET subtotal = ?, tax_amount = ?, total = ? WHERE id = ? AND tenant_id = ?')
               ->execute([$newParentSubtotal, $newParentTax, $newParentTotal, $orderId, $tenantId]);

            // Update table active total
            if ($order['table_id']) {
                $db->prepare('UPDATE tables SET active_order_total = ? WHERE id = ? AND tenant_id = ?')
                   ->execute([$newParentTotal, $order['table_id'], $tenantId]);
            }

            $db->commit();
            Response::success([
                'parent_order' => [
                    'id' => $orderId,
                    'order_number' => $order['order_number'],
                    'subtotal' => $newParentSubtotal,
                    'total' => $newParentTotal,
                ],
                'split_order' => [
                    'id' => $childOrderId,
                    'order_number' => $childNumber,
                    'subtotal' => $childSubtotal,
                    'total' => $childTotal,
                ],
            ], "Berhasil memisahkan tagihan ke pesanan split baru #{$childNumber}");
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }
}
