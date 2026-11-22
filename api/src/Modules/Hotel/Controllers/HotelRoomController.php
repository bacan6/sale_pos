<?php
declare(strict_types=1);

namespace App\Modules\Hotel\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class HotelRoomController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $query = 'SELECT hr.*, 
                         hrt.name as room_type_name, hrt.code as room_type_code, hrt.base_price,
                         hb.booking_number, hb.check_in_date, hb.check_out_date, hb.source as booking_source,
                         hg.full_name as guest_name, hg.phone as guest_phone
                  FROM hotel_rooms hr
                  JOIN hotel_room_types hrt ON hr.room_type_id = hrt.id
                  LEFT JOIN hotel_bookings hb ON hr.active_booking_id = hb.id
                  LEFT JOIN hotel_guests hg ON hb.guest_id = hg.id
                  WHERE hr.tenant_id = ?
                  ORDER BY hr.floor ASC, hr.room_number ASC';

        $stmt = $db->prepare($query);
        $stmt->execute([$tenantId]);
        $rows = $stmt->fetchAll();

        Response::success($rows);
    }

    public function show(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT hr.*, 
                                     hrt.name as room_type_name, hrt.code as room_type_code, hrt.base_price, hrt.amenities_json,
                                     hb.booking_number, hb.check_in_date, hb.check_out_date,
                                     hg.full_name as guest_name, hg.phone as guest_phone
                              FROM hotel_rooms hr
                              JOIN hotel_room_types hrt ON hr.room_type_id = hrt.id
                              LEFT JOIN hotel_bookings hb ON hr.active_booking_id = hb.id
                              LEFT JOIN hotel_guests hg ON hb.guest_id = hg.id
                              WHERE hr.id = ? AND hr.tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Kamar tidak ditemukan', 404);
        }

        $row['amenities'] = !empty($row['amenities_json']) ? json_decode((string)$row['amenities_json'], true) : [];
        Response::success($row);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $roomNumber = trim((string)($body['room_number'] ?? ''));
        $floor = max(1, (int)($body['floor'] ?? 1));
        $roomTypeId = (int)($body['room_type_id'] ?? 0);
        $status = (string)($body['status'] ?? 'vacant_clean');

        if ($roomNumber === '' || $roomTypeId <= 0) {
            Response::error('Nomor kamar dan tipe kamar wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();

        $chk = $db->prepare('SELECT id FROM hotel_rooms WHERE tenant_id = ? AND room_number = ? LIMIT 1');
        $chk->execute([$tenantId, $roomNumber]);
        if ($chk->fetch()) {
            Response::error('Nomor kamar sudah terdaftar', 422);
        }

        $stmt = $db->prepare('INSERT INTO hotel_rooms (tenant_id, room_type_id, room_number, floor, status) 
                              VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$tenantId, $roomTypeId, $roomNumber, $floor, $status]);

        $id = (int)$db->lastInsertId();
        Response::success(['id' => $id], 'Kamar berhasil ditambahkan', 201);
    }

    public function update(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();

        $roomNumber = trim((string)($body['room_number'] ?? ''));
        $floor = max(1, (int)($body['floor'] ?? 1));
        $roomTypeId = (int)($body['room_type_id'] ?? 0);

        if ($roomNumber === '' || $roomTypeId <= 0) {
            Response::error('Nomor kamar dan tipe kamar wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('UPDATE hotel_rooms 
                              SET room_number = ?, floor = ?, room_type_id = ? 
                              WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$roomNumber, $floor, $roomTypeId, $id, $tenantId]);

        Response::success(null, 'Data kamar berhasil diperbarui');
    }

    public function updateStatus(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();
        $status = (string)($body['status'] ?? '');

        $valid = ['vacant_clean', 'vacant_dirty', 'occupied_clean', 'occupied_dirty', 'inspected', 'maintenance', 'out_of_service'];
        if (!in_array($status, $valid, true)) {
            Response::error('Status kamar tidak valid', 422);
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE hotel_rooms SET status = ? WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$status, $id, $tenantId]);

        Response::success(null, "Status kamar berhasil diubah menjadi {$status}");
    }

    public function destroy(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $chk = $db->prepare('SELECT active_booking_id FROM hotel_rooms WHERE id = ? AND tenant_id = ? LIMIT 1');
        $chk->execute([$id, $tenantId]);
        $room = $chk->fetch();

        if (!$room) {
            Response::error('Kamar tidak ditemukan', 404);
        }

        if (!empty($room['active_booking_id'])) {
            Response::error('Kamar tidak dapat dihapus saat masih terisi tamu', 400);
        }

        $db->prepare('DELETE FROM hotel_rooms WHERE id = ? AND tenant_id = ?')->execute([$id, $tenantId]);
        Response::success(null, 'Kamar berhasil dihapus');
    }
}
