<?php
declare(strict_types=1);

namespace App\Modules\Parking\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class SmartLockController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $lockType = Request::query('lock_type');
        $sql = 'SELECT * FROM smart_locks WHERE tenant_id = ?';
        $params = [$tenantId];

        if ($lockType) {
            $sql .= ' AND lock_type = ?';
            $params[] = $lockType;
        }

        $sql .= ' ORDER BY id ASC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        Response::success($stmt->fetchAll());
    }

    public function show(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM smart_locks WHERE tenant_id = ? AND id = ? LIMIT 1');
        $stmt->execute([$tenantId, $id]);
        $lock = $stmt->fetch();

        if (!$lock) {
            Response::error('Smart lock tidak ditemukan', 404);
        }
        Response::success($lock);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $code = trim((string)($body['device_code'] ?? ''));
        $name = trim((string)($body['device_name'] ?? ''));
        $type = (string)($body['lock_type'] ?? 'meeting_room');
        $targetId = isset($body['target_id']) ? (int)$body['target_id'] : null;
        $model = trim((string)($body['device_model'] ?? 'SmartLock-WiFi'));
        $mac = trim((string)($body['mac_address'] ?? ''));
        $ip = trim((string)($body['ip_address'] ?? ''));
        $passcode = trim((string)($body['current_passcode'] ?? '123456'));

        if ($code === '' || $name === '') {
            Response::error('Kode dan nama perangkat smart lock wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        try {
            $stmt = $db->prepare('INSERT INTO smart_locks (tenant_id, device_code, device_name, lock_type, target_id, device_model, mac_address, ip_address, is_locked, current_passcode, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1)');
            $stmt->execute([$tenantId, $code, $name, $type, $targetId, $model, $mac ?: null, $ip ?: null, $passcode]);

            Response::success(['id' => (int)$db->lastInsertId()], 'Smart lock berhasil didaftarkan', 201);
        } catch (Exception $e) {
            Response::error('Gagal menambahkan perangkat: ' . $e->getMessage(), 400);
        }
    }

    public function update(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();

        $name = trim((string)($body['device_name'] ?? ''));
        $type = (string)($body['lock_type'] ?? 'meeting_room');
        $targetId = isset($body['target_id']) ? (int)$body['target_id'] : null;
        $passcode = trim((string)($body['current_passcode'] ?? ''));
        $isActive = isset($body['is_active']) ? (int)$body['is_active'] : 1;

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE smart_locks SET device_name = ?, lock_type = ?, target_id = ?, current_passcode = ?, is_active = ?
            WHERE tenant_id = ? AND id = ?');
        $stmt->execute([$name, $type, $targetId, $passcode ?: null, $isActive, $tenantId, $id]);

        Response::success(['id' => $id], 'Smart lock diperbarui');
    }

    public function remoteUnlock(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();
        $durationSeconds = (int)($body['duration_seconds'] ?? 5);

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT * FROM smart_locks WHERE tenant_id = ? AND id = ? LIMIT 1');
        $stmt->execute([$tenantId, $id]);
        $lock = $stmt->fetch();

        if (!$lock) {
            Response::error('Smart lock tidak ditemukan', 404);
        }

        $db->prepare('INSERT INTO smart_lock_access_logs (tenant_id, smart_lock_id, auth_method, credential_identifier, access_status, notes)
            VALUES (?, ?, "remote_api", "Admin Remote Unlock", "granted", ?)')
           ->execute([$tenantId, $id, "Unlocked remotely for {$durationSeconds}s"]);

        $db->prepare('UPDATE smart_locks SET is_locked = 0, last_synced_at = NOW() WHERE id = ?')
           ->execute([$id]);

        Response::success([
            'lock_id' => $id,
            'device_code' => $lock['device_code'],
            'device_name' => $lock['device_name'],
            'state' => 'UNLOCKED',
            'auto_relock_seconds' => $durationSeconds,
            'timestamp' => date('Y-m-d H:i:s'),
        ], "Kunci '{$lock['device_name']}' berhasil dibuka secara remote");
    }

    public function generatePasscode(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();

        $passcode = trim((string)($body['passcode'] ?? ''));
        if ($passcode === '') {
            $passcode = str_pad((string)random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        }
        $validHours = (int)($body['valid_hours'] ?? 24);
        $expiresAt = date('Y-m-d H:i:s', strtotime("+{$validHours} hours"));

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE smart_locks SET current_passcode = ?, passcode_expires_at = ?, last_synced_at = NOW() WHERE tenant_id = ? AND id = ?');
        $stmt->execute([$passcode, $expiresAt, $tenantId, $id]);

        $db->prepare('INSERT INTO smart_lock_access_logs (tenant_id, smart_lock_id, auth_method, credential_identifier, access_status, notes)
            VALUES (?, ?, "pin", ?, "granted", ?)')
           ->execute([$tenantId, $id, "PIN: " . substr($passcode, 0, 2) . "****", "New Passcode issued, expires {$expiresAt}"]);

        Response::success([
            'lock_id' => $id,
            'passcode' => $passcode,
            'expires_at' => $expiresAt,
        ], 'Passcode akses berhasil dibuat');
    }

    public function accessLogs(): void {
        $tenantId = TenantContext::id();
        $lockId = Request::query('smart_lock_id');
        $db = Database::getInstance()->pdo();

        $sql = 'SELECT l.*, sl.device_name, sl.device_code, sl.lock_type 
                FROM smart_lock_access_logs l 
                JOIN smart_locks sl ON l.smart_lock_id = sl.id 
                WHERE l.tenant_id = ?';
        $params = [$tenantId];

        if ($lockId) {
            $sql .= ' AND l.smart_lock_id = ?';
            $params[] = (int)$lockId;
        }

        $sql .= ' ORDER BY l.id DESC LIMIT 50';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        Response::success($stmt->fetchAll());
    }
}
