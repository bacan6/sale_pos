<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use PDO;

class PlatformAdminController {
    public function indexTenants(): void {
        $db = Database::getInstance()->pdo();
        $stmt = $db->query('SELECT t.*, s.plan, s.max_devices, s.status as sub_status, s.expires_at,
                                   (SELECT COUNT(*) FROM devices WHERE tenant_id = t.id) as device_count,
                                   (SELECT COUNT(*) FROM orders WHERE tenant_id = t.id) as order_count 
                            FROM tenants t 
                            LEFT JOIN subscriptions s ON t.id = s.tenant_id 
                            ORDER BY t.id DESC');
        $tenants = $stmt->fetchAll();
        Response::success($tenants);
    }

    public function showTenant(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT t.*, s.plan, s.max_devices, s.status as sub_status, s.starts_at, s.expires_at 
                              FROM tenants t 
                              LEFT JOIN subscriptions s ON t.id = s.tenant_id 
                              WHERE t.id = ? LIMIT 1');
        $stmt->execute([$id]);
        $tenant = $stmt->fetch();

        if (!$tenant) {
            Response::error('Tenant tidak ditemukan', 404);
        }

        $devStmt = $db->prepare('SELECT id, device_id, name, role, is_active, last_synced_at FROM devices WHERE tenant_id = ?');
        $devStmt->execute([$id]);
        $tenant['devices'] = $devStmt->fetchAll();

        Response::success($tenant);
    }

    public function updateStatus(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();
        $status = (string)($body['status'] ?? '');

        $validStatuses = ['waiting_activation', 'active', 'on_hold', 'terminated'];
        if (!in_array($status, $validStatuses, true)) {
            Response::error('Status tenant tidak valid. Pilihan: waiting_activation, active, on_hold, terminated', 422);
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE tenants SET status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);

        if ($stmt->rowCount() === 0) {
            Response::error('Tenant tidak ditemukan atau status tidak berubah', 404);
        }

        Response::success(['id' => $id, 'status' => $status], 'Status tenant berhasil diperbarui');
    }

    public function updateSubscription(array $params): void {
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();
        $plan = (string)($body['plan'] ?? 'starter');
        $durationDays = (int)($body['duration_days'] ?? 30);
        $customMaxDevices = isset($body['max_devices']) ? (int)$body['max_devices'] : null;

        $config = require __DIR__ . '/../../config/app.php';
        $plans = $config['saas']['plans'] ?? [];

        if (!isset($plans[$plan])) {
            Response::error('Pilihan paket langganan tidak valid', 422);
        }

        $maxDevices = $customMaxDevices ?? (int)($plans[$plan]['max_devices'] ?? 3);

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('INSERT INTO subscriptions (tenant_id, plan, max_devices, status, starts_at, expires_at) 
                              VALUES (?, ?, ?, "active", NOW(), DATE_ADD(NOW(), INTERVAL ? DAY)) 
                              ON DUPLICATE KEY UPDATE 
                                plan = VALUES(plan),
                                max_devices = VALUES(max_devices),
                                status = "active",
                                expires_at = DATE_ADD(GREATEST(expires_at, NOW()), INTERVAL ? DAY)');
        $stmt->execute([$id, $plan, $maxDevices, $durationDays, $durationDays]);

        $db->prepare('UPDATE tenants SET status = "active" WHERE id = ? AND status != "active"')->execute([$id]);

        Response::success([
            'tenant_id' => $id,
            'plan' => $plan,
            'max_devices' => $maxDevices,
            'added_days' => $durationDays,
        ], 'Langganan tenant berhasil diperbarui');
    }
}
