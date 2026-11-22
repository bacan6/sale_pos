<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;

class HmacAuth {
    public static function handle(): void {
        $deviceId = Request::header('X-Device-Id');
        $timestamp = Request::header('X-Timestamp');
        $signature = Request::header('X-Signature');

        if (!$deviceId || !$timestamp || !$signature) {
            Response::error('Autentikasi gagal: header X-Device-Id, X-Timestamp, atau X-Signature tidak lengkap', 401);
        }

        $config = require __DIR__ . '/../../config/app.php';
        $tolerance = (int)($config['hmac']['tolerance_seconds'] ?? 300);

        if (abs(time() - (int)$timestamp) > $tolerance) {
            Response::error('Autentikasi gagal: stempel waktu kedaluwarsa atau tidak valid', 401);
        }

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT d.id, d.tenant_id, d.device_secret, d.is_active, 
                                     t.name as tenant_name, t.slug as tenant_slug, t.status as tenant_status,
                                     s.plan, s.max_devices, s.expires_at, s.status as sub_status 
                              FROM devices d 
                              JOIN tenants t ON d.tenant_id = t.id 
                              LEFT JOIN subscriptions s ON t.id = s.tenant_id 
                              WHERE d.device_id = ? LIMIT 1');
        $stmt->execute([$deviceId]);
        $row = $stmt->fetch();

        if (!$row || (int)$row['is_active'] !== 1) {
            Response::error('Autentikasi gagal: perangkat tidak terdaftar atau nonaktif', 401);
        }

        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $body = Request::rawBody();

        $payload = "{$method}\n{$uri}\n{$timestamp}\n{$body}";
        $expectedSignature = hash_hmac('sha256', $payload, (string)$row['device_secret']);

        if (!hash_equals($expectedSignature, $signature)) {
            Response::error('Autentikasi gagal: tanda tangan HMAC tidak valid', 401);
        }

        TenantContext::set([
            'id' => (int)$row['tenant_id'],
            'name' => (string)$row['tenant_name'],
            'slug' => (string)$row['tenant_slug'],
            'status' => (string)$row['tenant_status'],
            'plan' => (string)($row['plan'] ?? 'free'),
            'max_devices' => (int)($row['max_devices'] ?? 1),
            'expires_at' => $row['expires_at'],
            'sub_status' => (string)($row['sub_status'] ?? 'active'),
        ]);
    }
}
