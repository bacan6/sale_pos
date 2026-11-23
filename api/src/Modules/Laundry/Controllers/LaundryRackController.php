<?php
declare(strict_types=1);

namespace App\Modules\Laundry\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;

class LaundryRackController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $sql = 'SELECT lr.*, 
                       (SELECT COUNT(*) FROM laundry_orders lo 
                        WHERE lo.rack_id = lr.id AND lo.status IN ("ironing", "ready")) as active_orders_count
                FROM laundry_racks lr
                WHERE lr.tenant_id = ?
                ORDER BY lr.code ASC';
        $stmt = $db->prepare($sql);
        $stmt->execute([$tenantId]);
        Response::success($stmt->fetchAll());
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $code = strtoupper(trim((string)($body['code'] ?? '')));
        $name = trim((string)($body['name'] ?? ''));
        $capacity = max(1, (int)($body['capacity'] ?? 10));
        $isActive = isset($body['is_active']) ? (int)(bool)$body['is_active'] : 1;

        if (empty($code) || empty($name)) {
            Response::error('Kode dan nama rak wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        // Check uniqueness of code per tenant
        $chk = $db->prepare('SELECT id FROM laundry_racks WHERE tenant_id = ? AND code = ? LIMIT 1');
        $chk->execute([$tenantId, $code]);
        if ($chk->fetch()) {
            Response::error("Kode rak '{$code}' sudah digunakan", 422);
        }

        $stmt = $db->prepare('INSERT INTO laundry_racks (tenant_id, code, name, capacity, is_active) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$tenantId, $code, $name, $capacity, $isActive]);

        Response::success(['id' => (int)$db->lastInsertId()], 'Rak berhasil ditambahkan', 201);
    }

    public function update(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();
        $db = Database::getInstance()->pdo();

        $updates = [];
        $values = [];

        if (isset($body['code'])) {
            $code = strtoupper(trim((string)$body['code']));
            if (empty($code)) Response::error('Kode rak tidak boleh kosong', 422);
            $chk = $db->prepare('SELECT id FROM laundry_racks WHERE tenant_id = ? AND code = ? AND id != ? LIMIT 1');
            $chk->execute([$tenantId, $code, $id]);
            if ($chk->fetch()) Response::error("Kode rak '{$code}' sudah digunakan", 422);
            $updates[] = 'code = ?';
            $values[] = $code;
        }

        if (isset($body['name'])) {
            $name = trim((string)$body['name']);
            if (empty($name)) Response::error('Nama rak tidak boleh kosong', 422);
            $updates[] = 'name = ?';
            $values[] = $name;
        }

        if (isset($body['capacity'])) {
            $updates[] = 'capacity = ?';
            $values[] = max(1, (int)$body['capacity']);
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
        $db->prepare('UPDATE laundry_racks SET ' . implode(', ', $updates) . ' WHERE id = ? AND tenant_id = ?')->execute($values);

        Response::success(null, 'Rak berhasil diperbarui');
    }

    public function destroy(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        // Check if any order currently using this rack
        $chk = $db->prepare('SELECT COUNT(*) FROM laundry_orders WHERE rack_id = ? AND status NOT IN ("picked_up", "cancelled")');
        $chk->execute([$id]);
        if ((int)$chk->fetchColumn() > 0) {
            Response::error('Rak tidak dapat dihapus karena masih menampung cucian aktif', 422);
        }

        $stmt = $db->prepare('DELETE FROM laundry_racks WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$id, $tenantId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Rak tidak ditemukan', 404);
        }

        Response::success(null, 'Rak berhasil dihapus');
    }
}
