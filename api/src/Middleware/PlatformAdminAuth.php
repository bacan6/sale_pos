<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;

class PlatformAdminAuth {
    public static function handle(): void {
        $secret = Request::header('X-Platform-Secret');
        $config = require __DIR__ . '/../../config/app.php';
        $expected = (string)($config['saas']['platform_secret'] ?? '');

        if (!$secret || !hash_equals($expected, $secret)) {
            Response::error('Akses Super Admin ditolak: X-Platform-Secret tidak valid', 403);
        }
    }
}
