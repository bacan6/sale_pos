<?php
declare(strict_types=1);

namespace App\Modules\Parking\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class ParkingGateController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM parking_gates WHERE tenant_id = ? ORDER BY id ASC');
        $stmt->execute([$tenantId]);
        Response::success($stmt->fetchAll());
    }

    public function show(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM parking_gates WHERE tenant_id = ? AND id = ? LIMIT 1');
        $stmt->execute([$tenantId, $id]);
        $gate = $stmt->fetch();

        if (!$gate) {
            Response::error('Gerbang parkir tidak ditemukan', 404);
        }
        Response::success($gate);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $code = trim((string)($body['gate_code'] ?? ''));
        $name = trim((string)($body['gate_name'] ?? ''));
        $type = (string)($body['gate_type'] ?? 'in');
        $vehicleAllowed = (string)($body['vehicle_type_allowed'] ?? 'all');
        $ip = trim((string)($body['ip_address'] ?? ''));
        $relayPin = isset($body['relay_pin']) ? (int)$body['relay_pin'] : null;

        if ($code === '' || $name === '') {
            Response::error('Kode dan nama gerbang parkir wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        try {
            $stmt = $db->prepare('INSERT INTO parking_gates (tenant_id, gate_code, gate_name, gate_type, vehicle_type_allowed, ip_address, relay_pin, status, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, "online", 1)');
            $stmt->execute([$tenantId, $code, $name, $type, $vehicleAllowed, $ip ?: null, $relayPin]);

            Response::success(['id' => (int)$db->lastInsertId()], 'Gerbang parkir berhasil didaftarkan', 201);
        } catch (Exception $e) {
            Response::error('Gagal menambahkan gerbang: ' . $e->getMessage(), 400);
        }
    }

    public function update(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();

        $name = trim((string)($body['gate_name'] ?? ''));
        $type = (string)($body['gate_type'] ?? 'in');
        $status = (string)($body['status'] ?? 'online');
        $ip = trim((string)($body['ip_address'] ?? ''));
        $relayPin = isset($body['relay_pin']) ? (int)$body['relay_pin'] : null;
        $isActive = isset($body['is_active']) ? (int)$body['is_active'] : 1;

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE parking_gates SET gate_name = ?, gate_type = ?, status = ?, ip_address = ?, relay_pin = ?, is_active = ?
            WHERE tenant_id = ? AND id = ?');
        $stmt->execute([$name, $type, $status, $ip ?: null, $relayPin, $isActive, $tenantId, $id]);

        Response::success(['id' => $id], 'Pengaturan gerbang diperbarui');
    }

    public function pulseGate(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();
        $action = (string)($body['action'] ?? 'open');

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT * FROM parking_gates WHERE tenant_id = ? AND id = ? LIMIT 1');
        $stmt->execute([$tenantId, $id]);
        $gate = $stmt->fetch();

        if (!$gate) {
            Response::error('Gerbang parkir tidak ditemukan', 404);
        }

        // Trigger barrier gate pulse simulation
        Response::success([
            'gate_id' => $id,
            'gate_code' => $gate['gate_code'],
            'action' => $action,
            'relay_state' => $action === 'open' ? 'PULSE_HIGH_3000MS' : 'HOLD_DOWN',
            'timestamp' => date('Y-m-d H:i:s'),
        ], "Sinyal gerbang '{$gate['gate_name']}' berhasil dikirim: {$action}");
    }
}
