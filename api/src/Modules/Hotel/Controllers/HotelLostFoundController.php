<?php
declare(strict_types=1);

namespace App\Modules\Hotel\Controllers;

use App\Core\AuthContext;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class HotelLostFoundController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $status = trim((string)($_GET['status'] ?? ''));

        $sql = 'SELECT hlf.*, hr.room_number, hr.floor, u.full_name as found_by_staff_name 
                FROM hotel_lost_and_found hlf 
                JOIN hotel_rooms hr ON hlf.room_id = hr.id 
                LEFT JOIN users u ON hlf.found_by_user_id = u.id 
                WHERE hlf.tenant_id = ?';
        $params = [$tenantId];

        if ($status !== '') {
            $sql .= ' AND hlf.status = ?';
            $params[] = $status;
        }

        $sql .= ' ORDER BY hlf.id DESC LIMIT 50';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll();

        Response::success($items);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $userId = AuthContext::id() ?: null;
        $body = Request::body();

        $roomId = (int)($body['room_id'] ?? 0);
        $itemName = trim((string)($body['item_name'] ?? ''));
        $description = trim((string)($body['description'] ?? ''));
        $storageLocation = trim((string)($body['storage_location'] ?? 'Front Desk Safe'));
        $foundDate = trim((string)($body['found_date'] ?? date('Y-m-d')));

        if ($roomId <= 0 || $itemName === '') {
            Response::error('Pilih kamar dan nama barang yang ditemukan', 422);
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('INSERT INTO hotel_lost_and_found (tenant_id, room_id, item_name, description, storage_location, status, found_date, found_by_user_id) 
                              VALUES (?, ?, ?, ?, ?, "stored", ?, ?)');
        $stmt->execute([$tenantId, $roomId, $itemName, $description ?: null, $storageLocation ?: 'Front Desk Safe', $foundDate, $userId]);

        $id = (int)$db->lastInsertId();
        Response::success(['id' => $id], 'Barang tertinggal (Lost & Found) berhasil dicatat', 201);
    }

    public function updateStatus(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();

        $status = (string)($body['status'] ?? 'claimed');
        $claimedByName = trim((string)($body['claimed_by_name'] ?? ''));

        $valid = ['stored', 'claimed', 'disposed'];
        if (!in_array($status, $valid, true)) {
            Response::error('Status tidak valid', 422);
        }

        $db = Database::getInstance()->pdo();
        $claimedAt = ($status === 'claimed') ? date('Y-m-d H:i:s') : null;

        $stmt = $db->prepare('UPDATE hotel_lost_and_found 
                              SET status = ?, claimed_by_name = ?, claimed_at = ? 
                              WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$status, $claimedByName ?: null, $claimedAt, $id, $tenantId]);

        Response::success(null, 'Status barang berhasil diperbarui');
    }
}
