<?php
declare(strict_types=1);

namespace App\Modules\Laundry\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use PDO;

class LaundryServiceController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $type = trim((string)(Request::query('type') ?? ''));
        $activeOnly = (int)(Request::query('active_only') ?? 0);

        $sql = 'SELECT * FROM laundry_services WHERE tenant_id = ?';
        $params = [$tenantId];

        if (!empty($type)) {
            $sql .= ' AND type = ?';
            $params[] = $type;
        }

        if ($activeOnly === 1) {
            $sql .= ' AND is_active = 1';
        }

        $sql .= ' ORDER BY type ASC, name ASC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        Response::success($rows);
    }

    public function show(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM laundry_services WHERE id = ? AND tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Layanan laundry tidak ditemukan', 404);
        }

        Response::success($row);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $name = trim((string)($body['name'] ?? ''));
        $type = in_array($body['type'] ?? '', ['kiloan', 'satuan'], true) ? $body['type'] : 'kiloan';
        $unit = trim((string)($body['unit'] ?? ($type === 'kiloan' ? 'kg' : 'pcs')));
        $basePrice = max(0.0, (float)($body['base_price'] ?? 0));
        $durationHours = max(1, (int)($body['duration_hours'] ?? 48));
        $description = trim((string)($body['description'] ?? ''));
        $isActive = isset($body['is_active']) ? (int)(bool)$body['is_active'] : 1;

        if (empty($name)) {
            Response::error('Nama layanan wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('INSERT INTO laundry_services 
            (tenant_id, name, type, unit, base_price, duration_hours, description, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$tenantId, $name, $type, $unit, $basePrice, $durationHours, $description, $isActive]);
        $id = (int)$db->lastInsertId();

        Response::success(['id' => $id], 'Layanan laundry berhasil ditambahkan', 201);
    }

    public function update(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT id FROM laundry_services WHERE id = ? AND tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        if (!$stmt->fetch()) {
            Response::error('Layanan laundry tidak ditemukan', 404);
        }

        $updates = [];
        $values = [];

        if (isset($body['name'])) {
            $name = trim((string)$body['name']);
            if (empty($name)) Response::error('Nama layanan tidak boleh kosong', 422);
            $updates[] = 'name = ?';
            $values[] = $name;
        }

        if (isset($body['type']) && in_array($body['type'], ['kiloan', 'satuan'], true)) {
            $updates[] = 'type = ?';
            $values[] = $body['type'];
        }

        if (isset($body['unit'])) {
            $updates[] = 'unit = ?';
            $values[] = trim((string)$body['unit']);
        }

        if (isset($body['base_price'])) {
            $updates[] = 'base_price = ?';
            $values[] = max(0.0, (float)$body['base_price']);
        }

        if (isset($body['duration_hours'])) {
            $updates[] = 'duration_hours = ?';
            $values[] = max(1, (int)$body['duration_hours']);
        }

        if (isset($body['description'])) {
            $updates[] = 'description = ?';
            $values[] = trim((string)$body['description']);
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
        $db->prepare('UPDATE laundry_services SET ' . implode(', ', $updates) . ' WHERE id = ? AND tenant_id = ?')->execute($values);

        Response::success(null, 'Layanan laundry berhasil diperbarui');
    }

    public function destroy(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('DELETE FROM laundry_services WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$id, $tenantId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Layanan laundry tidak ditemukan', 404);
        }

        Response::success(null, 'Layanan laundry berhasil dihapus');
    }
}
