<?php
declare(strict_types=1);

namespace App\Modules\Parking\Controllers;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;
use Exception;
use PDO;

class ParkingRateController {
    public function index(): void {
        $tenantId = TenantContext::id();
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM parking_rates WHERE tenant_id = ? ORDER BY id ASC');
        $stmt->execute([$tenantId]);
        Response::success($stmt->fetchAll());
    }

    public function show(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('SELECT * FROM parking_rates WHERE tenant_id = ? AND id = ? LIMIT 1');
        $stmt->execute([$tenantId, $id]);
        $rate = $stmt->fetch();

        if (!$rate) {
            Response::error('Tarif parkir tidak ditemukan', 404);
        }
        Response::success($rate);
    }

    public function store(): void {
        $tenantId = TenantContext::id();
        $body = Request::body();

        $vehicleType = (string)($body['vehicle_type'] ?? 'car');
        $name = trim((string)($body['name'] ?? ''));
        $baseRate = (float)($body['base_rate'] ?? 3000.0);
        $hourlyRate = (float)($body['hourly_rate'] ?? 2000.0);
        $dailyMax = (float)($body['daily_max_rate'] ?? 50000.0);
        $graceMinutes = (int)($body['grace_period_minutes'] ?? 10);

        if ($name === '') {
            Response::error('Nama tarif parkir wajib diisi', 422);
        }

        $db = Database::getInstance()->pdo();
        try {
            $stmt = $db->prepare('INSERT INTO parking_rates (tenant_id, vehicle_type, name, base_rate, hourly_rate, daily_max_rate, grace_period_minutes, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)');
            $stmt->execute([$tenantId, $vehicleType, $name, $baseRate, $hourlyRate, $dailyMax, $graceMinutes]);

            Response::success(['id' => (int)$db->lastInsertId()], 'Tarif parkir berhasil ditambahkan', 201);
        } catch (Exception $e) {
            Response::error('Gagal menambahkan tarif: ' . $e->getMessage(), 400);
        }
    }

    public function update(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $body = Request::body();

        $name = trim((string)($body['name'] ?? ''));
        $baseRate = (float)($body['base_rate'] ?? 3000.0);
        $hourlyRate = (float)($body['hourly_rate'] ?? 2000.0);
        $dailyMax = (float)($body['daily_max_rate'] ?? 50000.0);
        $graceMinutes = (int)($body['grace_period_minutes'] ?? 10);
        $isActive = isset($body['is_active']) ? (int)$body['is_active'] : 1;

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('UPDATE parking_rates SET name = ?, base_rate = ?, hourly_rate = ?, daily_max_rate = ?, grace_period_minutes = ?, is_active = ?
            WHERE tenant_id = ? AND id = ?');
        $stmt->execute([$name, $baseRate, $hourlyRate, $dailyMax, $graceMinutes, $isActive, $tenantId, $id]);

        Response::success(['id' => $id], 'Tarif parkir diperbarui');
    }

    public function destroy(array $params): void {
        $tenantId = TenantContext::id();
        $id = (int)($params['id'] ?? 0);
        $db = Database::getInstance()->pdo();

        $stmt = $db->prepare('DELETE FROM parking_rates WHERE tenant_id = ? AND id = ?');
        $stmt->execute([$tenantId, $id]);

        Response::success(['id' => $id], 'Tarif parkir berhasil dihapus');
    }
}
