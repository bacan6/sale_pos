<?php
declare(strict_types=1);

namespace App\Modules\Pos\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use PDO;

class RoomCategoryController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT * FROM room_categories WHERE tenant_id = ? ORDER BY sort_order ASC, name ASC');
        $stmt->execute([$tenantId]);
        $data = $stmt->fetchAll();
        Response::success($data);
    }

    public function show(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT * FROM room_categories WHERE id = ? AND tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Kategori ruangan/zona tidak ditemukan', 404);
        }

        Response::success($row);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $name = trim((string)($body['name'] ?? ''));
        $description = trim((string)($body['description'] ?? ''));
        $sortOrder = (int)($body['sort_order'] ?? 0);
        $isActive = isset($body['is_active']) ? (int)$body['is_active'] : 1;

        if ($name === '') {
            Response::error('Nama kategori ruangan wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        $check = $db->prepare('SELECT id FROM room_categories WHERE name = ? AND tenant_id = ? LIMIT 1');
        $check->execute([$name, $tenantId]);
        if ($check->fetch()) {
            Response::error('Nama kategori ruangan sudah ada untuk tenant ini', 409);
        }

        $stmt = $db->prepare('INSERT INTO room_categories (tenant_id, name, description, sort_order, is_active) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$tenantId, $name, $description ?: null, $sortOrder, $isActive]);
        $id = (int)$db->lastInsertId();

        Response::success(['id' => $id, 'name' => $name], 'Kategori ruangan berhasil ditambahkan', 201);
    }

    public function update(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();

        $db = Database::getInstance()->pdo();
        $check = $db->prepare('SELECT id FROM room_categories WHERE id = ? AND tenant_id = ? LIMIT 1');
        $check->execute([$id, $tenantId]);
        if (!$check->fetch()) {
            Response::error('Kategori ruangan tidak ditemukan', 404);
        }

        $fields = [];
        $values = [];

        if (isset($body['name'])) {
            $name = trim((string)$body['name']);
            if ($name === '') {
                Response::error('Nama kategori ruangan tidak boleh kosong', 422);
            }
            $dup = $db->prepare('SELECT id FROM room_categories WHERE name = ? AND id != ? AND tenant_id = ? LIMIT 1');
            $dup->execute([$name, $id, $tenantId]);
            if ($dup->fetch()) {
                Response::error('Nama kategori ruangan sudah digunakan', 409);
            }
            $fields[] = '`name` = ?';
            $values[] = $name;
        }

        if (array_key_exists('description', $body)) {
            $fields[] = '`description` = ?';
            $values[] = $body['description'] !== null ? trim((string)$body['description']) : null;
        }

        if (isset($body['sort_order'])) {
            $fields[] = '`sort_order` = ?';
            $values[] = (int)$body['sort_order'];
        }

        if (isset($body['is_active'])) {
            $fields[] = '`is_active` = ?';
            $values[] = (int)$body['is_active'];
        }

        if (empty($fields)) {
            Response::error('Tidak ada perubahan data', 422);
        }

        $values[] = $id;
        $values[] = $tenantId;
        $sql = 'UPDATE room_categories SET ' . implode(', ', $fields) . ' WHERE id = ? AND tenant_id = ?';
        $stmt = $db->prepare($sql);
        $stmt->execute($values);

        Response::success(['id' => $id], 'Kategori ruangan berhasil diperbarui');
    }

    public function destroy(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $tblCheck = $db->prepare('SELECT COUNT(*) as cnt FROM tables WHERE room_category_id = ? AND tenant_id = ?');
        $tblCheck->execute([$id, $tenantId]);
        $cnt = (int)$tblCheck->fetch()['cnt'];
        if ($cnt > 0) {
            Response::error("Kategori ruangan tidak dapat dihapus karena masih digunakan oleh {$cnt} meja", 400);
        }

        $stmt = $db->prepare('DELETE FROM room_categories WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$id, $tenantId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Kategori ruangan tidak ditemukan', 404);
        }

        Response::success(['id' => $id], 'Kategori ruangan berhasil dihapus');
    }
}
