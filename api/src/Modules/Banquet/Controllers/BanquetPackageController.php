<?php
declare(strict_types=1);

namespace App\Modules\Banquet\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class BanquetPackageController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM banquet_packages WHERE tenant_id = ? ORDER BY id ASC');
        $stmt->execute([$tenantId]);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['includes'] = !empty($r['includes_json']) ? json_decode((string)$r['includes_json'], true) : [];
        }

        Response::success($rows);
    }

    public function show(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM banquet_packages WHERE tenant_id = ? AND id = ? LIMIT 1');
        $stmt->execute([$tenantId, $id]);
        $pkg = $stmt->fetch();

        if (!$pkg) {
            Response::error('Paket banquet tidak ditemukan', 404);
        }

        $pkg['includes'] = !empty($pkg['includes_json']) ? json_decode((string)$pkg['includes_json'], true) : [];
        Response::success($pkg);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $name = trim((string)($body['name'] ?? ''));
        $code = trim((string)($body['code'] ?? ''));
        $category = (string)($body['category'] ?? 'meeting');
        $price = (float)($body['price_per_pax'] ?? 0.0);
        $minPax = (int)($body['min_pax'] ?? 10);
        $desc = trim((string)($body['description'] ?? ''));
        $includes = isset($body['includes']) ? json_encode($body['includes']) : null;

        if ($name === '' || $code === '') {
            Response::error('Nama dan kode paket meeting wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        try {
            $stmt = $db->prepare('INSERT INTO banquet_packages (tenant_id, name, code, category, price_per_pax, min_pax, includes_json, description, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)');
            $stmt->execute([$tenantId, $name, $code, $category, $price, $minPax, $includes, $desc ?: null]);

            Response::success(['id' => (int)$db->lastInsertId()], 'Paket banquet berhasil dibuat', 201);
        } catch (Exception $e) {
            Response::error('Gagal menambahkan paket: ' . $e->getMessage(), 400);
        }
    }

    public function update(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();

        $name = trim((string)($body['name'] ?? ''));
        $code = trim((string)($body['code'] ?? ''));
        $category = (string)($body['category'] ?? 'meeting');
        $price = (float)($body['price_per_pax'] ?? 0.0);
        $minPax = (int)($body['min_pax'] ?? 10);
        $desc = trim((string)($body['description'] ?? ''));
        $isActive = isset($body['is_active']) ? (int)$body['is_active'] : 1;
        $includes = isset($body['includes']) ? json_encode($body['includes']) : null;

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE banquet_packages SET name = ?, code = ?, category = ?, price_per_pax = ?, min_pax = ?, includes_json = ?, description = ?, is_active = ?
            WHERE tenant_id = ? AND id = ?');
        $stmt->execute([$name, $code, $category, $price, $minPax, $includes, $desc ?: null, $isActive, $tenantId, $id]);

        Response::success(['id' => $id], 'Paket banquet berhasil diperbarui');
    }

    public function destroy(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('DELETE FROM banquet_packages WHERE tenant_id = ? AND id = ?');
        $stmt->execute([$tenantId, $id]);

        Response::success(['id' => $id], 'Paket banquet berhasil dihapus');
    }
}
