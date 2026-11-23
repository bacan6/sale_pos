<?php
declare(strict_types=1);

namespace App\Modules\Hotel\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class HotelGuestController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $search = trim((string)($_GET['search'] ?? ''));
        $vipFilter = trim((string)($_GET['vip_tier'] ?? ''));
        $blacklistFilter = isset($_GET['is_blacklisted']) && $_GET['is_blacklisted'] !== '' ? (int)$_GET['is_blacklisted'] : null;

        $sql = 'SELECT * FROM hotel_guests WHERE tenant_id = ?';
        $params = [$tenantId];

        if ($search !== '') {
            $sql .= ' AND (full_name LIKE ? OR phone LIKE ? OR id_card_number LIKE ?)';
            $term = "%{$search}%";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        if ($vipFilter !== '') {
            $sql .= ' AND vip_tier = ?';
            $params[] = $vipFilter;
        }

        if ($blacklistFilter !== null) {
            $sql .= ' AND is_blacklisted = ?';
            $params[] = $blacklistFilter;
        }

        $sql .= ' ORDER BY id DESC LIMIT 100';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $guests = $stmt->fetchAll();

        Response::success($guests);
    }

    public function show(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM hotel_guests WHERE id = ? AND tenant_id = ? LIMIT 1');
        $stmt->execute([$id, $tenantId]);
        $guest = $stmt->fetch();

        if (!$guest) {
            Response::error('Data tamu tidak ditemukan', 404);
        }

        $bStmt = $db->prepare('SELECT hb.*, hr.room_number, hrt.name as room_type_name, hf.id as folio_id, hf.balance as folio_balance 
                               FROM hotel_bookings hb 
                               JOIN hotel_rooms hr ON hb.room_id = hr.id 
                               JOIN hotel_room_types hrt ON hr.room_type_id = hrt.id 
                               LEFT JOIN hotel_folios hf ON hb.id = hf.booking_id 
                               WHERE hb.guest_id = ? AND hb.tenant_id = ? 
                               ORDER BY hb.id DESC');
        $bStmt->execute([$id, $tenantId]);
        $guest['booking_history'] = $bStmt->fetchAll();

        Response::success($guest);
    }

    public function update(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();

        $fullName = trim((string)($body['full_name'] ?? ''));
        $phone = trim((string)($body['phone'] ?? ''));
        $email = trim((string)($body['email'] ?? ''));
        $address = trim((string)($body['address'] ?? ''));
        $vipTier = (string)($body['vip_tier'] ?? 'regular');
        $isBlacklisted = isset($body['is_blacklisted']) ? (int)(bool)$body['is_blacklisted'] : 0;
        $blacklistReason = trim((string)($body['blacklist_reason'] ?? ''));
        $preferences = trim((string)($body['preferences'] ?? ''));

        if ($fullName === '') {
            Response::error('Nama tamu wajib diisi', 422);
        }

        $validTiers = ['regular', 'silver', 'gold', 'platinum'];
        if (!in_array($vipTier, $validTiers, true)) {
            $vipTier = 'regular';
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE hotel_guests 
                              SET full_name = ?, phone = ?, email = ?, address = ?, vip_tier = ?, is_blacklisted = ?, blacklist_reason = ?, preferences = ? 
                              WHERE id = ? AND tenant_id = ?');
        $stmt->execute([
            $fullName, $phone ?: null, $email ?: null, $address ?: null,
            $vipTier, $isBlacklisted, $blacklistReason ?: null, $preferences ?: null,
            $id, $tenantId
        ]);

        Response::success(null, 'Profil dan status tamu berhasil diperbarui');
    }
}
