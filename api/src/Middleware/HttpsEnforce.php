<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Response;

class HttpsEnforce {
    public static function handle(): void {
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
            || (($_SERVER['SERVER_PORT'] ?? '') === '443');

        $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '';
        $isLocal = in_array($remoteAddr, ['127.0.0.1', '::1'], true)
            || str_starts_with($remoteAddr, '192.168.')
            || str_starts_with($remoteAddr, '10.');

        if (!$isHttps && !$isLocal) {
            Response::error('Koneksi aman HTTPS diwajibkan', 403);
        }
    }
}
