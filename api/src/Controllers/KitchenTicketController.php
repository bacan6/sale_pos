<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use PDO;
use Exception;

class KitchenTicketController {
    public function index(): void {
        $db = Database::getInstance()->pdo();
        $status = Request::query('status');

        $sql = 'SELECT * FROM kitchen_tickets';
        $values = [];

        if ($status !== null && $status !== 'all') {
            $sql .= ' WHERE status = ?';
            $values[] = $status;
        }

        $sql .= ' ORDER BY id DESC LIMIT 50';

        $stmt = $db->prepare($sql);
        $stmt->execute($values);
        $tickets = $stmt->fetchAll();

        foreach ($tickets as &$ticket) {
            $itemsStmt = $db->prepare('SELECT name, qty, notes, options_json FROM kitchen_ticket_items WHERE kitchen_ticket_id = ?');
            $itemsStmt->execute([$ticket['id']]);
            $items = $itemsStmt->fetchAll();

            foreach ($items as &$it) {
                $it['options'] = !empty($it['options_json']) ? json_decode($it['options_json'], true) : [];
                unset($it['options_json']);
            }

            $ticket['items'] = $items;
        }

        Response::success($tickets);
    }

    public function store(): void {
        $body = Request::body();
        $orderId = isset($body['order_id']) ? (int)$body['order_id'] : null;
        $orderNumber = trim((string)($body['order_number'] ?? ''));
        $tableName = trim((string)($body['table_name'] ?? 'Take-Away'));
        $type = (string)($body['type'] ?? 'Dine-In');
        $waiterName = trim((string)($body['waiter_name'] ?? 'Staff'));
        $notes = (string)($body['notes'] ?? '');
        $items = $body['items'] ?? [];

        if ($orderNumber === '' || empty($items)) {
            Response::error('Nomor order dan item dapur wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare('INSERT INTO kitchen_tickets (order_id, order_number, table_name, type, waiter_name, status, notes) 
                                  VALUES (?, ?, ?, ?, ?, "queued", ?)');
            $stmt->execute([$orderId, $orderNumber, $tableName, $type, $waiterName, $notes ?: null]);
            $ticketId = (int)$db->lastInsertId();

            $itemStmt = $db->prepare('INSERT INTO kitchen_ticket_items (kitchen_ticket_id, product_id, name, qty, notes, options_json) 
                                      VALUES (?, ?, ?, ?, ?, ?)');

            foreach ($items as $item) {
                $name = (string)($item['name'] ?? '');
                $qty = (int)($item['qty'] ?? 1);
                $itemNotes = (string)($item['notes'] ?? '');
                $optionsJson = isset($item['options']) ? json_encode($item['options']) : null;
                $productId = isset($item['product_id']) ? (int)$item['product_id'] : null;

                $itemStmt->execute([$ticketId, $productId, $name, $qty, $itemNotes ?: null, $optionsJson]);
            }

            if ($orderId !== null) {
                $db->prepare('UPDATE orders SET status = "kitchen" WHERE id = ? AND status = "pending"')->execute([$orderId]);
            }

            $db->commit();
            Response::success(['id' => $ticketId, 'order_number' => $orderNumber], 'Tiket dapur berhasil dikirim', 201);
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }

    public function updateStatus(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();
        $status = (string)($body['status'] ?? '');

        $validStatuses = ['queued', 'cooking', 'ready'];
        if (!in_array($status, $validStatuses, true)) {
            Response::error('Status tiket dapur tidak valid', 422);
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE kitchen_tickets SET status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);

        if ($stmt->rowCount() === 0) {
            Response::error('Tiket dapur tidak ditemukan', 404);
        }

        Response::success(['id' => $id, 'status' => $status], 'Status tiket dapur berhasil diubah');
    }
}
