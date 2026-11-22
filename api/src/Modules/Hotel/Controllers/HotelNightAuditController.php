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

class HotelNightAuditController {
    public function overview(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        // Room count stats
        $roomStats = $db->prepare('SELECT 
            COUNT(*) as total_rooms,
            SUM(CASE WHEN status IN ("occupied_clean", "occupied_dirty") THEN 1 ELSE 0 END) as occupied_rooms,
            SUM(CASE WHEN status = "vacant_clean" THEN 1 ELSE 0 END) as vacant_clean,
            SUM(CASE WHEN status = "vacant_dirty" THEN 1 ELSE 0 END) as vacant_dirty,
            SUM(CASE WHEN status IN ("maintenance", "out_of_service") THEN 1 ELSE 0 END) as out_of_order
        FROM hotel_rooms WHERE tenant_id = ?');
        $roomStats->execute([$tenantId]);
        $counts = $roomStats->fetch();

        $total = (int)($counts['total_rooms'] ?? 0);
        $occupied = (int)($counts['occupied_rooms'] ?? 0);
        $occupancyRate = $total > 0 ? round(($occupied / $total) * 100, 1) : 0.0;

        // Today's hotel revenue from folios
        $todayRoomRevenue = $db->prepare('SELECT COALESCE(SUM(amount), 0) FROM hotel_folio_items WHERE tenant_id = ? AND category = "room_charge" AND DATE(created_at) = CURDATE()');
        $todayRoomRevenue->execute([$tenantId]);
        $roomRev = (int)$todayRoomRevenue->fetchColumn();

        // Today's POS restaurant charged to room
        $todayPosRevenue = $db->prepare('SELECT COALESCE(SUM(amount), 0) FROM hotel_folio_items WHERE tenant_id = ? AND category = "pos_restaurant" AND DATE(created_at) = CURDATE()');
        $todayPosRevenue->execute([$tenantId]);
        $posRev = (int)$todayPosRevenue->fetchColumn();

        // Other extra charges (minibar, laundry, etc)
        $todayOtherRevenue = $db->prepare('SELECT COALESCE(SUM(amount), 0) FROM hotel_folio_items WHERE tenant_id = ? AND category NOT IN ("room_charge", "pos_restaurant", "payment") AND DATE(created_at) = CURDATE()');
        $todayOtherRevenue->execute([$tenantId]);
        $otherRev = (int)$todayOtherRevenue->fetchColumn();

        $totalRevenue = $roomRev + $posRev + $otherRev;
        $adr = $occupied > 0 ? (int)round($roomRev / $occupied) : 0;
        $revpar = $total > 0 ? (int)round($roomRev / $total) : 0;

        // Recent audits
        $histStmt = $db->prepare('SELECT hna.*, u.full_name as auditor_name 
                                  FROM hotel_night_audits hna 
                                  LEFT JOIN users u ON hna.audited_by_user_id = u.id 
                                  WHERE hna.tenant_id = ? 
                                  ORDER BY hna.audit_date DESC LIMIT 10');
        $histStmt->execute([$tenantId]);
        $history = $histStmt->fetchAll();

        Response::success([
            'metrics' => [
                'total_rooms' => $total,
                'occupied_rooms' => $occupied,
                'vacant_clean' => (int)($counts['vacant_clean'] ?? 0),
                'vacant_dirty' => (int)($counts['vacant_dirty'] ?? 0),
                'out_of_order' => (int)($counts['out_of_order'] ?? 0),
                'occupancy_rate' => $occupancyRate,
                'room_revenue' => $roomRev,
                'pos_revenue' => $posRev,
                'other_revenue' => $otherRev,
                'total_revenue' => $totalRevenue,
                'adr' => $adr,
                'revpar' => $revpar,
            ],
            'recent_audits' => $history,
        ]);
    }

    public function runAudit(): void {
        $tenantId = TenantContext::id();
        $userId = AuthContext::id() ?: null;
        $body = Request::body();
        $auditDate = trim((string)($body['audit_date'] ?? date('Y-m-d')));

        $db = Database::getInstance()->pdo();

        // Calculate stats for the audit date
        $roomStats = $db->prepare('SELECT 
            COUNT(*) as total_rooms,
            SUM(CASE WHEN status IN ("occupied_clean", "occupied_dirty") THEN 1 ELSE 0 END) as occupied_rooms
        FROM hotel_rooms WHERE tenant_id = ?');
        $roomStats->execute([$tenantId]);
        $counts = $roomStats->fetch();

        $total = (int)($counts['total_rooms'] ?? 0);
        $occupied = (int)($counts['occupied_rooms'] ?? 0);
        $occupancyRate = $total > 0 ? round(($occupied / $total) * 100, 2) : 0.00;

        $roomRevStmt = $db->prepare('SELECT COALESCE(SUM(amount), 0) FROM hotel_folio_items WHERE tenant_id = ? AND category = "room_charge" AND DATE(created_at) = ?');
        $roomRevStmt->execute([$tenantId, $auditDate]);
        $roomRev = (int)$roomRevStmt->fetchColumn();

        $posRevStmt = $db->prepare('SELECT COALESCE(SUM(amount), 0) FROM hotel_folio_items WHERE tenant_id = ? AND category = "pos_restaurant" AND DATE(created_at) = ?');
        $posRevStmt->execute([$tenantId, $auditDate]);
        $posRev = (int)$posRevStmt->fetchColumn();

        $otherRevStmt = $db->prepare('SELECT COALESCE(SUM(amount), 0) FROM hotel_folio_items WHERE tenant_id = ? AND category NOT IN ("room_charge", "pos_restaurant", "payment") AND DATE(created_at) = ?');
        $otherRevStmt->execute([$tenantId, $auditDate]);
        $otherRev = (int)$otherRevStmt->fetchColumn();

        $totalRevenue = $roomRev + $posRev + $otherRev;
        $adr = $occupied > 0 ? (int)round($roomRev / $occupied) : 0;
        $revpar = $total > 0 ? (int)round($roomRev / $total) : 0;

        // Upsert into hotel_night_audits
        $chk = $db->prepare('SELECT id FROM hotel_night_audits WHERE tenant_id = ? AND audit_date = ? LIMIT 1');
        $chk->execute([$tenantId, $auditDate]);
        $existing = $chk->fetch();

        if ($existing) {
            $upd = $db->prepare('UPDATE hotel_night_audits 
                                 SET total_rooms = ?, occupied_rooms = ?, occupancy_rate = ?, room_revenue = ?, pos_revenue = ?, other_revenue = ?, total_revenue = ?, adr = ?, revpar = ?, audited_by_user_id = ? 
                                 WHERE id = ?');
            $upd->execute([$total, $occupied, $occupancyRate, $roomRev, $posRev, $otherRev, $totalRevenue, $adr, $revpar, $userId, $existing['id']]);
            $auditId = (int)$existing['id'];
        } else {
            $ins = $db->prepare('INSERT INTO hotel_night_audits 
                (tenant_id, audit_date, total_rooms, occupied_rooms, occupancy_rate, room_revenue, pos_revenue, other_revenue, total_revenue, adr, revpar, audited_by_user_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $ins->execute([$tenantId, $auditDate, $total, $occupied, $occupancyRate, $roomRev, $posRev, $otherRev, $totalRevenue, $adr, $revpar, $userId]);
            $auditId = (int)$db->lastInsertId();
        }

        Response::success([
            'audit_id' => $auditId,
            'audit_date' => $auditDate,
            'occupancy_rate' => $occupancyRate,
            'adr' => $adr,
            'revpar' => $revpar,
            'total_revenue' => $totalRevenue,
        ], "Audit malam untuk tanggal {$auditDate} berhasil diproses!");
    }
}
