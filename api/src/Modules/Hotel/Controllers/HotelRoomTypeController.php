<?php
declare(strict_types=1);

namespace App\Modules\Hotel\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class HotelRoomTypeController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT hrt.*, 
                                     (SELECT COUNT(*) FROM hotel_rooms hr WHERE hr.room_type_id = hrt.id AND hr.tenant_id = ?) as total_rooms
                              FROM hotel_room_types hrt 
                              WHERE hrt.tenant_id = ? 
                              ORDER BY hrt.base_price ASC');
        $stmt->execute([$tenantId, $tenantId]);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$row) {
            $row['amenities'] = !empty($row['amenities_json']) ? json_decode((string)$row['amenities_json'], true) : [];
        }

        Response::success($rows);
    }

    public function show(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM hotel_room_types WHERE id = ? AND tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Tipe kamar tidak ditemukan', 404);
        }

        $row['amenities'] = !empty($row['amenities_json']) ? json_decode((string)$row['amenities_json'], true) : [];
        Response::success($row);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $name = trim((string)($body['name'] ?? ''));
        $code = trim((string)($body['code'] ?? ''));
        $basePrice = (int)($body['base_price'] ?? 0);
        $maxAdults = max(1, (int)($body['max_adults'] ?? 2));
        $maxChildren = max(0, (int)($body['max_children'] ?? 1));
        $amenities = isset($body['amenities']) && is_array($body['amenities']) ? json_encode($body['amenities']) : null;
        $description = trim((string)($body['description'] ?? ''));

        if ($name === '' || $code === '' || $basePrice <= 0) {
            Response::error('Nama tipe kamar, kode, dan harga dasar wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();

        $chk = $db->prepare('SELECT id FROM hotel_room_types WHERE tenant_id = ? AND code = ? LIMIT 1');
        $chk->execute([$tenantId, $code]);
        if ($chk->fetch()) {
            Response::error('Kode tipe kamar sudah digunakan', 422);
        }

        $stmt = $db->prepare('INSERT INTO hotel_room_types (tenant_id, name, code, base_price, max_adults, max_children, amenities_json, description) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$tenantId, $name, $code, $basePrice, $maxAdults, $maxChildren, $amenities, $description ?: null]);

        $newId = (int)$db->lastInsertId();
        Response::success(['id' => $newId], 'Tipe kamar berhasil ditambahkan', 201);
    }

    public function update(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();

        $name = trim((string)($body['name'] ?? ''));
        $code = trim((string)($body['code'] ?? ''));
        $basePrice = (int)($body['base_price'] ?? 0);
        $maxAdults = max(1, (int)($body['max_adults'] ?? 2));
        $maxChildren = max(0, (int)($body['max_children'] ?? 1));
        $amenities = isset($body['amenities']) && is_array($body['amenities']) ? json_encode($body['amenities']) : null;
        $description = trim((string)($body['description'] ?? ''));
        $isActive = isset($body['is_active']) ? (int)$body['is_active'] : 1;

        if ($name === '' || $code === '' || $basePrice <= 0) {
            Response::error('Nama tipe kamar, kode, dan harga dasar wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('UPDATE hotel_room_types 
                              SET name = ?, code = ?, base_price = ?, max_adults = ?, max_children = ?, amenities_json = ?, description = ?, is_active = ? 
                              WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$name, $code, $basePrice, $maxAdults, $maxChildren, $amenities, $description ?: null, $isActive, $id, $tenantId]);

        Response::success(null, 'Tipe kamar berhasil diperbarui');
    }

    public function destroy(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $chk = $db->prepare('SELECT COUNT(*) FROM hotel_rooms WHERE room_type_id = ? AND tenant_id = ?');
        $chk->execute([$id, $tenantId]);
        if ((int)$chk->fetchColumn() > 0) {
            Response::error('Tipe kamar tidak dapat dihapus karena masih digunakan oleh unit kamar', 400);
        }

        $stmt = $db->prepare('DELETE FROM hotel_room_types WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$id, $tenantId]);

        Response::success(null, 'Tipe kamar berhasil dihapus');
    }
}
