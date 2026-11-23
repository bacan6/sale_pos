<?php
declare(strict_types=1);

namespace App\Modules\Laundry\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;

class LaundryPerfumeController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM laundry_perfumes WHERE tenant_id = ? ORDER BY is_active DESC, name ASC');
        $stmt->execute([$tenantId]);
        Response::success($stmt->fetchAll());
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $name = trim((string)($body['name'] ?? ''));
        $priceExtra = max(0.0, (float)($body['price_extra'] ?? 0));
        $isActive = isset($body['is_active']) ? (int)(bool)$body['is_active'] : 1;

        if (empty($name)) {
            Response::error('Nama parfum wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('INSERT INTO laundry_perfumes (tenant_id, name, price_extra, is_active) VALUES (?, ?, ?, ?)');
        $stmt->execute([$tenantId, $name, $priceExtra, $isActive]);

        Response::success(['id' => (int)$db->lastInsertId()], 'Parfum berhasil ditambahkan', 201);
    }

    public function update(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();
        $db = Database::getInstance()->pdo();

        $updates = [];
        $values = [];

        if (isset($body['name'])) {
            $name = trim((string)$body['name']);
            if (empty($name)) Response::error('Nama parfum tidak boleh kosong', 422);
            $updates[] = 'name = ?';
            $values[] = $name;
        }

        if (isset($body['price_extra'])) {
            $updates[] = 'price_extra = ?';
            $values[] = max(0.0, (float)$body['price_extra']);
        }

        if (isset($body['is_active'])) {
            $updates[] = 'is_active = ?';
            $values[] = (int)(bool)$body['is_active'];
        }

        if (empty($updates)) {
            Response::error('Tidak ada data yang diubah', 422);
        }

        $values[] = $id;
        $values[] = $tenantId;
        $db->prepare('UPDATE laundry_perfumes SET ' . implode(', ', $updates) . ' WHERE id = ? AND tenant_id = ?')->execute($values);

        Response::success(null, 'Parfum berhasil diperbarui');
    }

    public function destroy(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('DELETE FROM laundry_perfumes WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$id, $tenantId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Parfum tidak ditemukan', 404);
        }

        Response::success(null, 'Parfum berhasil dihapus');
    }
}
