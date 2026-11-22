<?php
declare(strict_types=1);

namespace App\Modules\Hotel\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class HotelHousekeepingController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $roomsStmt = $db->prepare('SELECT hr.*, hrt.name as room_type_name 
                                   FROM hotel_rooms hr 
                                   JOIN hotel_room_types hrt ON hr.room_type_id = hrt.id 
                                   WHERE hr.tenant_id = ? 
                                   ORDER BY hr.floor ASC, hr.room_number ASC');
        $roomsStmt->execute([$tenantId]);
        $rooms = $roomsStmt->fetchAll();

        $tasksStmt = $db->prepare('SELECT hkt.*, hr.room_number, hr.floor, u.full_name as assigned_staff_name 
                                   FROM hotel_housekeeping_tasks hkt 
                                   JOIN hotel_rooms hr ON hkt.room_id = hr.id 
                                   LEFT JOIN users u ON hkt.assigned_user_id = u.id 
                                   WHERE hkt.tenant_id = ? 
                                   ORDER BY FIELD(hkt.status, "in_progress", "pending", "completed", "inspected"), hkt.id DESC LIMIT 50');
        $tasksStmt->execute([$tenantId]);
        $tasks = $tasksStmt->fetchAll();

        $staffStmt = $db->prepare('SELECT id, full_name, username, role FROM users WHERE tenant_id = ? AND role IN ("housekeeping", "maintenance", "admin", "hotel_manager")');
        $staffStmt->execute([$tenantId]);
        $staff = $staffStmt->fetchAll();

        Response::success([
            'rooms' => $rooms,
            'tasks' => $tasks,
            'staff' => $staff,
        ]);
    }

    public function createTask(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $roomId = (int)($body['room_id'] ?? 0);
        $assignedUserId = !empty($body['assigned_user_id']) ? (int)$body['assigned_user_id'] : null;
        $taskType = (string)($body['task_type'] ?? 'daily_cleaning');
        $priority = (string)($body['priority'] ?? 'medium');
        $notes = trim((string)($body['notes'] ?? ''));

        if ($roomId <= 0) {
            Response::error('Pilih kamar untuk penugasan housekeeping/maintenance', 422);
        }

        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('INSERT INTO hotel_housekeeping_tasks (tenant_id, room_id, assigned_user_id, task_type, priority, status, notes) 
                              VALUES (?, ?, ?, ?, ?, "pending", ?)');
        $stmt->execute([$tenantId, $roomId, $assignedUserId, $taskType, $priority, $notes ?: null]);

        $id = (int)$db->lastInsertId();
        Response::success(['id' => $id], 'Tugas housekeeping berhasil dibuat', 201);
    }

    public function updateTaskStatus(array $params): void {
        $taskId = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $body = Request::body();
        $status = (string)($body['status'] ?? 'completed');

        $valid = ['pending', 'in_progress', 'completed', 'inspected'];
        if (!in_array($status, $valid, true)) {
            Response::error('Status tugas tidak valid', 422);
        }

        $db = Database::getInstance()->pdo();
        $db->beginTransaction();

        try {
            $tStmt = $db->prepare('SELECT hkt.*, hr.active_booking_id FROM hotel_housekeeping_tasks hkt JOIN hotel_rooms hr ON hkt.room_id = hr.id WHERE hkt.id = ? AND hkt.tenant_id = ? FOR UPDATE');
            $tStmt->execute([$taskId, $tenantId]);
            $task = $tStmt->fetch();

            if (!$task) {
                throw new Exception('Tugas tidak ditemukan');
            }

            $completedAt = ($status === 'completed' || $status === 'inspected') ? date('Y-m-d H:i:s') : null;

            $upd = $db->prepare('UPDATE hotel_housekeeping_tasks SET status = ?, completed_at = ? WHERE id = ? AND tenant_id = ?');
            $upd->execute([$status, $completedAt, $taskId, $tenantId]);

            // Update Room cleaning status
            if ($status === 'completed' || $status === 'inspected') {
                $hasActiveBooking = !empty($task['active_booking_id']);
                $newRoomStatus = $hasActiveBooking ? 'occupied_clean' : ($status === 'inspected' ? 'inspected' : 'vacant_clean');

                $db->prepare('UPDATE hotel_rooms SET status = ? WHERE id = ? AND tenant_id = ?')
                   ->execute([$newRoomStatus, $task['room_id'], $tenantId]);
            }

            $db->commit();
            Response::success(null, 'Status tugas dan kamar berhasil diperbarui');
        } catch (Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 400);
        }
    }

    public function quickClean(array $params): void {
        $roomId = (int)($params['id'] ?? 0);
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT id, status, active_booking_id FROM hotel_rooms WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$roomId, $tenantId]);
        $room = $stmt->fetch();

        if (!$room) {
            Response::error('Kamar tidak ditemukan', 404);
        }

        $hasGuest = !empty($room['active_booking_id']);
        $newStatus = $hasGuest ? 'occupied_clean' : 'vacant_clean';

        $db->prepare('UPDATE hotel_rooms SET status = ? WHERE id = ? AND tenant_id = ?')->execute([$newStatus, $roomId, $tenantId]);

        Response::success(['status' => $newStatus], 'Status kebersihan kamar berhasil diperbarui menjadi Bersih (Clean)');
    }
}
