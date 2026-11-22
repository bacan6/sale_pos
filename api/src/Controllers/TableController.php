<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use PDO;

class TableController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();
        $roomId = Request::query('room_category_id');

        $sql = 'SELECT t.*, rc.name as zone 
                FROM tables t 
                JOIN room_categories rc ON t.room_category_id = rc.id 
                WHERE t.tenant_id = ?';
        $values = [$tenantId];

        if ($roomId !== null) {
            $sql .= ' AND t.room_category_id = ?';
            $values[] = (int)$roomId;
        }

        $sql .= ' ORDER BY rc.sort_order ASC, t.id ASC';

        $stmt = $db->prepare($sql);
        $stmt->execute($values);
        $rows = $stmt->fetchAll();

        Response::success($rows);
    }

    public function show(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT t.*, rc.name as zone 
                              FROM tables t 
                              JOIN room_categories rc ON t.room_category_id = rc.id 
                              WHERE t.id = ? AND t.tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Meja tidak ditemukan', 404);
        }

        Response::success($row);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $name = trim((string)($body['name'] ?? ''));
        $capacity = (int)($body['capacity'] ?? 4);
        $roomCategoryId = (int)($body['room_category_id'] ?? 0);

        if ($name === '' || $roomCategoryId <= 0) {
            Response::error('Nama meja dan kategori ruangan wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        $rcCheck = $db->prepare('SELECT id FROM room_categories WHERE id = ? AND tenant_id = ? LIMIT 1');
        $rcCheck->execute([$roomCategoryId, $tenantId]);
        if (!$rcCheck->fetch()) {
            Response::error('Kategori ruangan tidak valid untuk tenant ini', 400);
        }

        $stmt = $db->prepare('INSERT INTO tables (tenant_id, name, capacity, room_category_id, status) VALUES (?, ?, ?, ?, "available")');
        $stmt->execute([$tenantId, $name, $capacity, $roomCategoryId]);
        $id = (int)$db->lastInsertId();

        Response::success(['id' => $id, 'name' => $name], 'Meja berhasil ditambahkan', 201);
    }

    public function update(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();
        $db = Database::getInstance()->pdo();

        $check = $db->prepare('SELECT id FROM tables WHERE id = ? AND tenant_id = ? LIMIT 1');
        $check->execute([$id, $tenantId]);
        if (!$check->fetch()) {
            Response::error('Meja tidak ditemukan', 404);
        }

        $fields = [];
        $values = [];

        if (isset($body['name'])) {
            $fields[] = '`name` = ?';
            $values[] = trim((string)$body['name']);
        }

        if (isset($body['capacity'])) {
            $fields[] = '`capacity` = ?';
            $values[] = (int)$body['capacity'];
        }

        if (isset($body['room_category_id'])) {
            $rcId = (int)$body['room_category_id'];
            $rcCheck = $db->prepare('SELECT id FROM room_categories WHERE id = ? AND tenant_id = ? LIMIT 1');
            $rcCheck->execute([$rcId, $tenantId]);
            if (!$rcCheck->fetch()) Response::error('Kategori ruangan tidak valid', 400);
            $fields[] = '`room_category_id` = ?';
            $values[] = $rcId;
        }

        if (isset($body['status'])) {
            $status = (string)$body['status'];
            $validStatuses = ['available', 'occupied', 'reserved', 'billing'];
            if (!in_array($status, $validStatuses, true)) {
                Response::error('Status meja tidak valid', 422);
            }
            $fields[] = '`status` = ?';
            $values[] = $status;
        }

        if (array_key_exists('active_order_number', $body)) {
            $fields[] = '`active_order_number` = ?';
            $values[] = $body['active_order_number'] !== null ? (string)$body['active_order_number'] : null;
        }

        if (isset($body['active_order_total'])) {
            $fields[] = '`active_order_total` = ?';
            $values[] = (int)$body['active_order_total'];
        }

        if (isset($body['guest_count'])) {
            $fields[] = '`guest_count` = ?';
            $values[] = (int)$body['guest_count'];
        }

        if (empty($fields)) {
            Response::error('Tidak ada data yang diperbarui', 422);
        }

        $values[] = $id;
        $values[] = $tenantId;
        $sql = 'UPDATE tables SET ' . implode(', ', $fields) . ' WHERE id = ? AND tenant_id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($values);

        Response::success(['id' => $id], 'Data meja berhasil diperbarui');
    }

    public function destroy(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('DELETE FROM tables WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$id, $tenantId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Meja tidak ditemukan', 404);
        }

        Response::success(['id' => $id], 'Meja berhasil dihapus');
    }
}
