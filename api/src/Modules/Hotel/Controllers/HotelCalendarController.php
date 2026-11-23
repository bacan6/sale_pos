<?php
declare(strict_types=1);

namespace App\Modules\Hotel\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class HotelCalendarController {
    public function timeline(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $startDate = trim((string)($_GET['start_date'] ?? date('Y-m-d')));
        $days = max(7, min(31, (int)($_GET['days'] ?? 14)));
        $endDate = date('Y-m-d', strtotime("{$startDate} +{$days} days"));

        // 1. Get all rooms
        $rStmt = $db->prepare('SELECT hr.id, hr.room_number, hr.floor, hr.status, hr.room_type_id, 
                                      hrt.name as room_type_name, hrt.code as room_type_code, hrt.base_price
                               FROM hotel_rooms hr 
                               JOIN hotel_room_types hrt ON hr.room_type_id = hrt.id 
                               WHERE hr.tenant_id = ? 
                               ORDER BY hr.floor ASC, hr.room_number ASC');
        $rStmt->execute([$tenantId]);
        $rooms = $rStmt->fetchAll();

        // 2. Get bookings overlapping with date range
        $bStmt = $db->prepare('SELECT hb.id, hb.booking_number, hb.guest_id, hb.room_id, hb.check_in_date, hb.check_out_date, 
                                      hb.status, hb.source, hb.night_count, hb.rate_per_night, hb.total_amount,
                                      hg.full_name as guest_name, hg.phone as guest_phone, hg.vip_tier,
                                      hf.id as folio_id, hf.balance as folio_balance
                               FROM hotel_bookings hb 
                               JOIN hotel_guests hg ON hb.guest_id = hg.id 
                               LEFT JOIN hotel_folios hf ON hb.id = hf.booking_id 
                               WHERE hb.tenant_id = ? 
                                 AND hb.status IN ("reserved", "checked_in", "checked_out") 
                                 AND hb.check_in_date < ? 
                                 AND hb.check_out_date > ? 
                               ORDER BY hb.check_in_date ASC');
        $bStmt->execute([$tenantId, $endDate, $startDate]);
        $bookings = $bStmt->fetchAll();

        // Group bookings by room_id
        $bookingsByRoom = [];
        foreach ($bookings as $b) {
            $roomId = (int)$b['room_id'];
            if (!isset($bookingsByRoom[$roomId])) {
                $bookingsByRoom[$roomId] = [];
            }
            $bookingsByRoom[$roomId][] = $b;
        }

        // Attach to rooms
        foreach ($rooms as &$room) {
            $rId = (int)$room['id'];
            $room['bookings'] = $bookingsByRoom[$rId] ?? [];
        }
        unset($room);

        Response::success([
            'start_date' => $startDate,
            'end_date' => $endDate,
            'days' => $days,
            'rooms' => $rooms,
        ]);
    }
}
