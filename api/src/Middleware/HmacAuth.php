<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

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
        $stmt = $db->prepare('SELECT id, device_secret, is_active FROM devices WHERE device_id = ? LIMIT 1');
        $stmt->execute([$deviceId]);
        $device = $stmt->fetch();

        if (!$device || (int)$device['is_active'] !== 1) {
            Response::error('Autentikasi gagal: perangkat tidak terdaftar atau nonaktif', 401);
        }

        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $body = Request::rawBody();

        $payload = "{$method}\n{$uri}\n{$timestamp}\n{$body}";
        $expectedSignature = hash_hmac('sha256', $payload, (string)$device['device_secret']);

        if (!hash_equals($expectedSignature, $signature)) {
            Response::error('Autentikasi gagal: tanda tangan HMAC tidak valid', 401);
        }
    }
}
