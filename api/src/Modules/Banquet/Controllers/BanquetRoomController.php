<?php
declare(strict_types=1);

namespace App\Modules\Banquet\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class BanquetRoomController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM banquet_rooms WHERE tenant_id = ? ORDER BY id ASC');
        $stmt->execute([$tenantId]);
        $rows = $stmt->fetchAll();

        foreach ($rows as &$r) {
            $r['facilities'] = !empty($r['facilities_json']) ? json_decode((string)$r['facilities_json'], true) : [];
        }

        Response::success($rows);
    }

    public function show(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM banquet_rooms WHERE tenant_id = ? AND id = ? LIMIT 1');
        $stmt->execute([$tenantId, $id]);
        $room = $stmt->fetch();

        if (!$room) {
            Response::error('Ruang banquet tidak ditemukan', 404);
        }

        $room['facilities'] = !empty($room['facilities_json']) ? json_decode((string)$room['facilities_json'], true) : [];
        Response::success($room);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $name = trim((string)($body['name'] ?? ''));
        $code = trim((string)($body['code'] ?? ''));
        $floor = trim((string)($body['floor'] ?? ''));
        $areaSqm = (float)($body['area_sqm'] ?? 0.0);
        $theater = (int)($body['capacity_theater'] ?? 0);
        $classroom = (int)($body['capacity_classroom'] ?? 0);
        $uShape = (int)($body['capacity_u_shape'] ?? 0);
        $banquet = (int)($body['capacity_banquet'] ?? 0);
        $rateHour = (float)($body['rate_per_hour'] ?? 0.0);
        $rateHalf = (float)($body['rate_half_day'] ?? 0.0);
        $rateFull = (float)($body['rate_full_day'] ?? 0.0);
        $facilities = isset($body['facilities']) ? json_encode($body['facilities']) : null;

        if ($name === '' || $code === '') {
            Response::error('Nama dan kode ruangan banquet wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        try {
            $stmt = $db->prepare('INSERT INTO banquet_rooms 
                (tenant_id, name, code, floor, area_sqm, capacity_theater, capacity_classroom, capacity_u_shape, capacity_banquet, rate_per_hour, rate_half_day, rate_full_day, facilities_json, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
            $stmt->execute([$tenantId, $name, $code, $floor ?: null, $areaSqm, $theater, $classroom, $uShape, $banquet, $rateHour, $rateHalf, $rateFull, $facilities]);
            $newId = (int)$db->lastInsertId();

            Response::success(['id' => $newId, 'name' => $name, 'code' => $code], 'Ruang banquet berhasil ditambahkan', 201);
        } catch (Exception $e) {
            Response::error('Gagal menambahkan ruangan: ' . $e->getMessage(), 400);
        }
    }

    public function update(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();

        $name = trim((string)($body['name'] ?? ''));
        $code = trim((string)($body['code'] ?? ''));
        $floor = trim((string)($body['floor'] ?? ''));
        $areaSqm = (float)($body['area_sqm'] ?? 0.0);
        $theater = (int)($body['capacity_theater'] ?? 0);
        $classroom = (int)($body['capacity_classroom'] ?? 0);
        $uShape = (int)($body['capacity_u_shape'] ?? 0);
        $banquet = (int)($body['capacity_banquet'] ?? 0);
        $rateHour = (float)($body['rate_per_hour'] ?? 0.0);
        $rateHalf = (float)($body['rate_half_day'] ?? 0.0);
        $rateFull = (float)($body['rate_full_day'] ?? 0.0);
        $isActive = isset($body['is_active']) ? (int)$body['is_active'] : 1;
        $facilities = isset($body['facilities']) ? json_encode($body['facilities']) : null;

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE banquet_rooms SET 
            name = ?, code = ?, floor = ?, area_sqm = ?, capacity_theater = ?, capacity_classroom = ?, capacity_u_shape = ?, capacity_banquet = ?, 
            rate_per_hour = ?, rate_half_day = ?, rate_full_day = ?, facilities_json = ?, is_active = ?
            WHERE tenant_id = ? AND id = ?');
        $stmt->execute([$name, $code, $floor ?: null, $areaSqm, $theater, $classroom, $uShape, $banquet, $rateHour, $rateHalf, $rateFull, $facilities, $isActive, $tenantId, $id]);

        Response::success(['id' => $id], 'Data ruangan banquet berhasil diperbarui');
    }

    public function destroy(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $chk = $db->prepare('SELECT id FROM banquet_bookings WHERE tenant_id = ? AND banquet_room_id = ? AND status IN ("confirmed", "ongoing") LIMIT 1');
        $chk->execute([$tenantId, $id]);
        if ($chk->fetch()) {
            Response::error('Ruangan tidak dapat dihapus karena masih ada jadwal reservasi aktif', 400);
        }

        $stmt = $db->prepare('DELETE FROM banquet_rooms WHERE tenant_id = ? AND id = ?');
        $stmt->execute([$tenantId, $id]);

        Response::success(['id' => $id], 'Ruangan banquet berhasil dihapus');
    }
}
