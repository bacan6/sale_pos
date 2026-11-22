<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use PDO;
use Exception;

class PaymentController {
    public function index(): void {
        $db = Database::getInstance()->pdo();
        $stmt = $db->query('SELECT p.*, o.order_number, u.full_name as cashier_name 
                            FROM payments p 
                            JOIN orders o ON p.order_id = o.id 
                            LEFT JOIN users u ON p.user_id = u.id 
                            ORDER BY p.id DESC LIMIT 100');
        $rows = $stmt->fetchAll();
        Response::success($rows);
    }

    public function store(): void {
        $body = Request::body();
        $orderId = (int)($body['order_id'] ?? 0);
        $method = (string)($body['method'] ?? 'cash');
        $amountPaid = (int)($body['amount_paid'] ?? 0);
        $referenceCode = trim((string)($body['reference_code'] ?? ''));
        $userId = isset($body['user_id']) ? (int)$body['user_id'] : null;
        $deviceId = Request::header('X-Device-Id') ?: ($body['device_id'] ?? null);

        if ($orderId <= 0) {
            Response::error('ID pesanan wajib diisi', 422);
        }

        $validMethods = ['cash', 'qris', 'card'];
        if (!in_array($method, $validMethods, true)) {
            Response::error('Metode pembayaran tidak valid', 422);
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare('SELECT id, total, status, table_id FROM orders WHERE id = ? FOR UPDATE');
            $stmt->execute([$orderId]);
            $order = $stmt->fetch();

            if (!$order) {
                throw new Exception('Pesanan tidak ditemukan');
            }

            if ($order['status'] === 'paid') {
                throw new Exception('Pesanan sudah dibayar');
            }

            $total = (int)$order['total'];
            if ($amountPaid < $total && $method === 'cash') {
                throw new Exception('Jumlah uang yang dibayarkan kurang dari total tagihan');
            }

            $change = $method === 'cash' ? max(0, $amountPaid - $total) : 0;

            $payStmt = $db->prepare('INSERT INTO payments (order_id, method, total_amount, amount_paid, change_amount, reference_code, user_id, device_id) 
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            $payStmt->execute([
                $orderId,
                $method,
                $total,
                $amountPaid,
                $change,
                $referenceCode ?: null,
                $userId,
                $deviceId,
            ]);
            $paymentId = (int)$db->lastInsertId();

            $updOrder = $db->prepare('UPDATE orders SET status = "paid" WHERE id = ?');
            $updOrder->execute([$orderId]);

            if ($order['table_id']) {
                $db->prepare('UPDATE tables SET status = "available", active_order_number = NULL, active_order_total = 0 WHERE id = ?')
                   ->execute([$order['table_id']]);
            }

            $db->commit();

            Response::success([
                'payment_id' => $paymentId,
                'order_id' => $orderId,
                'total' => $total,
                'amount_paid' => $amountPaid,
                'change_amount' => $change,
                'method' => $method,
            ], 'Pembayaran berhasil diselesaikan', 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }
}
