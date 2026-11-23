<?php
declare(strict_types=1);

namespace App\Modules\Hotel\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class HotelServiceCatalogController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM hotel_services WHERE tenant_id = ? ORDER BY category ASC, name ASC');
        $stmt->execute([$tenantId]);
        $services = $stmt->fetchAll();

        Response::success($services);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $category = (string)($body['category'] ?? 'other');
        $code = trim((string)($body['code'] ?? ''));
        $name = trim((string)($body['name'] ?? ''));
        $price = max(0, (int)($body['price'] ?? 0));
        $unit = trim((string)($body['unit'] ?? 'pcs'));
        $description = trim((string)($body['description'] ?? ''));

        if ($name === '') {
            Response::error('Nama layanan/add-on hotel wajib diisi', 422);
        }

        if ($code === '') {
            $code = 'SRV-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('INSERT INTO hotel_services (tenant_id, category, code, name, price, unit, description, is_active) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, 1)');
        $stmt->execute([$tenantId, $category, $code, $name, $price, $unit ?: 'pcs', $description ?: null]);

        $id = (int)$db->lastInsertId();
        Response::success(['id' => $id, 'code' => $code], 'Layanan hotel berhasil ditambahkan', 201);
    }

    public function update(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();

        $category = (string)($body['category'] ?? 'other');
        $name = trim((string)($body['name'] ?? ''));
        $price = max(0, (int)($body['price'] ?? 0));
        $unit = trim((string)($body['unit'] ?? 'pcs'));
        $description = trim((string)($body['description'] ?? ''));
        $isActive = isset($body['is_active']) ? (int)(bool)$body['is_active'] : 1;

        if ($name === '') {
            Response::error('Nama layanan tidak boleh kosong', 422);
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE hotel_services 
                              SET category = ?, name = ?, price = ?, unit = ?, description = ?, is_active = ? 
                              WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$category, $name, $price, $unit ?: 'pcs', $description ?: null, $isActive, $id, $tenantId]);

        Response::success(null, 'Layanan hotel berhasil diperbarui');
    }

    public function destroy(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('DELETE FROM hotel_services WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$id, $tenantId]);

        Response::success(null, 'Layanan hotel berhasil dihapus');
    }
}
