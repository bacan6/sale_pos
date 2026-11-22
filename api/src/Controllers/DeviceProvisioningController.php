<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class DeviceProvisioningController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT id, device_id, name, role, is_active, last_synced_at, created_at 
                              FROM devices 
                              WHERE tenant_id = ? 
                              ORDER BY id ASC');
        $stmt->execute([$tenantId]);
        $devices = $stmt->fetchAll();

        $subStmt = $db->prepare('SELECT plan, max_devices FROM subscriptions WHERE tenant_id = ? LIMIT 1');
        $subStmt->execute([$tenantId]);
        $sub = $subStmt->fetch();

        Response::success([
            'tenant_id' => $tenantId,
            'plan' => $sub['plan'] ?? 'free',
            'max_devices' => (int)($sub['max_devices'] ?? 1),
            'used_devices' => count($devices),
            'devices' => $devices,
        ]);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();
        $name = trim((string)($body['name'] ?? ''));
        $role = (string)($body['role'] ?? 'cashier');

        if ($name === '') {
            Response::error('Nama perangkat (misal: Kasir 2 / Handheld Waiter) wajib diisi', 422);
        }

        $validRoles = ['cashier', 'waitstaff', 'kiosk', 'kitchen'];
        if (!in_array($role, $validRoles, true)) {
            Response::error('Role perangkat tidak valid', 422);
        }

        $db = Database::getInstance()->pdo();

        $subStmt = $db->prepare('SELECT max_devices FROM subscriptions WHERE tenant_id = ? LIMIT 1');
        $subStmt->execute([$tenantId]);
        $sub = $subStmt->fetch();
        $maxAllowed = (int)($sub['max_devices'] ?? 1);

        $cntStmt = $db->prepare('SELECT COUNT(*) as cnt FROM devices WHERE tenant_id = ?');
        $cntStmt->execute([$tenantId]);
        $currentCount = (int)$cntStmt->fetch()['cnt'];

        if ($currentCount >= $maxAllowed) {
            Response::error("Batas kuota perangkat untuk paket langganan Anda ({$maxAllowed} perangkat) telah tercapai. Harap upgrade paket Anda.", 422);
        }

        $tenantSlug = TenantContext::slug() ?: 'POS';
        $deviceId = 'DEV-' . strtoupper(substr($tenantSlug, 0, 6)) . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));
        $deviceSecret = 'sec_' . bin2hex(random_bytes(16));

        $stmt = $db->prepare('INSERT INTO devices (tenant_id, device_id, device_secret, name, role, is_active) 
                              VALUES (?, ?, ?, ?, ?, 1)');
        $stmt->execute([$tenantId, $deviceId, $deviceSecret, $name, $role]);
        $id = (int)$db->lastInsertId();

        Response::success([
            'id' => $id,
            'device_id' => $deviceId,
            'device_secret' => $deviceSecret,
            'name' => $name,
            'role' => $role,
        ], 'Perangkat POS berhasil didaftarkan. Harap simpan device_secret dengan aman.', 201);
    }

    public function destroy(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('DELETE FROM devices WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$id, $tenantId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Perangkat tidak ditemukan pada tenant ini', 404);
        }

        Response::success(['id' => $id], 'Perangkat POS berhasil dicabut');
    }
}
