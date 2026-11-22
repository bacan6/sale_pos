<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\AuthContext;
use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\TenantContext;

class BearerAuth {
    public static function handle(): void {
        $authHeader = Request::header('Authorization') ?: Request::header('HTTP_AUTHORIZATION');

        if (!$authHeader || !preg_match('/Bearer\s+(.+)$/i', $authHeader, $matches)) {
            Response::error('Autentikasi Bearer token tidak ditemukan di header Authorization', 401);
        }

        $plainToken = trim($matches[1]);
        $tokenHash = hash('sha256', $plainToken);

        $db = Database::getInstance()->pdo();
        $stmt = $db->prepare('SELECT pat.id as token_id, pat.expires_at,
                                     u.id as user_id, u.username, u.full_name, u.role, u.is_active as user_active,
                                     t.id as tenant_id, t.name as tenant_name, t.slug as tenant_slug, t.status as tenant_status,
                                     s.plan, s.max_devices, s.expires_at as sub_expires_at, s.status as sub_status 
                              FROM personal_access_tokens pat 
                              JOIN users u ON pat.user_id = u.id 
                              JOIN tenants t ON pat.tenant_id = t.id 
                              LEFT JOIN subscriptions s ON t.id = s.tenant_id 
                              WHERE pat.token_hash = ? LIMIT 1');
        $stmt->execute([$tokenHash]);
        $row = $stmt->fetch();

        if (!$row) {
            Response::error('Bearer token tidak valid atau telah dicabut', 401);
        }

        if ((int)$row['user_active'] !== 1) {
            Response::error('Akun pengguna telah dinonaktifkan', 403);
        }

        if (!empty($row['expires_at']) && strtotime((string)$row['expires_at']) < time()) {
            Response::error('Bearer token telah kedaluwarsa. Silakan login kembali', 401);
        }

        $db->prepare('UPDATE personal_access_tokens SET last_used_at = NOW() WHERE id = ?')
           ->execute([$row['token_id']]);

        AuthContext::set([
            'id' => (int)$row['user_id'],
            'username' => (string)$row['username'],
            'full_name' => (string)$row['full_name'],
            'role' => (string)$row['role'],
            'tenant_id' => (int)$row['tenant_id'],
        ]);

        TenantContext::set([
            'id' => (int)$row['tenant_id'],
            'name' => (string)$row['tenant_name'],
            'slug' => (string)$row['tenant_slug'],
            'status' => (string)$row['tenant_status'],
            'plan' => (string)($row['plan'] ?? 'starter'),
            'max_devices' => (int)($row['max_devices'] ?? 3),
            'expires_at' => $row['sub_expires_at'],
            'sub_status' => (string)($row['sub_status'] ?? 'active'),
        ]);
    }
}
